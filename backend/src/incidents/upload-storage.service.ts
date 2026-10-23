import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { IncidentImage, UploadedImageFile } from './incident.js';

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export function uploadsRoot(): string {
  return resolve(process.env.UPLOADS_DIRECTORY ?? join(process.cwd(), 'uploads'));
}

@Injectable()
export class UploadStorageService {
  async save(
    incidentId: string,
    files: UploadedImageFile[],
  ): Promise<IncidentImage[]> {
    if (files.length === 0) {
      return [];
    }

    const directory = this.directory(incidentId);
    try {
      await mkdir(directory, { recursive: true });
      const images: IncidentImage[] = [];
      for (const file of files) {
        const id = randomUUID();
        const extension = extensions[file.mimetype as keyof typeof extensions];
        const filename = `${id}.${extension}`;
        await writeFile(join(directory, filename), file.buffer);
        images.push({
          id,
          url: `/uploads/incidents/${incidentId}/${filename}`,
          mimeType: file.mimetype,
          createdAt: new Date().toISOString(),
        });
      }
      return images;
    } catch (error) {
      await this.remove(incidentId);
      throw error;
    }
  }

  async remove(incidentId: string): Promise<void> {
    await rm(this.directory(incidentId), { recursive: true, force: true });
  }

  private directory(incidentId: string): string {
    return join(uploadsRoot(), 'incidents', incidentId);
  }
}
