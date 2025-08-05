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

import { Cookie } from 'postman-collection';

export interface EngineExecuteScriptRequest {
    projectId: string;
    postman: EngineExecuteScriptPostmanModel;
    script: string;
}

export interface EngineExecuteScriptResponse {
    postman: EngineExecuteScriptPostmanModel;
    testResults: EngineExecuteScriptPostmanTestModel[];
    consoleLogs: EngineExecuteScriptPostmanConsoleLogModel[];
    hasNextRequest: boolean;
    nextRequest: string;
}

export interface EngineExecuteScriptPostmanTestModel {
    name: string;
    async: boolean;
    skipped: boolean;
    passed: boolean;
    error: {
        name: string;
        message: string;
        showDiff: boolean;
        actual: number;
        operator: string;
        stack: string;
    };
    index: number;
}

export interface EngineExecuteScriptPostmanConsoleLogModel {
    level: EngineExecuteScriptPostmanConsoleLogLevel;
    message: string;
    timestamp: number;
}

export enum EngineExecuteScriptPostmanConsoleLogLevel {
    LOG = 'log',
    WARN = 'warn',
    DEBUG = 'debug',
    INFO = 'info',
    ERROR = 'error',
    CLEAR = 'clear',
}

export interface EngineExecuteScriptPostmanModel {
    globals: Record<string, any>;
    collectionVariables: Record<string, any>;
    environment: Record<string, any>;
    iterationData: Record<string, any>;
    variables: Record<string, any>;
    postmanRequest: EngineExecuteScriptPostmanRequestModel;
    postmanResponse: EngineExecuteScriptPostmanResponseModel;
    cookies: EngineExecuteScriptPostmanRequestCookieModel[];
}

export interface EngineExecuteScriptPostmanNativeResultModel {
    _variables: EngineExecuteScriptPostmanNativeScopeModel;
    environment: EngineExecuteScriptPostmanNativeScopeModel;
    collectionVariables: EngineExecuteScriptPostmanNativeScopeModel;
    globals: EngineExecuteScriptPostmanNativeScopeModel;
    request: EngineExecuteScriptPostmanRequestModel;
    cookies: Cookie[];
}

export interface EngineExecuteScriptPostmanNativeScopeModel {
    values: EngineExecuteScriptBaseEntityModel[];
}

export interface EngineExecuteScriptPostmanRequestCookieModel {
    key: string;
    value: string;
}

interface EngineExecuteScriptPostmanRequestModel {
    id: string;
    name: string;
    url: {
        protocol: string;
        host: string[];
        port: string;
        path: string[];
        query: EngineExecuteScriptBaseEntityModel[];
    };
    header: EngineExecuteScriptBaseEntityModel[];
    method: string;
    body: {
        mode: string;
        raw?: string;
        file?: string | { src: string };
        graphql?: EngineExecuteScriptPostmanRequestGraphQLBodyModel;
        formdata?: EngineExecuteScriptFormDataPart[];
    };
}

interface EngineExecuteScriptPostmanRequestGraphQLBodyModel {
    query: string;
    operationName: string;
    variables: string;
}

interface EngineExecuteScriptPostmanResponseModel {
    status: string;
    code: number;
    header: EngineExecuteScriptBaseEntityModel[];
    body: string;
    responseTime: number;
}

interface EngineExecuteScriptBaseEntityModel {
    key: string;
    value: any;
}

interface EngineExecuteScriptFormDataPart {
    key: string;
    type: string;
    value: string;
    src: string;
    fileName: string;
    contentType: string;
    description: string;
    disabled: boolean;
}
