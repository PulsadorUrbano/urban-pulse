import type { IncidentModel as PrismaIncident } from '../generated/prisma/models.js';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface IncidentImage {
  id: string;
  cloudinaryId: string;
  url: string;
  mimeType: UploadedImageFile['mimetype'];
  createdAt: string;
}

export type PublicIncidentImage = Omit<IncidentImage, 'cloudinaryId'>;

export function serializarImagenPublica(
  image: IncidentImage,
): PublicIncidentImage {
  return {
    id: image.id,
    url: image.url,
    mimeType: image.mimeType,
    createdAt: image.createdAt,
  };
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  civicId: string;
  categoryId?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  urbanAssetId?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  urbanAssetId: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    createdAt: string;
  };
  images: PublicIncidentImage[];
  status: PrismaIncident['status'];
  priority: PrismaIncident['priority'];
  createdAt: string;
}

export type ResumenIncidencia = Pick<
  Incident,
  'id' | 'title' | 'status' | 'createdAt'
>;

export interface CambiarEstadoIncidenciaInput {
  status: Exclude<Incident['status'], 'reported'>;
  cause: string;
  civicId: string;
}

export interface CambiarPrioridadIncidenciaInput {
  priority: Incident['priority'];
  cause: string;
  civicId: string;
}
