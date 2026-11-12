import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CambioEstadoModel,
  CambioPrioridadModel,
  IncidentModel as PrismaIncident,
  IncidentLocationModel as PrismaIncidentLocation,
} from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  CreateIncidentInput,
  CursorIncidencias,
  Incident,
  PaginaIncidencias,
  ResumenIncidencia,
} from './incident.js';
import type { UsuarioIncidencias } from './types/usuario-incidencias.js';

const incluirAgregado = {
  location: true,
};

type IncidenciaConAgregado = PrismaIncident & {
  location: PrismaIncidentLocation | null;
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateIncidentInput): Promise<Incident> {
    const id = randomUUID();
    const createdAt = new Date();
    const datos = {
      id,
      title: input.title,
      description: input.description ?? null,
      civicId: input.civicId.toLowerCase(),
      categoryId: input.categoryId?.toLowerCase() ?? null,
      category: input.category?.trim() || null,
      urbanAssetId: input.urbanAssetId?.toLowerCase() ?? null,
      createdAt,
      location: {
        create: {
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          accuracy: input.accuracy ?? null,
          createdAt,
        },
      },
    };

    let creada: IncidenciaConAgregado;
    try {
      creada = await this.prisma.$transaction((tx) =>
        tx.incident.create({ data: datos, include: incluirAgregado }),
      );
    } catch {
      // Un fallo de commit puede dejar la transacción confirmada. Consultar antes de informar del error.
      try {
        const existente = await this.prisma.incident.findUnique({
          where: { id },
          include: incluirAgregado,
        });
        if (existente) return this.serializar(existente);
      } catch {
        this.logger.error(
          `No se pudo conciliar el resultado de creación de la incidencia ${id}.`,
        );
        throw this.errorPersistencia('crear la incidencia');
      }
      throw this.errorPersistencia('crear la incidencia');
    }
    return this.serializar(creada);
  }

  async listarPorCiudadano(idCiudadano: string): Promise<ResumenIncidencia[]> {
    let incidencias;
    try {
      incidencias = await this.prisma.incident.findMany({
        where: { civicId: idCiudadano.toLowerCase() },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { id: true, title: true, status: true, createdAt: true },
      });
    } catch {
      throw this.errorPersistencia('consultar incidencias');
    }
    return incidencias.map(({ id, title, status, createdAt }) => ({
      id,
      title,
      status,
      createdAt: createdAt.toISOString(),
    }));
  }

  async listarPagina(
    limit: number,
    cursor?: CursorIncidencias,
    idCiudadano?: string,
  ): Promise<PaginaIncidencias> {
    const civicId = idCiudadano?.toLowerCase() ?? null;
    if (cursor && cursor.civicId !== civicId) {
      throw new BadRequestException('civicId no coincide con el cursor');
    }

    let incidencias;
    try {
      incidencias = await this.prisma.incident.findMany({
        where: {
          ...(civicId ? { civicId } : {}),
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  {
                    createdAt: new Date(cursor.createdAt),
                    id: { gt: cursor.id },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: limit + 1,
        select: { id: true, title: true, status: true, createdAt: true },
      });
    } catch {
      throw this.errorPersistencia('consultar incidencias');
    }

    const hayMas = incidencias.length > limit;
    const pagina = cursor?.pagina ?? 0;
    const visibles = incidencias.slice(0, limit);
    const ultima = visibles.at(-1);
    const nextCursor =
      hayMas && ultima
        ? Buffer.from(
            JSON.stringify({
              id: ultima.id,
              createdAt: ultima.createdAt.toISOString(),
              pagina: pagina + 1,
              civicId,
            }),
          ).toString('base64url')
        : null;

    return {
      items: visibles.map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt: createdAt.toISOString(),
      })),
      limit,
      pagina,
      nextCursor,
    };
  }

  async findOne(id: string, usuario: UsuarioIncidencias): Promise<Incident> {
    if (usuario.role === 'civic' && !usuario.ciudadanoId) {
      throw new ForbiddenException('Se requiere un ciudadano vinculado');
    }
    let incident;
    try {
      incident = await this.prisma.incident.findUnique({
        where: { id: id.toLowerCase() },
        include: incluirAgregado,
      });
    } catch {
      throw this.errorPersistencia('consultar la incidencia');
    }
    if (!incident) throw new NotFoundException('La incidencia no existe');
    if (
      usuario.role === 'civic' &&
      incident.civicId !== usuario.ciudadanoId?.toLowerCase()
    ) {
      throw new NotFoundException('La incidencia no existe');
    }
    return this.serializar(incident);
  }

  async cambiarEstado(
    idIncidencia: string,
    entrada: CambiarEstadoIncidenciaInput,
    idActor: string,
  ): Promise<Incident> {
    if (
      (entrada.status !== 'validated' && entrada.status !== 'rejected') ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'El estado debe ser validated o rejected y el motivo no puede estar vacío',
      );
    }
    const id = idIncidencia.toLowerCase();
    const fechaCreacion = new Date();
    const cambio = {
      id: randomUUID(),
      incidenciaId: id,
      actorId: idActor.toLowerCase(),
      nuevoEstado: entrada.status,
      motivo: entrada.cause.trim(),
      fechaCreacion,
    };

    let resultado: IncidenciaConAgregado | null;
    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        const actualizadas = await tx.incident.updateMany({
          where: { id, status: 'reported' },
          data: { status: entrada.status },
        });
        if (actualizadas.count === 0) {
          const existe = await tx.incident.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!existe) throw new NotFoundException('La incidencia no existe');
          throw new ConflictException(
            'Solo se puede validar o rechazar una incidencia en estado reported',
          );
        }
        await tx.cambioEstado.create({ data: cambio });
        return tx.incident.findUnique({
          where: { id },
          include: incluirAgregado,
        });
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw this.errorPersistencia('cambiar el estado de la incidencia');
    }
    if (!resultado) throw new NotFoundException('La incidencia no existe');
    return this.serializar(resultado);
  }

  async consultarCambiosEstado(
    idIncidencia: string,
  ): Promise<CambioEstadoModel[]> {
    await this.obtenerIncidencia(idIncidencia);
    try {
      return await this.prisma.cambioEstado.findMany({
        where: { incidenciaId: idIncidencia.toLowerCase() },
        orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
      });
    } catch {
      throw this.errorPersistencia('consultar el historial de estado');
    }
  }

  async cambiarPrioridad(
    idIncidencia: string,
    entrada: CambiarPrioridadIncidenciaInput,
    idActor: string,
  ): Promise<Incident> {
    if (
      !['low', 'medium', 'high'].includes(entrada.priority) ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'La prioridad debe ser Baja (low), Media (medium) o Alta (high) y el motivo no puede estar vacío',
      );
    }
    const id = idIncidencia.toLowerCase();
    const cambio: CambioPrioridadModel = {
      id: randomUUID(),
      incidenciaId: id,
      actorId: idActor.toLowerCase(),
      nuevaPrioridad: entrada.priority,
      motivo: entrada.cause.trim(),
      esManual: true,
      fechaCreacion: new Date(),
    };

    let resultado: IncidenciaConAgregado | null;
    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        const actualizadas = await tx.incident.updateMany({
          where: { id, status: 'validated' },
          data: { priority: entrada.priority },
        });
        if (actualizadas.count === 0) {
          const existe = await tx.incident.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!existe) throw new NotFoundException('La incidencia no existe');
          throw new ConflictException(
            'Solo se puede asignar prioridad a una incidencia validada',
          );
        }
        await tx.cambioPrioridad.create({ data: cambio });
        return tx.incident.findUnique({
          where: { id },
          include: incluirAgregado,
        });
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw this.errorPersistencia('cambiar la prioridad de la incidencia');
    }
    if (!resultado) throw new NotFoundException('La incidencia no existe');
    return this.serializar(resultado);
  }

  async consultarCambiosPrioridad(
    idIncidencia: string,
  ): Promise<CambioPrioridadModel[]> {
    await this.obtenerIncidencia(idIncidencia);
    try {
      return await this.prisma.cambioPrioridad.findMany({
        where: { incidenciaId: idIncidencia.toLowerCase() },
        orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
      });
    } catch {
      throw this.errorPersistencia('consultar el historial de prioridad');
    }
  }

  private async obtenerIncidencia(
    idIncidencia: string,
  ): Promise<PrismaIncident> {
    let incidencia;
    try {
      incidencia = await this.prisma.incident.findUnique({
        where: { id: idIncidencia.toLowerCase() },
      });
    } catch {
      throw this.errorPersistencia('consultar la incidencia');
    }
    if (!incidencia) throw new NotFoundException('La incidencia no existe');
    return incidencia;
  }

  private serializar(incident: IncidenciaConAgregado): Incident {
    return {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      civicId: incident.civicId,
      categoryId: incident.categoryId,
      category: incident.category,
      urbanAssetId: incident.urbanAssetId,
      status: incident.status,
      priority: incident.priority,
      createdAt: incident.createdAt.toISOString(),
      location: {
        latitude: incident.location?.latitude ?? null,
        longitude: incident.location?.longitude ?? null,
        accuracy: incident.location?.accuracy ?? null,
        createdAt: (
          incident.location?.createdAt ?? incident.createdAt
        ).toISOString(),
      },
      images: [],
    };
  }

  private errorPersistencia(operacion: string): ServiceUnavailableException {
    this.logger.error(`No se pudo ${operacion} en PostgreSQL.`);
    return new ServiceUnavailableException(
      'El almacenamiento de incidencias no está disponible.',
    );
  }
}
