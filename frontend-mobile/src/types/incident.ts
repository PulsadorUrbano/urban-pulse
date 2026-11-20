import type { AuthToken } from './token';

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

// Datos del formulario necesarios para crear una incidencia. Según el contrato
// de la PR #185 del backend, la categoría (del catálogo activo) y las
// coordenadas son obligatorias; ya no se admiten categorías de texto libre.
export interface CreateIncidentInput {
  title: string;
  description: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

// Cuerpo JSON de POST /incidents en el backend real. El ciudadano se deriva
// del JWT, por eso no viaja `civicId`; las fotos se suben después por separado.
export interface BackendCreateIncidentPayload {
  title: string;
  description?: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Payload que el front envía al mock (json-server) al crear una incidencia.
// El mock no tiene autenticación, así que conserva `civicId` para poder
// filtrar después las incidencias propias.
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

// Ubicación asociada a una incidencia tal como la devuelve el backend
export interface IncidentLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  createdAt: string;
}

// Campos comunes a la incidencia recién creada y a la incidencia consultada.
// `status` y `priority` NO se unifican aquí: en CreatedIncident son literales
// ('reported' / 'low', garantizados al crear) y en IncidentDetail son los
// tipos amplios; unificarlos ensancharía lo que ve el resultado de creación.
// `description` sí es común (string | null en ambos).
interface IncidentBase {
  id: string;
  title: string;
  description: string | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  urbanAssetId: string | null;
  location: IncidentLocation;
  images: CreatedIncidentImage[];
  createdAt: string;
}

// Respuesta del backend real al crear una incidencia (POST /incidents)
export interface CreatedIncident extends IncidentBase {
  status: 'reported';
  priority: 'low';
}

// Origen de la incidencia creada: backend real o simulación en el mock
export type IncidentSource = 'backend' | 'mock';

// Autor de la incidencia según la sesión activa: `civicId` se usa en el mock
// (sin autenticación) y `token` autentica la petición contra el backend real.
export interface IncidentAuthor {
  civicId: string;
  token: AuthToken | null;
}

// Resultado de subir las fotos de una incidencia ya creada. La subida nunca
// relanza la creación: si falla, se informa en `errorMessage` y se conservan
// en `pendingImageUris` las fotos que faltan para poder reintentar solo eso.
export interface UploadIncidentImagesResult {
  images: CreatedIncidentImage[];
  pendingImageUris: string[];
  errorMessage: string | null;
}

export interface CreateIncidentResult {
  incident: CreatedIncident;
  source: IncidentSource;
  // Fotos que no se pudieron subir (vacío si todo fue bien o no había fotos).
  pendingImageUris: string[];
  // Motivo del fallo de la subida de fotos, o null si no hubo fallo.
  imagesUploadErrorMessage: string | null;
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
export interface IncidentDetail extends IncidentBase {
  status: IncidentStatus;
  priority: IncidentPriority;
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
