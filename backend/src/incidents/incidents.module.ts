import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccesoAsignacionesGuard } from './guards/acceso-asignaciones.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController, CategoriesController],
  providers: [
    CategoriesService,
    IncidentsService,
    UploadStorageService,
    CloudinaryService,
    AccesoAsignacionesGuard,
  ],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
