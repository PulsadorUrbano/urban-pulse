export type IncidentStatus =
  | 'reported'
  | 'rejected'
  | 'validated'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'closed';

export const DEFAULT_INCIDENT_STATUS: IncidentStatus = 'reported';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  createdAt: string;
  civicId: string | null;
  locationId: string | null;
  urbanAssetId: string | null;
  categoryId: string | null;
  category: string | null;
  departmentId: string | null;
  teamId: string | null;
  technicianId: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  categoryId?: string | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

// Imagen asociada a una incidencia en la respuesta del backend.
export interface CreatedIncidentImage {
  id: string;
  url: string;
  mimeType: string;
  createdAt: string;
}

// Respuesta del backend real al crear una incidencia (POST /incidents)
export interface CreatedIncident {
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
  images: CreatedIncidentImage[];
  status: 'reported';
  priority: 'low';
  createdAt: string;
}

// Origen de los datos de incidencias.
export type IncidentSource = 'backend';

export interface CreateIncidentResult {
  incident: CreatedIncident;
  source: IncidentSource;
}

// Resumen de una incidencia tal como lo devuelve el listado GET /incidents?civicId=...
export interface IncidentSummary {
  id: string;
  title: string;
  status: IncidentStatus;
  createdAt: string;
}

// Detalle completo de una incidencia tal como lo devuelve GET /incidents/:id.
// Es un tipo independiente de CreatedIncident (no un alias): representa
// "la incidencia que se consulta", no "la incidencia que se acaba de crear".
export interface IncidentDetail {
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
  images: CreatedIncidentImage[];
  status: IncidentStatus;
  priority: IncidentPriority;
  createdAt: string;
}

// Resultado de fetchMyIncidents.
export interface FetchMyIncidentsResult {
  incidents: IncidentSummary[];
  source: IncidentSource;
}

// Resultado de fetchIncidentById.
export interface FetchIncidentDetailResult {
  incident: IncidentDetail;
  source: IncidentSource;
}
