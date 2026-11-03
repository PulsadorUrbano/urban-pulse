import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  SetMetadata,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { AccesoIncidenciasGuard } from '../guards/acceso-incidencias.guard.js';
import { UsuarioIncidenciasActual } from '../decorators/usuario-incidencias-actual.decorator.js';
import type { UsuarioIncidencias } from '../types/usuario-incidencias.js';
import { IncidentsService } from '../incidents.service.js';
import {
  nombreArchivoImagen,
  UploadStorageService,
} from '../upload-storage.service.js';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccesoIncidenciasGuard)
@SetMetadata('rolesIncidencias', ['civic', 'admin', 'administrative'])
@Controller('uploads/incidents')
export class UploadsController {
  constructor(
    private readonly incidencias: IncidentsService,
    private readonly almacenamiento: UploadStorageService,
  ) {}

  @Get(':id/:archivo')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Consultar una imagen de incidencia con permiso',
    description:
      'Solo propietario civic u operador admin/administrative actual. Requiere Bearer incluso conociendo la URL; no entrega archivos huérfanos del registro en memoria.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: 'Bytes de la imagen registrada; respuesta privada sin caché.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiBadRequestResponse({
    description: 'Identificador de incidencia inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'JWT inválido/ausente o usuario eliminado.',
  })
  @ApiForbiddenResponse({
    description: 'Rol actual o vinculación ciudadana insuficiente.',
  })
  @ApiNotFoundResponse({
    description:
      'Incidencia ajena/ausente, imagen no registrada o archivo no disponible.',
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo leer la imagen; sin detalles del almacenamiento.',
  })
  async descargar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('archivo') archivo: string,
    @UsuarioIncidenciasActual() usuario: UsuarioIncidencias,
  ): Promise<StreamableFile> {
    const autorizada = this.incidencias.obtenerImagen(id, archivo, usuario);
    const contenido = await this.almacenamiento.leer(
      autorizada.incidenciaId,
      autorizada.imagen,
    );
    return new StreamableFile(contenido, {
      type: autorizada.imagen.mimeType,
      disposition:
        'inline; filename="' + nombreArchivoImagen(autorizada.imagen) + '"',
    });
  }
}
