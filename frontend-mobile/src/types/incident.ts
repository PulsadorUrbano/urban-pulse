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

// Payload que el front envía al mock (json-server) al crear una incidencia
export interface IncidentPayload {
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  status: IncidentStatus;
  createdAt: string;
}

// Imagen asociada a una incidencia tal como la devuelve el backend
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

// Origen de la incidencia creada: backend real o simulación en el mock
export type IncidentSource = 'backend' | 'mock';

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

// Resultado de fetchMyIncidents: incluye el origen de los datos (backend real o mock)
// para que la UI pueda mostrar el aviso de fallback cuando corresponda
export interface FetchMyIncidentsResult {
  incidents: IncidentSummary[];
  source: IncidentSource;
}

// Resultado de fetchIncidentById: incluye el origen de los datos, mismo motivo que arriba
export interface FetchIncidentDetailResult {
  incident: IncidentDetail;
  source: IncidentSource;
}
