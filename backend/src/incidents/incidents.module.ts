import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';

@Module({
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
