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
