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

import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentController } from './deployment.controller';

describe('DeploymentController', () => {
    let deploymentController: DeploymentController;

    beforeEach(async () => {
        const deploymentModule: TestingModule = await Test.createTestingModule({
            controllers: [DeploymentController],
        }).compile();

        deploymentController = deploymentModule.get<DeploymentController>(DeploymentController);
    });

    describe('liveness', () => {
        it('should return undefined', () => {
            expect(deploymentController.liveness()).toBe(undefined);
        });
    });

    describe('readiness', () => {
        it('should return undefined', () => {
            expect(deploymentController.readiness()).toBe(undefined);
        });
    });
});
