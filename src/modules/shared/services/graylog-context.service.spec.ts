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

import { Test } from '@nestjs/testing';
import { Request } from 'express';
import { GraylogContextService } from './graylog-context.service';

describe('GraylogContextService', () => {
    const projectId = 'd570cdfa-40a3-41d2-8eeb-91282a12967d';
    const requestId = 'b1502385-dde6-48e4-b6e1-95c76bcae111';
    const userId = '0ba2b3a5-3546-47cc-a4cf-2fffe6e58348';
    const spanId = '018ac356884d2605';
    const traceId = '018ac356884d2605';
    const request = {
        id: requestId,
        headers: { 'x-project-id': projectId, 'x-user-id': userId, 'x-b3-spanid': spanId, 'x-b3-traceid': traceId }
    } as unknown as Request

    let graylogContextService: GraylogContextService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [GraylogContextService],
        }).compile();

        graylogContextService = await moduleRef.get(GraylogContextService);
    });

    describe('add graylog context', () => {
        it('should return graylog context', () => {
            graylogContextService.addGraylogContext(request);

            expect(graylogContextService.getGraylogContext(requestId)).toEqual({
                GELF: true,
                _projectId: projectId,
                _userId: userId,
                _traceId: traceId,
                _spanId: spanId,
            });
        });
    });

    describe('delete graylog context', () => {
        it('should return empty string', () => {
            graylogContextService.addGraylogContext(request);
            graylogContextService.deleteGraylogContext(requestId);

            expect(graylogContextService.getGraylogContext(requestId)).toBe('');
        });
    });
});