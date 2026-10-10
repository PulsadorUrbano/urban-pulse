import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { HealthController } from './health.controller.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
