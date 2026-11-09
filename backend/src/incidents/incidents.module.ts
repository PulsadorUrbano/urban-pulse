import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccesoAsignacionesGuard } from './guards/acceso-asignaciones.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController, CategoriesController],
  providers: [
    CategoriesService,
    IncidentsService,
    AccesoAsignacionesGuard,
  ],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
