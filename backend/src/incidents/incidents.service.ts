import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateIncidentDto } from './create-incident.dto.js';
import { Incident } from './incident.js';

@Injectable()
export class IncidentsService {
  // ponytail: process-local storage is lost on restart; replace this Map with persistence when database setup is available.
  private readonly incidents = new Map<string, Incident>();

  create(input: CreateIncidentDto): Incident {
    const incident: Incident = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      urbanAssetId: input.urbanAssetId ?? null,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
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
    };
  }
}
