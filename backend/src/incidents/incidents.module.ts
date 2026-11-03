import { AuthModule } from '../auth/auth.module.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import { UploadsController } from './controllers/uploads.controller.js';
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController, CategoriesController, UploadsController],
  providers: [
    CategoriesService,
    IncidentsService,
    UploadStorageService,
    AccesoIncidenciasGuard,
  ],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
