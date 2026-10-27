import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  rm,
  writeFile,
  realpath,
  stat,
  readFile,
} from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { IncidentImage, UploadedImageFile } from './incident.js';

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const formatoUuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function nombreArchivoImagen(
  imagen: Pick<IncidentImage, 'id' | 'mimeType'>,
): string {
  if (
    !formatoUuid.test(imagen.id) ||
    !Object.hasOwn(extensions, imagen.mimeType)
  ) {
    throw new NotFoundException('La imagen no existe');
  }
  return imagen.id + '.' + extensions[imagen.mimeType];
}

export function uploadsRoot(): string {
  return resolve(
    process.env.UPLOADS_DIRECTORY ?? join(process.cwd(), 'uploads'),
  );
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

  async leer(incidenciaId: string, imagen: IncidentImage): Promise<Buffer> {
    if (!formatoUuid.test(incidenciaId))
      throw new NotFoundException('La imagen no existe');
    const nombre = nombreArchivoImagen(imagen);
    try {
      const raiz = await realpath(uploadsRoot());
      const archivo = await realpath(
        join(this.directory(incidenciaId), nombre),
      );
      const rutaRelativa = relative(raiz, archivo);
      if (
        rutaRelativa === '..' ||
        rutaRelativa.startsWith('..' + sep) ||
        isAbsolute(rutaRelativa)
      ) {
        throw new NotFoundException('La imagen no existe');
      }
      if (!(await stat(archivo)).isFile())
        throw new NotFoundException('La imagen no existe');
      return await readFile(archivo);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR')
      ) {
        throw new NotFoundException('La imagen no existe');
      }
      throw new InternalServerErrorException('No se pudo leer la imagen');
    }
  }

  async remove(incidentId: string): Promise<void> {
    await rm(this.directory(incidentId), { recursive: true, force: true });
  }

  private directory(incidentId: string): string {
    return join(uploadsRoot(), 'incidents', incidentId);
  }
}
