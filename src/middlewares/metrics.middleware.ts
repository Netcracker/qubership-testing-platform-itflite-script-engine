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

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Histogram } from 'prom-client';
import { MetricNames } from '../modules/metrics/metrics.model';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
    constructor(
        @InjectMetric(MetricNames.HTTP_REQUESTS_DURATION) private requestsDurationMetric: Histogram<string>,
        @InjectMetric(MetricNames.HTTP_REQUESTS_MAX_DURATION) private requestsMaxDurationMetric: Gauge<string>,
    ) {}

    use(req: Request, res: Response, next: NextFunction) {
        const labels = {
            method: req.method,
            path: req.originalUrl,
            projectId: <string>req.headers['x-project-id'] || 'unknown',
        };

        const endTimer = this.requestsDurationMetric.startTimer(labels);

        res.on('finish', () => {
            const requestDuration = endTimer({ ...labels, statusCode: res.statusCode });

            this.requestsMaxDurationMetric.get().then(metric => {
                const previousValue = metric.values[0];
                const value =
                    (previousValue && requestDuration > previousValue.value) || !previousValue
                        ? requestDuration
                        : previousValue.value;

                this.requestsMaxDurationMetric.set(labels, value);
            });
        });

        next();
    }
}
