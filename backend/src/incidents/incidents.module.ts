import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { CategoriesController } from './categories.controller.js';
import { IncidentsController } from './incidents.controller.js';
import { IncidentsService } from './incidents.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import { CategoriesService } from './categories.service.js';
import {
  AlmacenamientoFotosS3Service,
  S3_CLIENT,
} from './services/almacenamiento-fotos-s3.service.js';
import { FotosIncidenciaService } from './services/fotos-incidencia.service.js';
import { GeocodificacionInversaService } from './services/geocodificacion-inversa.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController, CategoriesController],
  providers: [
    CategoriesService,
    IncidentsService,
    GeocodificacionInversaService,
    AccesoIncidenciasGuard,
    FotosIncidenciaService,
    AlmacenamientoFotosS3Service,
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: config.get<string>('S3_REGION') || 'us-east-1',
        }),
    },
  ],
})
export class IncidentsModule {}
