import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';

@Module({
  controllers: [IncidentsController],
  providers: [CategoriesService, IncidentsService, UploadStorageService],
})
export class IncidentsModule {}
import { CategoriesService } from './categories.service.js';
