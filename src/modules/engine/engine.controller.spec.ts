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
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';

describe('EngineController', () => {
    let engineController: EngineController;

    beforeEach(async () => {
        const engineModule: TestingModule = await Test.createTestingModule({
            controllers: [EngineController],
            providers: [EngineService],
        }).compile();

        engineController = engineModule.get<EngineController>(EngineController);
    });

    describe('execute', () => {
        it.skip('should return execution result', () => {
            // expect(engineController.execute()).toBe('execution result!');
        });
    });
});
