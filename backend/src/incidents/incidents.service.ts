import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CambiarEstadoIncidenciaInput,
  CambiarPrioridadIncidenciaInput,
  CreateIncidentInput,
  Incident,
  ResumenIncidencia,
  StoredIncident,
  UploadedImageFile,
} from './incident.js';
import type {
  CambioEstadoModel,
  CambioPrioridadModel,
} from '../generated/prisma/models.js';
import { UploadStorageService } from './upload-storage.service.js';

@Injectable()
export class IncidentsService {
  // ponytail: process-local records are lost on restart; use database persistence when configured.
  private readonly incidents = new Map<string, StoredIncident>();

  constructor(private readonly uploadStorage: UploadStorageService) {}

  async create(
    input: CreateIncidentInput,
    files: UploadedImageFile[],
  ): Promise<Incident> {
    const id = randomUUID();
    let images;
    try {
      images = await this.uploadStorage.save(id, files);
    } catch (error) {
      await this.uploadStorage.remove(id);
      throw error;
    }

    const createdAt = new Date();
    const incident: StoredIncident = {
      id,
      title: input.title,
      description: input.description ?? null,
      civicId: input.civicId,
      categoryId: input.categoryId ?? null,
      category: input.category ?? null,
      urbanAssetId: input.urbanAssetId ?? null,
      location: {
        incidentId: id,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracy: input.accuracy ?? null,
        createdAt,
      },
      images: images.map((image) => ({
        ...image,
        incidentId: id,
        createdAt: new Date(image.createdAt),
      })),
      cambiosEstado: [],
      cambiosPrioridad: [],
      status: 'reported',
      priority: 'low',
      createdAt,
    };

    this.incidents.set(incident.id, incident);
    return this.copy(incident);
  }

  listarPorCiudadano(idCiudadano: string): ResumenIncidencia[] {
    const ciudadanoNormalizado = idCiudadano.toLowerCase();
    return Array.from(this.incidents.values())
      .filter(
        (incidencia) =>
          incidencia.civicId.toLowerCase() === ciudadanoNormalizado,
      )
      .sort(
        (primera, segunda) =>
          segunda.createdAt.getTime() - primera.createdAt.getTime() ||
          primera.id.localeCompare(segunda.id),
      )
      .map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt: createdAt.toISOString(),
      }));
  }

  findOne(id: string): Incident {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new NotFoundException(`Incident ${id} was not found`);
    }
    return this.copy(incident);
  }

  cambiarEstado(
    idIncidencia: string,
    entrada: CambiarEstadoIncidenciaInput,
  ): Incident {
    const incidencia = this.obtenerIncidencia(idIncidencia);
    if (
      (entrada.status !== 'validated' && entrada.status !== 'rejected') ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'El estado debe ser validated o rejected y el motivo no puede estar vacío',
      );
    }
    if (incidencia.status !== 'reported') {
      throw new ConflictException(
        'Solo se puede validar o rechazar una incidencia en estado reported',
      );
    }
    const cambio: CambioEstadoModel = {
      id: randomUUID(),
      incidenciaId: incidencia.id,
      actorId: entrada.civicId.toLowerCase(),
      nuevoEstado: entrada.status,
      motivo: entrada.cause.trim(),
      fechaCreacion: new Date(),
    };
    const actualizada: StoredIncident = {
      ...incidencia,
      status: entrada.status,
      cambiosEstado: [...incidencia.cambiosEstado, cambio],
    };
    // Construir también la respuesta antes de publicar: un fallo no deja cambios parciales.
    const respuesta = this.copy(actualizada);
    this.incidents.set(incidencia.id, actualizada);
    return respuesta;
  }

  consultarCambiosEstado(idIncidencia: string): CambioEstadoModel[] {
    return this.obtenerIncidencia(idIncidencia).cambiosEstado.map((cambio) => ({
      ...cambio,
      fechaCreacion: new Date(cambio.fechaCreacion),
    }));
  }

  cambiarPrioridad(
    idIncidencia: string,
    entrada: CambiarPrioridadIncidenciaInput,
  ): Incident {
    const incidencia = this.obtenerIncidencia(idIncidencia);
    if (
      !['low', 'medium', 'high'].includes(entrada.priority) ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'La prioridad debe ser Baja (low), Media (medium) o Alta (high) y el motivo no puede estar vacío',
      );
    }
    if (incidencia.status !== 'validated') {
      throw new ConflictException(
        'Solo se puede asignar prioridad a una incidencia validada',
      );
    }
    const cambio: CambioPrioridadModel = {
      id: randomUUID(),
      esManual: true,
      nuevaPrioridad: entrada.priority,
      motivo: entrada.cause.trim(),
      fechaCreacion: new Date(),
      incidenciaId: incidencia.id,
      actorId: entrada.civicId.toLowerCase(),
    };
    const actualizada: StoredIncident = {
      ...incidencia,
      priority: entrada.priority,
      cambiosPrioridad: [...incidencia.cambiosPrioridad, cambio],
    };
    const respuesta = this.copy(actualizada);
    this.incidents.set(incidencia.id, actualizada);
    return respuesta;
  }

  consultarCambiosPrioridad(idIncidencia: string): CambioPrioridadModel[] {
    return this.obtenerIncidencia(idIncidencia).cambiosPrioridad.map(
      (cambio) => ({
        ...cambio,
        fechaCreacion: new Date(cambio.fechaCreacion),
      }),
    );
  }

  private obtenerIncidencia(idIncidencia: string): StoredIncident {
    const incidencia = this.incidents.get(idIncidencia.toLowerCase());
    if (!incidencia) throw new NotFoundException('La incidencia no existe');
    return incidencia;
  }

  private copy(incident: StoredIncident): Incident {
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
        latitude: incident.location.latitude,
        longitude: incident.location.longitude,
        accuracy: incident.location.accuracy,
        createdAt: incident.location.createdAt.toISOString(),
      },
      images: incident.images.map((image) => ({
        id: image.id,
        url: image.url,
        mimeType: image.mimeType,
        createdAt: image.createdAt.toISOString(),
      })),
    };
  }
}
