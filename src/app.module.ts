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

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EngineModule } from './modules/engine/engine.module';
import { DeploymentModule } from './modules/deployment/deployment.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsMiddleware } from './middlewares/metrics.middleware';
import { SharedModule } from './modules/shared/shared.module';
import { GlobalErrorLoggerService } from './interceptors/global-error-logger.interceptor';

@Module({
    imports: [DeploymentModule, EngineModule, MetricsModule, SharedModule],
    providers: [GlobalErrorLoggerService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): any {
        if (process.env.MONITORING_ENABLED === 'true') {
            consumer.apply(MetricsMiddleware).forRoutes('*');
        }
    }
}
