import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';

@Module({
  controllers: [IncidentsController, CategoriesController],
  providers: [CategoriesService, IncidentsService, UploadStorageService],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
