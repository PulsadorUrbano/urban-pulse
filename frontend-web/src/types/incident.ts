// Contrato de datos de las incidencias, alineado con backend/src/incidents/incident.ts y con
// frontend-mobile/src/types/incident.ts (IncidentDetail, CreatedIncidentImage, IncidentSummary).

// Estados que el backend gestiona hoy (enum IncidentStatus de schema.prisma).
// El móvil declara además assigned, in_progress, resolved, reopened y closed, que el backend no emite.
export type IncidentStatus = 'reported' | 'validated' | 'rejected';

// Prioridades del backend (enum IncidentPriority). El móvil declara además `urgent`.
export type IncidentPriority = 'low' | 'medium' | 'high';

// Imagen asociada a una incidencia tal como la devuelve el backend.
// `url` es relativa al backend (p. ej. /uploads/incidents/<id>/<archivo>.jpg).
export interface CreatedIncidentImage {
  id: string;
  url: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  createdAt: string;
}

export interface IncidentLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  createdAt: string;
}

// Detalle completo de una incidencia (GET /incidents/:id y respuestas de PATCH).
export interface IncidentDetail {
  id: string;
  title: string;
  description: string | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  urbanAssetId: string | null;
  location: IncidentLocation;
  images: CreatedIncidentImage[];
  status: IncidentStatus;
  priority: IncidentPriority;
  createdAt: string;
}

// Resumen del listado GET /incidents?civicId=...
export interface IncidentSummary {
  id: string;
  title: string;
  status: IncidentStatus;
  createdAt: string;
}

// Cuerpo de PATCH /incidents/:id/status. `civicId` es el actor declarado (el usuario que valida).
export interface ChangeIncidentStatusInput {
  status: Exclude<IncidentStatus, 'reported'>;
  cause: string;
  civicId: string;
}

// Cuerpo de PATCH /incidents/:id/priority. Solo se admite en incidencias validadas.
export interface ChangeIncidentPriorityInput {
  priority: IncidentPriority;
  cause: string;
  civicId: string;
}

// Decisión del operador en la vista de validación.
export type ValidationDecision = 'validate' | 'reject';

// Motivos de descarte que ofrece la vista; se envían dentro de `cause`.
export const REJECT_REASONS = ['Improcedente', 'Duplicado', 'Fuera de competencia'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];
