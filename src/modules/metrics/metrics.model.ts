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

import { makeGaugeProvider, makeHistogramProvider, makeCounterProvider } from '@willsoto/nestjs-prometheus';

export enum MetricNames {
    HTTP_REQUESTS_DURATION = 'nodejs_http_requests_duration_seconds',
    HTTP_REQUESTS_MAX_DURATION = 'nodejs_http_requests_duration_seconds_max',
    ITF_LITE_REQUESTS_SIZE = 'atp_itf_lite_script_engine_requests_size_bytes',
    ITF_LITE_RESPONSES_SIZE = 'atp_itf_lite_script_engine_responses_size_bytes',
    CONTEXT_SIZE = 'atp_itf_lite_script_engine_context_size_total',
}

export const HttpRequestsDurationProvider = makeHistogramProvider({
    name: MetricNames.HTTP_REQUESTS_DURATION,
    help: 'HTTP requests duration per endpoint/project',
    labelNames: ['method', 'path', 'statusCode', 'projectId'],
    buckets: [],
});

export const HttpRequestsMaxDurationProvider = makeGaugeProvider({
    name: MetricNames.HTTP_REQUESTS_MAX_DURATION,
    help: 'HTTP requests max duration per endpoint/project',
    labelNames: ['method', 'path', 'projectId'],
});

export const ItfLiteRequestsSizeProvider = makeCounterProvider({
    name: MetricNames.ITF_LITE_REQUESTS_SIZE,
    help: 'ITF-Lite requests sizes per endpoint/project',
    labelNames: ['projectId'],
});

export const ItfLiteResponsesSizeProvider = makeCounterProvider({
    name: MetricNames.ITF_LITE_RESPONSES_SIZE,
    help: 'ITF-Lite responses sizes per endpoint/project',
    labelNames: ['projectId'],
});

export const ContextSizeProvider = makeCounterProvider({
    name: MetricNames.CONTEXT_SIZE,
    help: 'Context sizes per project',
    labelNames: ['projectId'],
});
