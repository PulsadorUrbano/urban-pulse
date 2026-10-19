import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateIncidentInput, Incident, UploadedImageFile } from './incident.js';
import { UploadStorageService } from './upload-storage.service.js';

@Injectable()
export class IncidentsService {
  // ponytail: process-local storage is lost on restart; replace this Map with persistence when database setup is available.
  private readonly incidents = new Map<string, Incident>();

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

    const incident: Incident = {
      id,
      title: input.title,
      description: input.description ?? null,
      civicId: input.civicId,
      categoryId: input.categoryId ?? null,
      category: input.category ?? null,
      urbanAssetId: input.urbanAssetId ?? null,
      location: {
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracy: input.accuracy ?? null,
        createdAt: new Date().toISOString(),
      },
      images,
      status: 'reported',
      priority: 'low',
      createdAt: new Date().toISOString(),
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

  private copy(incident: Incident): Incident {
    return {
      ...incident,
      location: { ...incident.location },
      images: incident.images.map((image) => ({ ...image })),
    };
  }
}
