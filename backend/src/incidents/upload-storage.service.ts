import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CloudinaryService } from './cloudinary.service.js';
import type { IncidentImage, UploadedImageFile } from './incident.js';

@Injectable()
export class UploadStorageService {
  private readonly logger = new Logger(UploadStorageService.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async save(
    incidentId: string,
    files: UploadedImageFile[],
  ): Promise<IncidentImage[]> {
    if (files.length === 0) {
      return [];
    }

    const publicIds: string[] = [];
    const images: IncidentImage[] = [];

    try {
      for (const file of files) {
        const id = randomUUID();
        const publicId = `urban-pulse/incidents/${incidentId}/${id}`;
        publicIds.push(publicId);
        const uploaded = await this.cloudinaryService.subirImagen(publicId, file);

        images.push({
          id,
          cloudinaryId: uploaded.cloudinaryId,
          url: uploaded.url,
          mimeType: file.mimetype,
          createdAt: new Date().toISOString(),
        });
      }

      return images;
    } catch (error) {
      await this.eliminarImagenes(publicIds);
      throw error;
    }
  }

  async eliminarImagenes(publicIds: string[]): Promise<string[]> {
    const pendientes: string[] = [];

    for (const publicId of publicIds) {
      try {
        await this.cloudinaryService.eliminarImagen(publicId);
      } catch {
        pendientes.push(publicId);
        this.logger.warn(`No se pudo limpiar la imagen Cloudinary ${publicId}`);
      }
    }

    return pendientes;
  }
}
