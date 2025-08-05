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

import { Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { getLogger } from 'log4js';
import { GraylogContextService } from '../modules/shared/services/graylog-context.service';

const log = getLogger('exceptions');

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly graylogContextService: GraylogContextService) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : (exception as any)?.message || 'Internal server error';

        const stack = (exception as any)?.stack || null;

        const context = this.graylogContextService.getGraylogContext(request.id);

        log.error(context, {
            url: request.url,
            method: request.method,
            status,
            message,
            stack,
            timestamp: new Date().toISOString(),
            type: 'AllExceptionsFilter',
        });

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }
}
