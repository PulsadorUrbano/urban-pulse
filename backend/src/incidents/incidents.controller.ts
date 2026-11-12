import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { IncidentPriority, IncidentStatus } from '../generated/prisma/enums.js';
import { CambiarEstadoIncidenciaPipe } from './cambiar-estado-incidencia.pipe.js';
import { CambiarPrioridadIncidenciaPipe } from './cambiar-prioridad-incidencia.pipe.js';
import { CreateIncidentPipe } from './create-incident.pipe.js';
import { UsuarioIncidenciasActual } from './decorators/usuario-incidencias-actual.decorator.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  CrearIncidenciaBody,
  Incident,
  ResumenIncidencia,
} from './incident.js';
import { IncidentsService } from './incidents.service.js';
import { ListarIncidenciasPipe } from './listar-incidencias.pipe.js';
import type { UsuarioIncidencias } from './types/usuario-incidencias.js';

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
      required: ['latitude', 'longitude', 'accuracy', 'createdAt'],
      properties: {
        latitude: { type: 'number', nullable: true },
        longitude: { type: 'number', nullable: true },
        accuracy: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    images: {
      type: 'array',
      maxItems: 0,
      items: { type: 'object' },
      description:
        'Campo de compatibilidad temporal. Siempre es un array vacío; la API no almacena imágenes.',
    },
    status: { type: 'string', enum: Object.values(IncidentStatus) },
    priority: esquemaPrioridad,
    createdAt: { type: 'string', format: 'date-time' },
  },
};

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
    summary: 'Consultar las incidencias del ciudadano autenticado',
    description:
      'La identidad y la relación ciudadana se obtienen del JWT y se revalidan en PostgreSQL. No admite civicId ni otros parámetros de consulta.',
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
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  async listar(
    @Query(new ListarIncidenciasPipe()) _consulta: void,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<ResumenIncidencia[]> {
    if (!usuario.ciudadanoId) {
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    }
    return this.incidentsService.listarPorCiudadano(usuario.ciudadanoId);
  }

  @Post()
  @SetMetadata('rolesIncidencias', ['civic'])
  @ApiOperation({
    summary: 'Crear una incidencia del ciudadano autenticado',
    description:
      'Acepta exclusivamente JSON. El propietario procede de la identidad autenticada; civicId e imágenes se rechazan en el cuerpo. Incidencia y ubicación se guardan de forma asíncrona y atómica en PostgreSQL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
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
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Incidencia y ubicación persistidas en PostgreSQL. images se conserva temporalmente y siempre vale [].',
    schema: incidentSchema,
    headers: {
      Location: {
        description: 'Ruta de la incidencia creada.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Cuerpo JSON inválido, campo desconocido, coordenada fuera de rango o UUID mal formado.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  async create(
    @Body(new CreateIncidentPipe()) input: CrearIncidenciaBody,
    @Res({ passthrough: true }) response: Response,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    if (!usuario.ciudadanoId) {
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    }
    const incident = await this.incidentsService.create({
      ...input,
      civicId: usuario.ciudadanoId,
    });
    response.setHeader('Location', `/incidents/${incident.id}`);
    return incident;
  }

  @Patch(':id/status')
  @SetMetadata('rolesIncidencias', ['admin', 'administrative'])
  @ApiOperation({
    summary: 'Validar o rechazar una incidencia con motivo',
    description:
      'Solo admin o administrative actuales. El actor de auditoría procede de la identidad autenticada y el cambio se persiste atómicamente con su historial.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'cause'],
      properties: {
        status: { type: 'string', enum: ['validated', 'rejected'] },
        cause: { type: 'string', minLength: 1 },
      },
    },
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'UUID o cuerpo inválido.' })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description: 'La incidencia ya no está en estado reported.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  cambiarEstado(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarEstadoIncidenciaPipe())
    entrada: CambiarEstadoIncidenciaInput,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
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
      'Solo admin o administrative actuales y sobre incidencias validadas. El actor procede de la identidad autenticada y el cambio se persiste atómicamente con su historial.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['priority', 'cause'],
      properties: {
        priority: esquemaPrioridad,
        cause: { type: 'string', minLength: 1 },
      },
    },
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'UUID, prioridad o cuerpo inválido.' })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description: 'Solo se admite prioridad en incidencias validadas.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  cambiarPrioridad(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarPrioridadIncidenciaPipe())
    entrada: CambiarPrioridadIncidenciaInput,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    return this.incidentsService.cambiarPrioridad(
      idIncidencia,
      entrada,
      usuario.id,
    );
  }

  @Get(':id')
  @SetMetadata('rolesIncidencias', ['civic', 'admin', 'administrative'])
  @ApiOperation({
    summary: 'Consultar una incidencia por identificador',
    description:
      'Los operadores pueden consultar cualquier incidencia. Un ciudadano solo puede consultar las suyas; una ajena responde 404 para no revelar su existencia.',
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'El identificador no es un UUID.' })
  @ApiNotFoundResponse({
    description: 'La incidencia no existe o no pertenece al ciudadano.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    return this.incidentsService.findOne(id, usuario);
  }
}
