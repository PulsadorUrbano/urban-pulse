import type { IncidentModel as PrismaIncident } from '../generated/prisma/models.js';

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

export type CrearIncidenciaBody = Omit<CreateIncidentInput, 'civicId'>;

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
  images: [];
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
}

export interface CambiarPrioridadIncidenciaInput {
  priority: Incident['priority'];
  cause: string;
}
