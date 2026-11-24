import type { IncidentModel as PrismaIncident } from '../generated/prisma/models.js';
import type { AddressDistrict } from '../generated/prisma/enums.js';

export interface IncidentAddress {
  street: string;
  zipCode: string;
  district: AddressDistrict;
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
  address?: IncidentAddress;
}

export type CrearIncidenciaBody = Omit<CreateIncidentInput, 'civicId'>;

export interface ImagenIncidencia {
  id: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  urbanAssetId: string | null;
  departmentId: string | null;
  teamId: string | null;
  technicianId: string | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    createdAt: string;
    address: IncidentAddress | null;
  };
  images: ImagenIncidencia[];
  status: PrismaIncident['status'];
  priority: PrismaIncident['priority'];
  createdAt: string;
}

export type CambioAsignacionIncidencia = Partial<
  Pick<Incident, 'departmentId' | 'teamId' | 'technicianId'>
> & { cause?: string };

export interface OpcionesAsignacion {
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string }[];
  technicians: { id: string; name: string; teamId: string }[];
}

export type ResumenIncidencia = Pick<
  Incident,
  'id' | 'title' | 'status' | 'createdAt'
>;

export interface CursorIncidencias {
  id: string;
  createdAt: string;
  pagina: number;
  civicId: string | null;
}

export interface PaginaIncidencias {
  items: ResumenIncidencia[];
  limit: number;
  pagina: number;
  nextCursor: string | null;
}

export interface CambiarEstadoIncidenciaInput {
  status: Exclude<Incident['status'], 'reported'>;
  cause: string;
}

export interface CambiarPrioridadIncidenciaInput {
  priority: Incident['priority'];
  cause: string;
}
