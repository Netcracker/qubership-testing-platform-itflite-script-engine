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

import { Controller, Post, Req, Body, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { API_PATH } from '../../constants/api-path.constants';
import { EngineService } from './engine.service';
import { EngineExecuteScriptRequest, EngineExecuteScriptResponse } from './engine.model';
import { getLogger } from 'log4js';
import { GraylogContextService } from '../../modules/shared/services/graylog-context.service';

const log = getLogger('engine-controller');

@Controller()
export class EngineController {
    constructor(
        private engineService: EngineService,
        private graylogContextService: GraylogContextService,
    ) {}

    @Post(API_PATH + '/script/execute')
    @HttpCode(200)
    public async execute(@Req() request: Request, @Body() body: EngineExecuteScriptRequest): Promise<EngineExecuteScriptResponse> {
        const graylogContext = this.graylogContextService.getGraylogContext(request.id);
        try {
            return await this.engineService.executeScript(body, request.id);
        } catch (err) {
            log.error(graylogContext, `Failed to execute: ${err.message}`, err.stack);
            throw err;
        }
    }
}
