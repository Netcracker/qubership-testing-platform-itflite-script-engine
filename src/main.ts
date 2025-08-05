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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as http from 'http';
import * as requestID from 'express-request-id';
import { MetricsAppModule } from './modules/metrics-app/metrics-app.module';
import { configureLogger } from './config/log4js.config';
import { HttpLoggerInterceptor } from './interceptors/logger.interceptor';
import { GraylogContextInterceptor } from './interceptors/graylog-context.interceptor';
import { GraylogContextService } from './modules/shared/services/graylog-context.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
    const maxRequestBodySizeMb =
        Number(process.env.ATP_ITF_LITE_HTTP_REQUEST_SIZE_MB) + Number(process.env.ATP_ITF_LITE_HTTP_RESPONSE_SIZE_MB);
    const maxRequestBodySize = maxRequestBodySizeMb + 'mb' || '100mb';

    const expressApp = express();
    const server = http.createServer(expressApp);
    server.setTimeout(Number(process.env.ATP_ITF_LITE_CONNECTION_TIMEOUT) || 60000);

    const adapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, adapter);

    configureLogger();
    
    app.use(requestID({ setHeader: false }));
    app.use(express.json({ limit: maxRequestBodySize }));
    app.use(express.urlencoded({ limit: maxRequestBodySize, extended: true }));

    const graylogContextService = app.get<GraylogContextService>(GraylogContextService);

    if (process.env.GRAYLOG_ON === 'true') {
        app.useGlobalInterceptors(new GraylogContextInterceptor(graylogContextService));
    }

    if (process.env.ATP_HTTP_LOGGING === 'true') {
        app.useGlobalInterceptors(new HttpLoggerInterceptor(graylogContextService));
    }

    app.useGlobalFilters(new AllExceptionsFilter(graylogContextService));

    await app.init();

    const port = process.env.PORT || 8080;
    server.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });

    if (process.env.MONITORING_ENABLED === 'true') {
        const metricsApp = await NestFactory.create(MetricsAppModule);
        await metricsApp.listen(process.env.MONITORING_PORT || 8090);
    }
}

bootstrap();
