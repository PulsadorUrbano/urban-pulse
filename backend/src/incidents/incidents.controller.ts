import {
  Body,
  ForbiddenException,
  SetMetadata,
  UseGuards,
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
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import { UsuarioIncidenciasActual } from './decorators/usuario-incidencias-actual.decorator.js';
import type { UsuarioIncidencias } from './types/usuario-incidencias.js';
import type { Response } from 'express';
import { CreateIncidentPipe } from './create-incident.pipe.js';
import { IncidentPriority, IncidentStatus } from '../generated/prisma/enums.js';
import { CambiarPrioridadIncidenciaPipe } from './cambiar-prioridad-incidencia.pipe.js';
import { CambiarEstadoIncidenciaPipe } from './cambiar-estado-incidencia.pipe.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  Incident,
  CreateIncidentInput,
  CrearIncidenciaBody,
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
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT inválido o usuario inexistente.' })
@ApiForbiddenResponse({
  description:
    'El rol actual o la vinculación ciudadana no permite la operación.',
})
@UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @SetMetadata('rolesIncidencias', ['civic'])
  @ApiOperation({
    summary: 'Consultar el listado de incidencias por ciudadano',
    description:
      'Consulta solo las incidencias del ciudadano autenticado y vinculado en DB. Sin parámetros ni trazabilidad.',
  })
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
    description: 'No se admiten parámetros de consulta, incluido civicId.',
  })
  listar(
    @Query(new ListarIncidenciasPipe()) _consulta: void,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): ResumenIncidencia[] {
    if (!usuario.ciudadanoId)
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    return this.incidentsService.listarPorCiudadano(usuario.ciudadanoId);
  }

  @Post()
  @SetMetadata('rolesIncidencias', ['civic'])
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
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 4, maxLength: 35 },
        description: { type: 'string' },
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
    @Body(new CreateIncidentPipe()) input: CrearIncidenciaBody,
    @UploadedFiles() files: UploadedImageFile[] = [],
    @Res({ passthrough: true }) response: Response,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    if (!usuario.ciudadanoId)
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    return this.createAndSetLocation(
      { ...input, civicId: usuario.ciudadanoId },
      files,
      response,
    );
  }

  private async createAndSetLocation(
    input: CreateIncidentInput,
    files: UploadedImageFile[],
    response: Response,
  ): Promise<Incident> {
    const incident = await this.incidentsService.create(input, files);
    response.setHeader('Location', `/incidents/${incident.id}`);
    return incident;
  }

  @Patch(':id/status')
  @SetMetadata('rolesIncidencias', ['admin', 'administrative'])
  @ApiOperation({
    summary: 'Validar o rechazar una incidencia con motivo',
    description:
      'Solo admin/administrative actuales en DB; el actor proviene de la identidad verificada. Estado e historial permanecen en memoria.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'cause'],
      properties: {
        status: { type: 'string', enum: ['validated', 'rejected'] },
        cause: {
          type: 'string',
          minLength: 1,
          description: 'Motivo obligatorio; no vacío después de trim.',
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
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Incident {
    return this.incidentsService.cambiarEstado(
      idIncidencia,
      entrada,
      usuario.id,
    );
  }

  @Patch(':id/priority')
  @SetMetadata('rolesIncidencias', ['admin', 'administrative'])
  @ApiOperation({
    summary: 'Asignar prioridad manual con motivo',
    description:
      'Solo incidencias validadas y admin/administrative actuales. Prioridades: Baja, Media y Alta. Actor de auditoría derivado del usuario autenticado; historial en memoria.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['priority', 'cause'],
      properties: {
        priority: esquemaPrioridad,
        cause: {
          type: 'string',
          minLength: 1,
          description: 'Motivo obligatorio; no vacío después de trim.',
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
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Incident {
    return this.incidentsService.cambiarPrioridad(
      idIncidencia,
      entrada,
      usuario.id,
    );
  }

  @Get(':id')
  @SetMetadata('rolesIncidencias', ['civic', 'admin', 'administrative'])
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'The incident id is not a UUID.' })
  @ApiNotFoundResponse({ description: 'The incident does not exist.' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Incident {
    return this.incidentsService.findOne(id, usuario);
  }
}
