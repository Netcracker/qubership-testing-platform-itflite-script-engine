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

import { configure } from 'log4js';
import { BaseLoggerConfig } from './log4js.base.config';

export function configureLogger(): void {
    const loggerConfig = JSON.parse(JSON.stringify(BaseLoggerConfig));

    if (process.env.GRAYLOG_ON === 'true') {
        console.info(`Graylog is enabled: host ${process.env.GRAYLOG_HOST} and port ${process.env.GRAYLOG_PORT}`);

        const graylogHostParts = process.env.GRAYLOG_HOST.split(':');

        loggerConfig.appenders.gelf.host = graylogHostParts[1] || graylogHostParts[0];
        loggerConfig.appenders.gelf.port = process.env.GRAYLOG_PORT;
    } else {
        console.info(`Graylog is disabled, removing GELF from appenders.`);
        delete loggerConfig.appenders['gelf'];
        loggerConfig.categories.default.appenders.splice(1);
        loggerConfig.categories.http.appenders.splice(1);
    }

    loggerConfig.categories.default.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'INFO';
    loggerConfig.categories.http.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'INFO';

    console.info(`Log config used: ${JSON.stringify(loggerConfig)}`);

    configure(loggerConfig);
}