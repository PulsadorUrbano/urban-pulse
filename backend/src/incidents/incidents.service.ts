import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CreateIncidentInput,
  Incident,
  StoredIncident,
  UploadedImageFile,
} from './incident.js';
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
      status: 'reported',
      priority: 'low',
      createdAt,
    };

    this.incidents.set(incident.id, incident);
    return this.copy(incident);
  }

  findOne(id: string): Incident {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new NotFoundException(`Incident ${id} was not found`);
    }
    return this.copy(incident);
  }

  private copy(incident: StoredIncident): Incident {
    return {
      ...incident,
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
