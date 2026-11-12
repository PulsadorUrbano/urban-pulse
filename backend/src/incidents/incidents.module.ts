import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import { CategoriesService } from './categories.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController, CategoriesController],
  providers: [CategoriesService, IncidentsService, AccesoIncidenciasGuard],
})
export class IncidentsModule {}
