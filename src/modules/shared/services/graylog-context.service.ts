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
import { GELF } from '@log4js-node/gelf';
import { Request } from 'express';
import * as jwt_decode from 'jwt-decode';

@Injectable()
export class GraylogContextService {
    private contextMap = new Map<string, GELF>();

    public addGraylogContext(request: Request): void {
        this.contextMap.set(request.id, {
            GELF: true,
            _projectId: request.headers['x-project-id'] || null,
            _userId:
                request.headers['x-user-id'] ||
                (request.headers['authorization']
                    ? jwt_decode(request.headers['authorization'])?.['sub'] || null
                    : null),
            _traceId: request.headers['x-b3-traceid'] || null,
            _spanId: request.headers['x-b3-spanid'] || null,
            _postmanRequestId: request.body?.postman?.postmanRequest?.id || null,
        });
    }

    public deleteGraylogContext(requestId: string): void {
        this.contextMap.delete(requestId);
    }

    public getGraylogContext(requestId: string): GELF | string {
        return this.contextMap.get(requestId) || '';
    }
}