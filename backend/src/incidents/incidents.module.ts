import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';
import { CloudinaryService } from './cloudinary.service.js';

@Module({
  controllers: [IncidentsController, CategoriesController],
  providers: [
    CategoriesService,
    IncidentsService,
    UploadStorageService,
    CloudinaryService,
  ],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
