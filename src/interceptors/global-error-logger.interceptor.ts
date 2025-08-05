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

import { Injectable, OnModuleInit } from '@nestjs/common';
import { getLogger } from 'log4js';

@Injectable()
export class GlobalErrorLoggerService implements OnModuleInit {
  private readonly log = getLogger('global-errors');

  onModuleInit(): void {
    this.registerGlobalHandlers();
  }

  public registerGlobalHandlers(): void {
    if (process.env.GRAYLOG_ON !== 'true') {
      return;
    }

    process.on('uncaughtException', (err: Error) => {
      this.log.error({
        type: 'uncaughtException',
        message: err.message,
        stack: err.stack,
        level: 'error',
      });
    });

    process.on('unhandledRejection', (reason: any) => {
      this.log.error({
        type: 'unhandledRejection',
        message: reason?.message || String(reason),
        stack: reason?.stack || null,
        level: 'error',
      });
    });
  }
}
