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

import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getLogger } from 'log4js';
import * as url from 'url';
import { GraylogContextService } from '../modules/shared/services/graylog-context.service';
import { v4 as uuidv4 } from 'uuid';

const log = getLogger('http');

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
    private logHeaders = process.env.ATP_HTTP_LOGGING_HEADERS === 'true';
    private logUriIgnoreRegExp: RegExp;
    private logHeadersIgnoreRegExp: RegExp;

    constructor(private graylogContextService: GraylogContextService) {
        const logUriIgnore: string = process.env.ATP_HTTP_LOGGING_URI_IGNORE;
        const logHeadersIgnore = process.env.ATP_HTTP_LOGGING_HEADERS_IGNORE;

        if (logUriIgnore) {
            try {
                this.logUriIgnoreRegExp = new RegExp(logUriIgnore);
            } catch (e) {
                console.error('Invalid regular expression for ATP_HTTP_LOGGING_URI_IGNORE: ', logUriIgnore);
            }
        }

        if (logHeadersIgnore) {
            try {
                this.logHeadersIgnoreRegExp = new RegExp(logHeadersIgnore, 'i');
            } catch (e) {
                console.error('Invalid regular expression for ATP_HTTP_LOGGING_HEADERS_IGNORE: ', logHeadersIgnore);
            }
        }
    }

    public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const requestUrl = url.format({
            protocol: request.protocol,
            host: request.get('host'),
            pathname: request.originalUrl,
        });
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();

        if (this.logUriIgnoreRegExp && this.logUriIgnoreRegExp.test(requestUrl)) {
            return next.handle();
        }

        const graylogContext = this.graylogContextService.getGraylogContext(request.id);

        const executionId = uuidv4();

        if (typeof graylogContext === 'object' && graylogContext.GELF) {
            graylogContext._executionId = executionId;
        }

        log.info(
            graylogContext,
            `HTTP REQUEST DATA:\n` +
            `${request.socket.remoteAddress} - HTTP/${request.httpVersion}\n` +
            `METHOD: ${request.method}\n` +
            `URL: ${request.url}\n` +
            `REQUEST HEADERS: ${this.logHeaders ? '\n' + this.formatHeaders(request.headers) : ''}\n` +
            `REQUEST BODY: ${JSON.stringify(request.body)}\n`,
        );

        response.on('close', () => {
            if (!response.headersSent) {
                log.warn(graylogContext, `Client disconnected before response was sent`);
            } else {
                log.info(graylogContext, `Response stream has been successfully closed`);
            }
        });

        response.on('error', (err) => {
            log.error(graylogContext, `HTTP RESPONSE ERROR: ${err.message}, ${request.method} ${request.url}`);
        });

        return next.handle().pipe(
            tap(responseBody => {
                const processedResponseBody =
                    responseBody !== undefined
                        ? responseBody === null || typeof responseBody !== 'object'
                            ? responseBody
                            : responseBody instanceof StreamableFile
                                ? JSON.stringify(responseBody).slice(0, 1000) + '...'
                                : JSON.stringify(responseBody)
                        : '';

                response.on('finish', () => {
                    log.info(
                        graylogContext,
                        `HTTP RESPONSE DATA:\n` +
                        `HTTP STATUS: ${response.statusCode}\n` +
                        `RESPONSE TIME: ${Date.now() - startTime}\n` +
                        `RESPONSE HEADERS: ${this.logHeaders ? '\n' + this.formatHeaders(response.getHeaders()) : ''
                        }\n` +
                        `RESPONSE BODY: ${processedResponseBody}\n`,
                    );
                });
            }),
        );
    }

    private formatHeaders(headers: Record<string, string>): string {
        let loggingHeaders = Object.entries(headers || {});

        if (this.logHeadersIgnoreRegExp) {
            loggingHeaders = loggingHeaders.filter(([key]) => {
                try {
                    return !this.logHeadersIgnoreRegExp.test(key);
                } catch (e) {
                    console.error(`Unable to apply ATP_HTTP_LOGGING_HEADERS_IGNORE pattern for header: ${key}`);
                    return false;
                }
            });
        }

        return loggingHeaders.map(([key, value]) => `    ${key}: ${value}`).join('\n');
    }
}