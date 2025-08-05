/*
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@nestjs/common';
import * as Sandbox from 'postman-sandbox';
import { Header, QueryParam, Request, Response, VariableScope, Cookie } from 'postman-collection';
import {
    EngineExecuteScriptPostmanConsoleLogLevel,
    EngineExecuteScriptPostmanConsoleLogModel,
    EngineExecuteScriptPostmanModel,
    EngineExecuteScriptPostmanNativeResultModel,
    EngineExecuteScriptPostmanNativeScopeModel,
    EngineExecuteScriptPostmanTestModel,
    EngineExecuteScriptRequest,
    EngineExecuteScriptResponse,
    EngineExecuteScriptPostmanRequestCookieModel,
} from './engine.model';
import { EngineCreatePostmanSandboxContextException } from '../../exceptions/engine/create-postman-sandbox-context.exception';
import { EngineExecuteScriptException } from '../../exceptions/engine/execute-script.exception';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { MetricNames } from '../metrics/metrics.model';
import { getLogger } from 'log4js';
import { GraylogContextService } from '../../modules/shared/services/graylog-context.service';
import { Mutex } from 'async-mutex';
import * as crypto from 'crypto';

const log = getLogger('engine-service');

@Injectable()
export class EngineService {
    constructor(
        @InjectMetric(MetricNames.ITF_LITE_REQUESTS_SIZE) private itfLiteRequestsSizeMetric: Counter<string>,
        @InjectMetric(MetricNames.ITF_LITE_RESPONSES_SIZE) private itfLiteResponsesSizeMetric: Counter<string>,
        @InjectMetric(MetricNames.CONTEXT_SIZE) private contextSizeMetric: Counter<string>,
        private graylogContextService: GraylogContextService
    ) { }

    private readonly scriptLocks = new Map<string, Mutex>();

    private getScriptMutex(scriptHash: string): Mutex {
        if (!this.scriptLocks.has(scriptHash)) {
            this.scriptLocks.set(scriptHash, new Mutex());
        }
        return this.scriptLocks.get(scriptHash)!;
    }

    public async executeScript(body: EngineExecuteScriptRequest, requestId: string): Promise<EngineExecuteScriptResponse> {
        const postman = body.postman;
        const script = body.script;
        const scriptHash = crypto.createHash('sha256').update(script).digest('hex');
        const graylogContext = this.graylogContextService.getGraylogContext(requestId);

        if (typeof graylogContext === 'object' && graylogContext.GELF) {
            graylogContext._scriptHash = scriptHash;
        }

        log.info(graylogContext, `Starting script execution`);
        log.debug(graylogContext, `Script: ${script}`);
        log.debug(graylogContext, `Postman model: ${JSON.stringify(postman, null, 2)}`);

        const testResults: EngineExecuteScriptPostmanTestModel[] = [];
        const consoleLogs: EngineExecuteScriptPostmanConsoleLogModel[] = [];

        const mutex = this.getScriptMutex(scriptHash);
        return await mutex.runExclusive(() => {
            return new Promise((resolve, reject) => {
                log.debug(graylogContext, 'Creating Sandbox context...');
                try {
                    Sandbox.createContext((err, ctx) => {
                        if (err) {
                            log.error(graylogContext, `Failed to create Sandbox context: ${err.message}`, err.stack);
                            return reject(new EngineCreatePostmanSandboxContextException(err));
                        }
                        log.info(graylogContext, `Sandbox context created`);

                        ctx.on(
                            'execution.assertion',
                            function (id: { execution: string }, result: EngineExecuteScriptPostmanTestModel[]) {
                                log.debug(graylogContext, `Assertion executed: ${JSON.stringify(result)}`);
                                testResults.push(result[0]);
                            },
                        );

                        ctx.on(
                            'console',
                            function (
                                id: { execution: string },
                                level: EngineExecuteScriptPostmanConsoleLogLevel,
                                ...args: unknown[]
                            ) {
                                log.debug(graylogContext, `Console log: Level=${level}, Args=${JSON.stringify(args)}`);

                                args = args.map(arg => {
                                    if (arg instanceof Set) {
                                        return JSON.stringify(Array.from(arg));
                                    } else if (arg instanceof Map) {
                                        return JSON.stringify(Object.fromEntries(arg.entries()));
                                    } else if (arg instanceof Date) {
                                        return arg;
                                    } else if (arg instanceof Object) {
                                        return JSON.stringify(arg);
                                    } else {
                                        return arg;
                                    }
                                });

                                consoleLogs.push({ message: args.join(' '), level, timestamp: Date.now() });
                            },
                        );

                        log.info(graylogContext, `Initializing variable scopes...`);
                        const globals = new VariableScope({}, null);
                        const collectionVariables = new VariableScope({}, null);
                        const environment = new VariableScope({}, null);
                        const variables = new VariableScope({}, [
                            environment['values'],
                            collectionVariables['values'],
                            globals['values'],
                        ]);

                        this.fillScope(globals, postman.globals, graylogContext);
                        this.fillScope(collectionVariables, postman.collectionVariables, graylogContext);
                        this.fillScope(environment, postman.environment, graylogContext);
                        this.fillScope(variables, postman.variables, graylogContext);

                        log.debug(graylogContext, `Globals: ${JSON.stringify(globals.values.members)}`);
                        log.debug(graylogContext, `Collection Variables: ${JSON.stringify(collectionVariables.values.members)}`);
                        log.debug(graylogContext, `Environment: ${JSON.stringify(environment.values.members)}`);
                        log.debug(graylogContext, `Variables: ${JSON.stringify(variables.values.members)}`);

                        const scopeSize =
                            globals.values.members.length +
                            collectionVariables.values.members.length +
                            environment.values.members.length +
                            variables.values.members.length;

                        this.contextSizeMetric.inc({ projectId: body.projectId || 'unknown' }, scopeSize);
                        log.info(graylogContext, `Variable scopes initialized: total ${scopeSize} variables`);

                        log.info(graylogContext, `Creating Postman request...`);
                        const request = new Request({
                            id: postman.postmanRequest.id,
                            name: postman.postmanRequest.name,
                            url: {
                                protocol: postman.postmanRequest.url.protocol,
                                port: postman.postmanRequest.url.port || null,
                                path: postman.postmanRequest.url.path,
                                host: postman.postmanRequest.url.host,
                                query: postman.postmanRequest.url.query.map(
                                    query => new QueryParam({ key: query.key, value: query.value }),
                                ),
                            },
                            method: postman.postmanRequest.method,
                            header: postman.postmanRequest.header.map(header => new Header(header.value, header.key)),
                            body: {
                                mode: postman.postmanRequest.body?.mode || 'none',
                                raw: postman.postmanRequest.body?.raw || '',
                                file: postman.postmanRequest.body?.file || '',
                                graphql: postman.postmanRequest.body?.graphql || undefined,
                                formdata: postman.postmanRequest.body?.formdata || undefined,
                            },
                        });
                        log.info(graylogContext, `Postman request created: ${postman.postmanRequest.name}`);

                        log.info(graylogContext, 'Creating Postman response...');
                        const response = new Response(
                            postman.postmanResponse
                                ? {
                                    originalRequest: request,
                                    status: postman.postmanResponse.status,
                                    code: postman.postmanResponse.code,
                                    header: postman.postmanResponse.header.map(
                                        header => new Header(header.value, header.key),
                                    ),
                                    body: postman.postmanResponse.body,
                                    responseTime: postman.postmanResponse.responseTime,
                                }
                                : {
                                    originalRequest: request,
                                    status: '',
                                    code: 0,
                                    body: '',
                                    responseTime: 0,
                                },
                        );
                        log.info(graylogContext, `Postman response created`);

                        const cookieArray: Cookie[] = [];
                        if (postman.cookies) {
                            postman.cookies.forEach(cookie => {
                                const parsedCookie = Cookie.parse(cookie.value);
                                if (cookie.key) {
                                    parsedCookie.key = cookie.key;
                                }
                                cookieArray.push(parsedCookie);
                            });
                        }
                        log.info(graylogContext, `Parsed ${cookieArray.length} cookies`);

                        log.info(graylogContext, `Executing script in sandbox...`);

                        const scriptName = postman.postmanRequest.name || 'UnnamedScript';
                        const startTime = Date.now();

                        ctx.execute(
                            { listen: postman.postmanResponse ? 'test' : 'prerequest', script },
                            {
                                context: {
                                    _variables: variables,
                                    environment,
                                    collectionVariables,
                                    globals,
                                    request,
                                    response,
                                    cookies: cookieArray,
                                },
                            },
                            (err, result) => {
                                const durationMs = Date.now() - startTime;
                                log.debug(graylogContext, `Script '${scriptName}' executed in ${durationMs}ms`);
                                log.debug(graylogContext, `Script size: ${Buffer.byteLength(script, 'utf-8')} bytes`);

                                if (err) {
                                    log.error(graylogContext, `Script '${scriptName}' failed after ${durationMs}ms: ${err.message}`, err.stack);
                                    return reject(new EngineExecuteScriptException(err));
                                }

                                if (!result || !result.return) {
                                    log.error(graylogContext, 'Sandbox execution returned empty or invalid result');
                                    return reject(new EngineExecuteScriptException(new Error('Empty execution result')));
                                }
                                const hasNextRequest = result.return.hasOwnProperty('nextRequest');
                                const nextRequest = result.return?.nextRequest || null;

                                const postmanModel = this.convertScriptExecutionResultsToPostmanModel(postman, result, graylogContext);

                                this.itfLiteRequestsSizeMetric.inc(
                                    { projectId: body.projectId || 'unknown' },
                                    Buffer.byteLength(JSON.stringify(postmanModel.postmanRequest)),
                                );
                                this.itfLiteResponsesSizeMetric.inc(
                                    { projectId: body.projectId || 'unknown' },
                                    Buffer.byteLength(JSON.stringify(postmanModel.postmanResponse)),
                                );

                                log.info(graylogContext, `Script executed`);
                                log.info(graylogContext, `Script returned ${testResults.length} test results`);
                                log.debug(graylogContext, `Postman model after execution: ${JSON.stringify(postmanModel)}`);

                                log.debug(graylogContext, `Request size: ${Buffer.byteLength(JSON.stringify(postmanModel.postmanRequest))} bytes`);
                                log.debug(graylogContext, `Response size: ${Buffer.byteLength(JSON.stringify(postmanModel.postmanResponse))} bytes`);
                                resolve({
                                    postman: postmanModel,
                                    testResults,
                                    consoleLogs,
                                    hasNextRequest,
                                    nextRequest,
                                });
                            },
                        );
                    });
                } catch (e) {
                    log.error(graylogContext, 'Unexpected sandbox init error', e);
                    reject(new EngineCreatePostmanSandboxContextException(e));
                }
            });
        });
    }

    private fillScope(scope: VariableScope, variables: Record<string, any>, graylogContext: any): void {
        const variableCount = Object.keys(variables).length;
        log.debug(graylogContext, `Filling scope with ${variableCount} variables`);
        Object.entries(variables).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
                value = value.replace(/\\"/g, '"');
            }
            log.debug(graylogContext, `Setting variable: ${key} = ${value}`);
            scope.set(key, value);
        });
    }

    private convertScriptExecutionResultsToPostmanModel(
        postmanModel: EngineExecuteScriptPostmanModel,
        executionResults: EngineExecuteScriptPostmanNativeResultModel,
        graylogContext: any,
    ): EngineExecuteScriptPostmanModel {
        log.info(graylogContext, `Converting script execution results to Postman model`);
    
        return {
            globals: this.convertPostmanNativeScopeToPostmanScope(executionResults.globals, graylogContext),
            collectionVariables: this.convertPostmanNativeScopeToPostmanScope(executionResults.collectionVariables, graylogContext),
            environment: this.convertPostmanNativeScopeToPostmanScope(executionResults.environment, graylogContext),
            iterationData: postmanModel.iterationData,
            variables: this.convertPostmanNativeScopeToPostmanScope(executionResults._variables, graylogContext),
            postmanRequest: {
                ...executionResults.request,
                url: {
                    protocol: executionResults.request.url.protocol,
                    host: executionResults.request.url.host,
                    port: executionResults.request.url.port,
                    path: executionResults.request.url.path,
                    query: executionResults.request.url.query,
                },
                body: {
                    mode: executionResults.request.body.mode,
                    raw: executionResults.request.body.raw,
                    file: (executionResults.request.body.file as { src: string })?.src,
                    graphql: executionResults.request.body.graphql,
                    formdata: executionResults.request.body.formdata,
                },
            },
            postmanResponse: postmanModel.postmanResponse,
            cookies: this.convertResultCookiesToStringArray(executionResults.cookies, graylogContext),
        };
    }

    private convertPostmanNativeScopeToPostmanScope(
        scope: EngineExecuteScriptPostmanNativeScopeModel,
        graylogContext: any,
    ): Record<string, any> {
        log.debug(graylogContext, `Converting Postman native scope to object`);
        return scope.values.reduce((acc, variable) => {
            log.debug(graylogContext, `Adding variable to scope: ${variable.key} = ${variable.value}`);
            acc[variable.key] = variable.value;
            return acc;
        }, {} as Record<string, any>);
    }

    private convertResultCookiesToStringArray(
        cookies: Cookie[],
        graylogContext: any
    ): EngineExecuteScriptPostmanRequestCookieModel[] {
        log.info(graylogContext, `Converting ${cookies.length} cookies to Postman model`);
        return cookies.map(cookie => {
            if (cookie.expires) {
                const expires = new Date(cookie.expires);
                cookie.expires = expires.toUTCString();
            }
            log.debug(graylogContext, `Cookie: ${cookie.name} = ${cookie.value}`);
            return {
                key: cookie.name,
                value: Cookie.stringify(cookie),
            };
        });
    }
}
