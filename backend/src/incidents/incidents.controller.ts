import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  UploadedFiles,
  UseInterceptors,
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
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  AddressDistrict,
  IncidentPriority,
  IncidentStatus,
} from '../generated/prisma/enums.js';
import { CambiarEstadoIncidenciaPipe } from './cambiar-estado-incidencia.pipe.js';
import { CambiarPrioridadIncidenciaPipe } from './cambiar-prioridad-incidencia.pipe.js';
import { AsignarIncidenciaPipe } from './asignar-incidencia.pipe.js';
import { CreateIncidentPipe } from './create-incident.pipe.js';
import { UsuarioIncidenciasActual } from './decorators/usuario-incidencias-actual.decorator.js';
import { AccesoIncidenciasGuard } from './guards/acceso-incidencias.guard.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  CambioAsignacionIncidencia,
  CrearIncidenciaBody,
  Incident,
  OpcionesAsignacion,
  ResumenIncidencia,
} from './incident.js';
import {
  ListarIncidenciasPipe,
  type ConsultaListadoIncidencias,
} from './listar-incidencias.pipe.js';
import { IncidentsService } from './incidents.service.js';
import { FotosIncidenciaService } from './services/fotos-incidencia.service.js';
import {
  validarFotosIncidencia,
  type ArchivoFoto,
} from './validar-fotos-incidencia.js';
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
    'departmentId',
    'teamId',
    'technicianId',
    'createdAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    civicId: { type: 'string', format: 'uuid' },
    categoryId: { type: 'string', format: 'uuid' },
    category: { type: 'string' },
    urbanAssetId: { type: 'string', format: 'uuid', nullable: true },
    location: {
      type: 'object',
      required: ['latitude', 'longitude', 'accuracy', 'createdAt', 'address'],
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        address: {
          type: 'object',
          nullable: true,
          required: ['street', 'zipCode', 'district'],
          properties: {
            street: { type: 'string' },
            zipCode: { type: 'string', pattern: '^[0-9]{5}$' },
            district: { type: 'string', enum: Object.values(AddressDistrict) },
          },
        },
      },
    },
    images: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        required: ['id', 'url', 'mimeType', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL de lectura temporal.',
          },
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
    departmentId: { type: 'string', format: 'uuid', nullable: true },
    teamId: { type: 'string', format: 'uuid', nullable: true },
    technicianId: { type: 'string', format: 'uuid', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  private readonly logger = new Logger(IncidentsController.name);

  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly fotosService: FotosIncidenciaService,
  ) {}

  @Get('assignment-options')
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', ['admin', 'administrative', 'department'])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar departamentos, equipos y técnicos asignables',
  })
  @ApiOkResponse({
    description: 'Catálogos de departamentos, equipos y técnicos asignables.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description: 'Se requiere rol admin, administrative o department autorizado.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  opcionesAsignacion(
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<OpcionesAsignacion> {
    return this.incidentsService.opcionesAsignacion(usuario);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', [
    'civic',
    'admin',
    'administrative',
    'department',
    'team',
    'technician',
  ])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar todas las incidencias o filtrarlas por ciudadano',
    description:
      'Requiere JWT. Admin y administrative pueden consultar todas las incidencias o filtrar por ciudadano. Los demás roles autorizados solo pueden consultar su propio civicId si tienen perfil ciudadano. No devuelve trazabilidad.',
  })
  @ApiQuery({ name: 'civicId', required: false, type: String, format: 'uuid' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    description: 'Por defecto 10.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor opaco devuelto en nextCursor.',
  })
  @ApiOkResponse({
    description:
      'Array de resúmenes, ordenados del más reciente al más antiguo. La paginación se comunica mediante cabeceras.',
    headers: {
      Link: {
        description: 'Enlace rel=next a la página siguiente, si existe.',
        schema: { type: 'string' },
      },
      'X-Page': {
        description: 'Índice de página; la primera es 0.',
        schema: { type: 'integer' },
      },
      'X-Limit': {
        description: 'Tamaño de página aplicado.',
        schema: { type: 'integer' },
      },
      'X-Next-Cursor': {
        description:
          'Cursor opaco para continuar; ausente en la última página.',
        schema: { type: 'string' },
      },
    },
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
      'Parámetros inválidos o desconocidos, limit fuera del rango 1–100 o cursor inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description: 'Rol insuficiente o filtro ciudadano ausente o ajeno.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  listar(
    @Query(new ListarIncidenciasPipe()) consulta: ConsultaListadoIncidencias,
    @Res({ passthrough: true }) response: Response,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<ResumenIncidencia[]> {
    const puedeConsultarGlobal =
      usuario.role === 'admin' || usuario.role === 'administrative';
    if (
      !puedeConsultarGlobal &&
      (usuario.ciudadanoId === null || consulta.civicId !== usuario.ciudadanoId)
    ) {
      throw new ForbiddenException(
        'El ciudadano solo puede consultar sus incidencias',
      );
    }
    return this.incidentsService
      .listarPagina(consulta.limit, consulta.cursor, consulta.civicId)
      .then((pagina) => {
        response.setHeader('X-Page', String(pagina.pagina));
        response.setHeader('X-Limit', String(pagina.limit));
        if (pagina.nextCursor) {
          response.setHeader('X-Next-Cursor', pagina.nextCursor);
          const parametros = new URLSearchParams({
            limit: String(pagina.limit),
            cursor: pagina.nextCursor,
          });
          if (consulta.civicId) parametros.set('civicId', consulta.civicId);
          response.setHeader(
            'Link',
            `</incidents?${parametros.toString()}>; rel="next"`,
          );
        }
        return pagina.items;
      });
  }

  @Post()
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol actual o la vinculación ciudadana no permite la operación.',
  })
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
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
      required: ['title', 'latitude', 'longitude'],
      anyOf: [{ required: ['categoryId'] }, { required: ['category'] }],
      properties: {
        title: { type: 'string', minLength: 4, maxLength: 35 },
        description: { type: 'string', minLength: 10 },
        categoryId: { type: 'string', format: 'uuid' },
        category: { type: 'string' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        accuracy: { type: 'number', minimum: 0 },
        urbanAssetId: { type: 'string', format: 'uuid' },
        address: {
          type: 'object',
          additionalProperties: false,
          required: ['street', 'zipCode', 'district'],
          properties: {
            street: { type: 'string', minLength: 1 },
            zipCode: { type: 'string', pattern: '^[0-9]{5}$' },
            district: { type: 'string', enum: Object.values(AddressDistrict) },
          },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Incidencia y ubicación persistidas en PostgreSQL. images comienza vacío; las fotos se añaden después.',
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

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', ['civic'])
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      limits: { fileSize: 5 * 1024 * 1024, files: 8, fields: 0, parts: 8 },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Añadir fotos a una incidencia propia' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Lista completa de fotos con URL temporales de lectura.',
  })
  @ApiBadRequestResponse({
    description: 'Archivo ausente, inválido o superior a 5 MiB.',
  })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente.' })
  @ApiForbiddenResponse({
    description: 'El usuario no es ciudadano vinculado.',
  })
  @ApiNotFoundResponse({ description: 'La incidencia no existe o es ajena.' })
  @ApiConflictResponse({ description: 'La incidencia ya tiene ocho fotos.' })
  @ApiBadGatewayResponse({ description: 'S3 no está disponible.' })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL o la configuración S3 no está disponible.',
  })
  subirFotos(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() archivos: ArchivoFoto[],
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ) {
    if (!usuario.ciudadanoId)
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    return this.fotosService.subir(
      id,
      usuario.ciudadanoId,
      validarFotosIncidencia(archivos ?? []),
    );
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol actual o la vinculación ciudadana no permite la operación.',
  })
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', [
    'admin',
    'administrative',
    'department',
    'team',
    'technician',
  ])
  @ApiOperation({
    summary: 'Cambiar el estado de una incidencia con motivo',
    description:
      'Aplica la matriz de transiciones y el ámbito del departamento o técnico asignado. El actor procede del token y el cambio se persiste con su historial.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'cause'],
      properties: {
        status: {
          type: 'string',
          enum: [
            'validated',
            'rejected',
            'in_progress',
            'resolved',
            'reopened',
            'closed',
          ],
        },
        cause: { type: 'string', minLength: 1 },
      },
    },
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'UUID o cuerpo inválido.' })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description: 'La transición no está permitida o la incidencia cambió.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  async cambiarEstado(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarEstadoIncidenciaPipe())
    entrada: CambiarEstadoIncidenciaInput,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    const incidencia = await this.incidentsService.cambiarEstado(
      idIncidencia,
      entrada,
      usuario,
    );
    return this.responderConFotos(incidencia);
  }

  @Patch(':id/priority')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol actual o la vinculación ciudadana no permite la operación.',
  })
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
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
  async cambiarPrioridad(
    @Param('id', new ParseUUIDPipe()) idIncidencia: string,
    @Body(new CambiarPrioridadIncidenciaPipe())
    entrada: CambiarPrioridadIncidenciaInput,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    const incidencia = await this.incidentsService.cambiarPrioridad(
      idIncidencia,
      entrada,
      usuario.id,
    );
    return this.responderConFotos(incidencia);
  }

  @Patch(':id/assignment')
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', ['admin', 'administrative', 'department'])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Asignar departamento, equipo y técnico a una incidencia',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      minProperties: 2,
      required: ['cause'],
      properties: {
        cause: { type: 'string', minLength: 1 },
        departmentId: { type: 'string', format: 'uuid', nullable: true },
        teamId: { type: 'string', format: 'uuid', nullable: true },
        technicianId: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({
    description: 'UUID, cuerpo o ID de catálogo inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description: 'Se requiere rol admin, administrative o department autorizado.',
  })
  @ApiNotFoundResponse({ description: 'La incidencia no existe.' })
  @ApiConflictResponse({
    description: 'Estado, jerarquía o versión de asignación incompatible.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  async asignar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new AsignarIncidenciaPipe()) cambio: CambioAsignacionIncidencia,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    const incidencia = await this.incidentsService.asignar(id, cambio, usuario);
    return this.responderConFotos(incidencia);
  }

  @Get(':id/assignments')
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', [
    'admin',
    'administrative',
    'department',
    'team',
    'technician',
  ])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el historial de asignaciones' })
  consultarAsignaciones(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ) {
    return this.incidentsService.consultarCambiosAsignacion(id, usuario);
  }

  private async responderConFotos(incidencia: Incident): Promise<Incident> {
    try {
      return await this.fotosService.agregarA(incidencia);
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudieron adjuntar las fotos de la incidencia ${incidencia.id}: ${motivo}`,
      );
      return { ...incidencia, images: [] };
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'JWT inválido o usuario inexistente.',
  })
  @ApiForbiddenResponse({
    description:
      'El rol actual o la vinculación ciudadana no permite la operación.',
  })
  @UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
  @SetMetadata('rolesIncidencias', [
    'civic',
    'admin',
    'administrative',
    'department',
    'team',
    'technician',
  ])
  @ApiOperation({
    summary: 'Consultar una incidencia por identificador',
    description:
      'Cada operador consulta incidencias de su ámbito. Un ciudadano puede consultar las suyas; una ajena responde 404 para no revelar su existencia.',
  })
  @ApiOkResponse({ schema: incidentSchema })
  @ApiBadRequestResponse({ description: 'El identificador no es un UUID.' })
  @ApiNotFoundResponse({
    description: 'La incidencia no existe o no pertenece al ciudadano.',
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    return this.fotosService.agregarA(
      await this.incidentsService.findOne(id, usuario),
    );
  }
}
