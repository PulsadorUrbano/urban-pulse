import {
  BadRequestException,
  ConflictException,
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
  CambioAsignacionIncidencia,
  CreateIncidentInput,
  Incident,
  OpcionesAsignacion,
  ResumenIncidencia,
} from './incident.js';

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

  async findOne(id: string): Promise<Incident> {
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
    return this.serializar(incident);
  }

  async opcionesAsignacion(): Promise<OpcionesAsignacion> {
    try {
      const [departments, teams, members] = await Promise.all([
        this.prisma.department.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.team.findMany({
          select: { id: true, name: true, departmentId: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.teamMember.findMany({
          where: { isTechnician: true },
          select: {
            teamId: true,
            user: { select: { id: true, username: true } },
          },
          orderBy: { user: { username: 'asc' } },
        }),
      ]);
      return {
        departments,
        teams,
        technicians: members.map(({ teamId, user }) => ({
          id: user.id,
          name: user.username,
          teamId,
        })),
      };
    } catch {
      throw this.errorPersistencia('consultar las opciones de asignación');
    }
  }

  async asignar(
    idIncidencia: string,
    cambio: CambioAsignacionIncidencia,
  ): Promise<Incident> {
    const id = idIncidencia.toLowerCase();
    let resultado: IncidenciaConAgregado | null;
    try {
      resultado = await this.prisma.$transaction(async (tx) => {
        const actual = await tx.incident.findUnique({
          where: { id },
          select: {
            status: true,
            departmentId: true,
            teamId: true,
            technicianId: true,
          },
        });
        if (!actual) throw new NotFoundException('La incidencia no existe');
        if (actual.status !== 'validated' && actual.status !== 'assigned') {
          throw new ConflictException(
            'Solo se puede asignar una incidencia validada o asignada',
          );
        }

        const departmentId =
          cambio.departmentId === undefined
            ? actual.departmentId
            : cambio.departmentId;
        const cambioDepartamento = departmentId !== actual.departmentId;
        const teamId =
          cambio.teamId === undefined
            ? cambioDepartamento
              ? null
              : actual.teamId
            : cambio.teamId;
        const cambioEquipo = teamId !== actual.teamId || cambioDepartamento;
        const technicianId =
          cambio.technicianId === undefined
            ? cambioEquipo
              ? null
              : actual.technicianId
            : cambio.technicianId;

        if (
          departmentId &&
          !(await tx.department.findUnique({
            where: { id: departmentId },
            select: { id: true },
          }))
        ) {
          throw new BadRequestException('departmentId no existe');
        }
        if (teamId) {
          const team = await tx.team.findUnique({
            where: { id: teamId },
            select: { departmentId: true },
          });
          if (!team) throw new BadRequestException('teamId no existe');
          if (team.departmentId !== departmentId)
            throw new ConflictException(
              'El equipo no pertenece al departamento',
            );
        }
        if (technicianId) {
          const user = await tx.users.findUnique({
            where: { id: technicianId },
            select: { id: true },
          });
          if (!user) throw new BadRequestException('technicianId no existe');
          if (!teamId) {
            throw new ConflictException('El técnico requiere un equipo');
          }
          const miembro = await tx.teamMember.findUnique({
            where: { userId_teamId: { userId: technicianId, teamId } },
            select: { isTechnician: true },
          });
          if (!miembro?.isTechnician) {
            throw new ConflictException('El técnico no pertenece al equipo');
          }
        }

        const actualizadas = await tx.incident.updateMany({
          where: {
            id,
            status: actual.status,
            departmentId: actual.departmentId,
            teamId: actual.teamId,
            technicianId: actual.technicianId,
          },
          data: { departmentId, teamId, technicianId },
        });
        if (actualizadas.count !== 1)
          throw new ConflictException(
            'La asignación cambió durante la operación',
          );
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
      )
        throw error;
      throw this.errorPersistencia('asignar la incidencia');
    }
    if (!resultado) throw new NotFoundException('La incidencia no existe');
    return this.serializar(resultado);
  }

  async cambiarEstado(
    idIncidencia: string,
    entrada: CambiarEstadoIncidenciaInput,
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
      actorId: entrada.civicId.toLowerCase(),
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
      actorId: entrada.civicId.toLowerCase(),
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
      departmentId: incident.departmentId,
      teamId: incident.teamId,
      technicianId: incident.technicianId,
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
