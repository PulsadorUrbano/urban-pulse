import {
  Body,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  ArgumentsHost,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateIncidentPipe } from './create-incident.pipe.js';
import { CreateIncidentDto } from './create-incident.dto.js';
import { IncidentPriority, IncidentStatus } from '../generated/prisma/enums.js';
import { CambiarPrioridadIncidenciaPipe } from './cambiar-prioridad-incidencia.pipe.js';
import { CambiarEstadoIncidenciaPipe } from './cambiar-estado-incidencia.pipe.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  Incident,
  ResumenIncidencia,
} from './incident.js';
import { ListarIncidenciasPipe } from './listar-incidencias.pipe.js';
import type { UploadedImageFile } from './incident.js';
import { IncidentsService } from './incidents.service.js';

const esquemaPrioridad = {
  type: 'string',
  enum: Object.values(IncidentPriority),
  description:
    'Prioridad de la incidencia: Baja (low), Media (medium) o Alta (high).',
};

const incidentSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'civicId',
    'categoryId',
    'category',
    'urbanAssetId',
    'location',
    'images',
    'status',
    'priority',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    civicId: { type: 'string', format: 'uuid' },
    categoryId: { type: 'string', format: 'uuid', nullable: true },
    category: { type: 'string', nullable: true },
    urbanAssetId: { type: 'string', format: 'uuid', nullable: true },
    location: {
      type: 'object',
      properties: {
        latitude: { type: 'number', nullable: true },
        longitude: { type: 'number', nullable: true },
        accuracy: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    images: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'url', 'mimeType', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string' },
          mimeType: {
            type: 'string',
            enum: ['image/jpeg', 'image/png', 'image/webp'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    status: { type: 'string', enum: Object.values(IncidentStatus) },
    priority: esquemaPrioridad,
    createdAt: { type: 'string', format: 'date-time' },
  },
};

@Catch(PayloadTooLargeException)
class UploadLimitFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<Response>().status(400).json({
      statusCode: 400,
      message: exception.message,
      error: 'Bad Request',
    });
  }
}

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar el listado de incidencias por ciudadano',
    description:
      'Prototipo sin autenticación: civicId es un filtro del cliente, no acredita identidad ni propiedad (DEUDA-27-01). No devuelve trazabilidad.',
  })
  @ApiQuery({ name: 'civicId', required: true, type: String, format: 'uuid' })
  @ApiOkResponse({
    description:
      'Resúmenes ordenados del más reciente al más antiguo; array vacío si no hay coincidencias.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'status', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          status: { type: 'string', enum: Object.values(IncidentStatus) },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'civicId es obligatorio y debe ser un único UUID; no se admiten otros parámetros.',
  })
  listar(
    @Query(new ListarIncidenciasPipe()) idCiudadano: string,
  ): ResumenIncidencia[] {
    return this.incidentsService.listarPorCiudadano(idCiudadano);
  }

  @Post()
  @UseFilters(UploadLimitFilter)
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      limits: { fileSize: 5 * 1024 * 1024, files: 8 },
      fileFilter: (_request, file, callback) => {
        callback(
          acceptedImageTypes.has(file.mimetype)
            ? null
            : new BadRequestException('images must be JPEG, PNG, or WebP'),
          acceptedImageTypes.has(file.mimetype),
        );
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'civicId'],
      properties: {
        title: { type: 'string', minLength: 4, maxLength: 35 },
        description: { type: 'string' },
        civicId: { type: 'string', format: 'uuid' },
        categoryId: { type: 'string', format: 'uuid' },
        category: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        accuracy: { type: 'number', minimum: 0 },
        urbanAssetId: { type: 'string', format: 'uuid' },
        images: {
          type: 'array',
          maxItems: 8,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Temporary in-memory incident; referenced UUIDs are format-checked only.',
    schema: incidentSchema,
    headers: {
      Location: {
        description: 'Path of the created incident.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'The request body is invalid.' })
  create(
    @Body(new CreateIncidentPipe()) input: CreateIncidentDto,
    @UploadedFiles() files: UploadedImageFile[] = [],
    @Res({ passthrough: true }) response: Response,
  ): Promise<Incident> {
    return this.createAndSetLocation(input, files, response);
  }

  private async createAndSetLocation(
    input: CreateIncidentDto,
    files: UploadedImageFile[],
    response: Response,
  ): Promise<Incident> {
    const incident = await this.incidentsService.create(input, files);
    response.setHeader('Location', `/incidents/${incident.id}`);
    return incident;
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Validar o rechazar una incidencia con motivo',
    description:
      'Prototipo sin autenticación ni autorización de operador (DEUDA-47-01). civicId declara al actor; no acredita identidad. Estado e historial solo se conservan en memoria.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'cause', 'civicId'],
      properties: {
        status: { type: 'string', enum: ['validated', 'rejected'] },
        cause: {
          type: 'string',
          minLength: 1,
          description: 'Motivo obligatorio; no vacío después de trim.',
        },
        civicId: {
          type: 'string',
          format: 'uuid',
          description:
            'Actor declarado, sin verificar identidad ni rol; no modifica al propietario.',
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Incidencia actualizada, sin historial ni datos del actor de auditoría.',
    schema: incidentSchema,
  })
  @ApiBadRequestResponse({
    description: 'UUID o cuerpo inválido, motivo vacío o campos desconocidos.',
  })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description:
      'La incidencia ya no está en estado reported; no se añade historial.',
  })
  cambiarEstado(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarEstadoIncidenciaPipe())
    entrada: CambiarEstadoIncidenciaInput,
  ): Incident {
    return this.incidentsService.cambiarEstado(idIncidencia, entrada);
  }

  @Patch(':id/priority')
  @ApiOperation({
    summary: 'Asignar prioridad manual con motivo',
    description:
      'Solo incidencias validadas. Prioridades: Baja, Media y Alta. Cada asignación conserva su motivo y actor declarado. Prototipo sin autenticación ni autorización (DEUDA-28-01); civicId no acredita identidad. Historial en memoria.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['priority', 'cause', 'civicId'],
      properties: {
        priority: esquemaPrioridad,
        cause: {
          type: 'string',
          minLength: 1,
          description: 'Motivo obligatorio; no vacío después de trim.',
        },
        civicId: {
          type: 'string',
          format: 'uuid',
          description:
            'Actor declarado sin verificar; no cambia al propietario.',
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Incidencia con prioridad actualizada, sin historial ni actor de auditoría.',
    schema: incidentSchema,
  })
  @ApiBadRequestResponse({
    description:
      'UUID, prioridad o cuerpo inválidos; motivo vacío o campos desconocidos.',
  })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description:
      'Solo se admite asignación de prioridad en incidencias validadas.',
  })
  cambiarPrioridad(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarPrioridadIncidenciaPipe())
    entrada: CambiarPrioridadIncidenciaInput,
  ): Incident {
    return this.incidentsService.cambiarPrioridad(idIncidencia, entrada);
  }

  @Get(':id')
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'The incident id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'The incident does not exist.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Incident {
    return this.incidentsService.findOne(id);
  }
}
