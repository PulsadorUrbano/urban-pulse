import type {
  CambioEstadoModel,
  IncidentModel as PrismaIncident,
  IncidentLocationModel as PrismaIncidentLocation,
  IncidentImageModel as PrismaIncidentImage,
} from '../generated/prisma/models.js';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface IncidentImage {
  id: string;
  url: string;
  mimeType: UploadedImageFile['mimetype'];
  createdAt: string;
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
  images: IncidentImage[];
  status: PrismaIncident['status'];
  priority: 'low';
  createdAt: string;
}

// Generated Prisma records only; this aggregate is kept in memory, not in a database.
export type StoredIncident = PrismaIncident & {
  cambiosEstado: CambioEstadoModel[];
  location: PrismaIncidentLocation;
  images: (PrismaIncidentImage & { mimeType: UploadedImageFile['mimetype'] })[];
};

export type ResumenIncidencia = Pick<
  Incident,
  'id' | 'title' | 'status' | 'createdAt'
>;

export interface CambiarEstadoIncidenciaInput {
  status: Exclude<Incident['status'], 'reported'>;
  cause: string;
  civicId: string;
}
