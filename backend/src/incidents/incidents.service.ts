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
  AddressModel,
  CategoryModel,
  CambioAsignacionModel,
  IncidentModel as PrismaIncident,
  IncidentLocationModel as PrismaIncidentLocation,
} from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  CambioAsignacionIncidencia,
  CreateIncidentInput,
  CursorIncidencias,
  Incident,
  OpcionesAsignacion,
  PaginaIncidencias,
  ResumenIncidencia,
} from './incident.js';
import type { UsuarioIncidencias } from './types/usuario-incidencias.js';
import { normalizeCategoryName } from './category.js';

const incluirAgregado = {
  location: { include: { address: true } },
  categoria: true,
};

type IncidenciaConAgregado = PrismaIncident & {
  categoria: CategoryModel | null;
  location: (PrismaIncidentLocation & { address: AddressModel | null }) | null;
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateIncidentInput): Promise<Incident> {
    if (input.latitude === undefined || input.longitude === undefined) {
      throw new BadRequestException('La ubicación es obligatoria');
    }
    let categoriaId = input.categoryId?.toLowerCase();
    const nombreCategoria = input.category?.trim();
    try {
      if (input.categoryId) {
        const categoria = await this.prisma.category.findUnique({
          where: { id: input.categoryId.toLowerCase() },
          select: { id: true, name: true, isActive: true },
        });
        if (!categoria || !categoria.isActive) {
          throw new BadRequestException('categoryId no existe');
        }
        if (
          nombreCategoria &&
          normalizeCategoryName(nombreCategoria) !==
            normalizeCategoryName(categoria.name)
        ) {
          throw new BadRequestException('category no coincide con categoryId');
        }
      } else if (nombreCategoria) {
        const categoria = await this.prisma.category.findUnique({
          where: { normalizedName: normalizeCategoryName(nombreCategoria) },
        });
        if (!categoria?.isActive)
          throw new BadRequestException(
            'La categoría no pertenece al catálogo activo',
          );
        categoriaId = categoria.id;
      }
      if (input.urbanAssetId) {
        const activo = await this.prisma.urbanAsset.findUnique({
          where: { id: input.urbanAssetId.toLowerCase() },
          select: { id: true },
        });
        if (!activo) {
          throw new BadRequestException('urbanAssetId no existe');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw this.errorPersistencia('validar los catálogos de la incidencia');
    }
    const id = randomUUID();
    const createdAt = new Date();
    const ubicacion =
      input.latitude === undefined || input.longitude === undefined
        ? null
        : {
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy ?? null,
            createdAt,
          };
    const datos = {
      id,
      title: input.title,
      description: input.description ?? null,
      civicId: input.civicId.toLowerCase(),
      categoryId: categoriaId ?? null,
      urbanAssetId: input.urbanAssetId?.toLowerCase() ?? null,
      createdAt,
    };

    let creada: IncidenciaConAgregado;
    try {
      creada = await this.prisma.$transaction(async (tx) => {
        const addressId = input.address
          ? (
              await tx.address.upsert({
                where: {
                  street_zipCode_district: input.address,
                },
                update: {},
                create: input.address,
              })
            ).id
          : null;
        return tx.incident.create({
          data: {
            ...datos,
            cambiosEstado: {
              create: {
                actorId: input.civicId.toLowerCase(),
                nuevoEstado: 'reported',
                motivo: 'Registro de incidencia',
                fechaCreacion: createdAt,
              },
            },
            ...(ubicacion
              ? {
                  location: {
                    create: {
                      ...ubicacion,
                      ...(addressId ? { addressId } : {}),
                    },
                  },
                }
              : {}),
          },
          include: incluirAgregado,
        });
      });
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
      !['admin', 'administrative'].includes(usuario.role) &&
      incident.civicId !== usuario.ciudadanoId?.toLowerCase() &&
      !(
        usuario.role === 'department' &&
        usuario.departamentoId &&
        incident.departmentId === usuario.departamentoId
      ) &&
      !(
        ['team', 'technician'].includes(usuario.role) &&
        incident.teamId &&
        incident.teamId === usuario.equipoId
      )
    ) {
      throw new NotFoundException('La incidencia no existe');
    }
    return this.serializar(incident);
  }

  async opcionesAsignacion(
    usuario?: UsuarioIncidencias,
  ): Promise<OpcionesAsignacion> {
    try {
      const [departments, teams, members] = await Promise.all([
        this.prisma.department.findMany({
          where: {
            isActive: true,
            ...(usuario?.role === 'department'
              ? { id: usuario.departamentoId ?? '' }
              : {}),
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.team.findMany({
          where: {
            isActive: true,
            department: { isActive: true },
            ...(usuario?.role === 'department'
              ? { departmentId: usuario.departamentoId ?? '' }
              : {}),
          },
          select: { id: true, name: true, departmentId: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.teamMember.findMany({
          where: {
            isTechnician: true,
            isActive: true,
            user: { isActive: true },
            team: {
              isActive: true,
              department: { isActive: true },
              ...(usuario?.role === 'department'
                ? { departmentId: usuario.departamentoId ?? '' }
                : {}),
            },
          },
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
    usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    const comentarios = cambio.cause?.trim() || null;
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
        if (!['validated', 'assigned', 'reopened'].includes(actual.status)) {
          throw new ConflictException(
            'Solo se puede asignar una incidencia validada o asignada',
          );
        }

        const departmentId =
          cambio.departmentId === undefined
            ? actual.departmentId
            : cambio.departmentId;
        if (
          !['admin', 'administrative'].includes(usuario.role) &&
          !(
            usuario.role === 'department' &&
            usuario.departamentoId &&
            usuario.departamentoId === departmentId &&
            actual.departmentId === usuario.departamentoId
          )
        ) {
          throw new ForbiddenException(
            'Solo puede operar sobre su departamento',
          );
        }
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

        if (!departmentId || !teamId)
          throw new ConflictException(
            'La asignación requiere departamento y equipo',
          );
        if (
          departmentId &&
          !(await tx.department.findUnique({
            where: { id: departmentId, isActive: true },
            select: { id: true },
          }))
        ) {
          throw new BadRequestException('departmentId no existe');
        }
        if (teamId) {
          const team = await tx.team.findUnique({
            where: { id: teamId, isActive: true },
            select: { departmentId: true },
          });
          if (!team) throw new BadRequestException('teamId no existe');
          if (team.departmentId !== departmentId) {
            throw new ConflictException(
              'El equipo no pertenece al departamento',
            );
          }
        }
        if (technicianId) {
          const user = await tx.user.findUnique({
            where: { id: technicianId, isActive: true },
            select: { id: true },
          });
          if (!user) throw new BadRequestException('technicianId no existe');
          if (!teamId)
            throw new ConflictException('El técnico requiere un equipo');
          const miembro = await tx.teamMember.findUnique({
            where: { userId_teamId: { userId: technicianId, teamId } },
            select: { isTechnician: true, isActive: true },
          });
          if (!miembro?.isTechnician || !miembro.isActive) {
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
          data: { departmentId, teamId, technicianId, status: 'assigned' },
        });
        if (actualizadas.count !== 1) {
          throw new ConflictException(
            'La asignación cambió durante la operación',
          );
        }
        await tx.cambioAsignacion.create({
          data: {
            incidenciaId: id,
            actorId: usuario.id,
            motivo: comentarios,
            departamentoAnteriorId: actual.departmentId,
            equipoAnteriorId: actual.teamId,
            tecnicoAnteriorId: actual.technicianId,
            departamentoNuevoId: departmentId,
            equipoNuevoId: teamId,
            tecnicoNuevoId: technicianId,
          },
        });
        if (actual.status !== 'assigned')
          await tx.cambioEstado.create({
            data: {
              incidenciaId: id,
              actorId: usuario.id,
              nuevoEstado: 'assigned',
              motivo: comentarios ?? 'Asignación de incidencia',
            },
          });
        return tx.incident.findUnique({
          where: { id },
          include: incluirAgregado,
        });
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
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
    usuario: UsuarioIncidencias,
  ): Promise<Incident> {
    if (!entrada.cause.trim())
      throw new BadRequestException('El motivo es obligatorio');
    const id = idIncidencia.toLowerCase();
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const actual = await tx.incident.findUnique({ where: { id } });
        if (!actual) throw new NotFoundException('La incidencia no existe');
        const destinos: Record<PrismaIncident['status'], readonly string[]> = {
          reported: ['validated', 'rejected'],
          validated: [],
          rejected: [],
          assigned: ['in_progress'],
          in_progress: ['resolved'],
          resolved: ['closed', 'reopened'],
          closed: ['reopened'],
          reopened: [],
        };
        if (!destinos[actual.status].includes(entrada.status))
          throw new ConflictException('Transición de estado no permitida');
        const administracion = ['admin', 'administrative'].includes(
          usuario.role,
        );
        const departamento =
          usuario.role === 'department' &&
          !!usuario.departamentoId &&
          usuario.departamentoId === actual.departmentId;
        const tecnico =
          usuario.id === actual.technicianId &&
          !!usuario.equipoId &&
          usuario.equipoId === actual.teamId &&
          usuario.esTecnico === true;
        const permitida = ['in_progress', 'resolved'].includes(entrada.status)
          ? tecnico
          : actual.status === 'reported' || actual.status === 'closed'
            ? administracion
            : administracion || departamento;
        if (!permitida)
          throw new ForbiddenException('No puede realizar esta transición');
        const cambios = await tx.incident.updateMany({
          where: {
            id,
            status: actual.status,
            departmentId: actual.departmentId,
            teamId: actual.teamId,
            technicianId: actual.technicianId,
          },
          data: { status: entrada.status },
        });
        if (cambios.count !== 1)
          throw new ConflictException(
            'La incidencia cambió durante la operación',
          );
        await tx.cambioEstado.create({
          data: {
            incidenciaId: id,
            actorId: usuario.id,
            nuevoEstado: entrada.status,
            motivo: entrada.cause.trim(),
          },
        });
        return tx.incident.findUnique({
          where: { id },
          include: incluirAgregado,
        });
      });
      if (!resultado) throw new NotFoundException('La incidencia no existe');
      return this.serializar(resultado);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw this.errorPersistencia('cambiar el estado de la incidencia');
    }
  }

  async consultarCambiosAsignacion(
    id: string,
    usuario: UsuarioIncidencias,
  ): Promise<CambioAsignacionModel[]> {
    await this.findOne(id, usuario);
    try {
      return await this.prisma.cambioAsignacion.findMany({
        where: { incidenciaId: id.toLowerCase() },
        orderBy: [{ fechaCreacion: 'asc' }, { id: 'asc' }],
      });
    } catch {
      throw this.errorPersistencia('consultar el historial de asignaciones');
    }
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
    return this.guardarCambioPrioridad(idIncidencia, entrada, idActor, true);
  }

  async cambiarPrioridadAutomatica(
    idIncidencia: string,
    entrada: CambiarPrioridadIncidenciaInput,
  ): Promise<Incident> {
    return this.guardarCambioPrioridad(idIncidencia, entrada, null, false);
  }

  private async guardarCambioPrioridad(
    idIncidencia: string,
    entrada: CambiarPrioridadIncidenciaInput,
    idActor: string | null,
    esManual: boolean,
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
      actorId: idActor?.toLowerCase() ?? null,
      nuevaPrioridad: entrada.priority,
      motivo: entrada.cause.trim(),
      esManual,
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
        error instanceof ConflictException ||
        error instanceof ForbiddenException
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
    if (!incident.location)
      throw this.errorPersistencia('leer una incidencia sin ubicación');
    return {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      civicId: incident.civicId,
      categoryId: incident.categoryId,
      category: incident.categoria?.name ?? null,
      urbanAssetId: incident.urbanAssetId,
      departmentId: incident.departmentId,
      teamId: incident.teamId,
      technicianId: incident.technicianId,
      status: incident.status,
      priority: incident.priority,
      createdAt: incident.createdAt.toISOString(),
      location: {
        latitude: incident.location.latitude,
        longitude: incident.location.longitude,
        accuracy: incident.location?.accuracy ?? null,
        createdAt: (
          incident.location?.createdAt ?? incident.createdAt
        ).toISOString(),
        address: incident.location?.address
          ? {
              street: incident.location.address.street,
              zipCode: incident.location.address.zipCode,
              district: incident.location.address.district,
            }
          : null,
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
