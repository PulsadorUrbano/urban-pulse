// Incidencias del panel web contra el backend real (backend/src/incidents/incidents.controller.ts).
// Mismos nombres de función y errores que frontend-mobile/src/services/incident.service.ts.
import { resolveBackendApiUrl } from '../constants/config';
import type {
  ChangeIncidentPriorityInput,
  ChangeIncidentStatusInput,
  CreatedIncidentImage,
  IncidentDetail,
  IncidentLocation,
  IncidentPriority,
  IncidentStatus,
} from '../types/incident';
import {
  buildBackendRejectionMessage,
  extractBackendErrorMessage,
  fetchWithTimeout,
  isBackendUnavailable,
  isRecord,
  readJson,
  RequestTimeoutError,
} from './http';

const incidentsEndpoint = (): string => `${resolveBackendApiUrl()}/incidents`;

const INCIDENT_STATUSES: readonly IncidentStatus[] = ['reported', 'validated', 'rejected', 'assigned'];
const INCIDENT_PRIORITIES: readonly IncidentPriority[] = ['low', 'medium', 'high'];
const IMAGE_MIME_TYPES: readonly CreatedIncidentImage['mimeType'][] = ['image/jpeg', 'image/png', 'image/webp'];

// La incidencia no existe (404). Nunca se reintenta ni se simula.
export class IncidentNotFoundError extends Error {
  constructor(message = 'La incidencia solicitada no existe.') {
    super(message);
    this.name = 'IncidentNotFoundError';
  }
}

// El backend rechaza el cambio por el estado actual de la incidencia (409).
export class IncidentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncidentConflictError';
  }
}

// No hay conexión con el backend (error de red, timeout o 502/503/504 del proxy).
export class BackendUnavailableError extends Error {
  constructor(message = 'No se ha podido conectar con el backend. Inténtalo de nuevo cuando esté disponible.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIncidentLocation(value: unknown): value is IncidentLocation {
  return (
    isRecord(value) &&
    isNullableNumber(value.latitude) &&
    isNullableNumber(value.longitude) &&
    isNullableNumber(value.accuracy) &&
    typeof value.createdAt === 'string'
  );
}

function isIncidentImage(value: unknown): value is CreatedIncidentImage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.url === 'string' &&
    typeof value.mimeType === 'string' &&
    (IMAGE_MIME_TYPES as readonly string[]).includes(value.mimeType) &&
    typeof value.createdAt === 'string'
  );
}

export function isIncidentDetail(value: unknown): value is IncidentDetail {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isNullableString(value.description) &&
    typeof value.civicId === 'string' &&
    isNullableString(value.categoryId) &&
    isNullableString(value.category) &&
    isNullableString(value.urbanAssetId) &&
    isNullableString(value.departmentId) &&
    isNullableString(value.teamId) &&
    isNullableString(value.technicianId) &&
    isIncidentLocation(value.location) &&
    Array.isArray(value.images) &&
    value.images.every(isIncidentImage) &&
    typeof value.status === 'string' &&
    (INCIDENT_STATUSES as readonly string[]).includes(value.status) &&
    typeof value.priority === 'string' &&
    (INCIDENT_PRIORITIES as readonly string[]).includes(value.priority) &&
    typeof value.createdAt === 'string'
  );
}

async function sendToBackend(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, init);
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new BackendUnavailableError('El backend tardó demasiado en responder. Inténtalo de nuevo.');
    }
    throw new BackendUnavailableError();
  }
  if (isBackendUnavailable(response)) {
    throw new BackendUnavailableError();
  }
  return response;
}

// Obtiene el detalle de una incidencia (GET /incidents/:id).
export async function fetchIncidentById(id: string): Promise<IncidentDetail> {
  const response = await sendToBackend(`${incidentsEndpoint()}/${encodeURIComponent(id)}`, { method: 'GET' });

  if (response.status === 404) throw new IncidentNotFoundError();
  if (!response.ok) {
    throw new Error(await buildBackendRejectionMessage(response, 'No se pudo obtener la incidencia.'));
  }
  return readJson(response, isIncidentDetail, 'GET /incidents/:id');
}

async function patchIncident(
  id: string,
  path: 'status' | 'priority',
  body: ChangeIncidentStatusInput | ChangeIncidentPriorityInput,
  genericMessage: string,
): Promise<IncidentDetail> {
  const response = await sendToBackend(`${incidentsEndpoint()}/${encodeURIComponent(id)}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 404) throw new IncidentNotFoundError();
  if (response.status === 409) {
    const backendMessage = extractBackendErrorMessage(await response.text());
    throw new IncidentConflictError(backendMessage ?? genericMessage);
  }
  if (!response.ok) {
    throw new Error(await buildBackendRejectionMessage(response, genericMessage));
  }
  return readJson(response, isIncidentDetail, `PATCH /incidents/:id/${path}`);
}

// Valida o rechaza una incidencia con motivo (PATCH /incidents/:id/status).
export function changeIncidentStatus(id: string, input: ChangeIncidentStatusInput): Promise<IncidentDetail> {
  return patchIncident(id, 'status', input, 'No se pudo cambiar el estado de la incidencia.');
}

// Asigna la prioridad de una incidencia validada (PATCH /incidents/:id/priority).
export function changeIncidentPriority(id: string, input: ChangeIncidentPriorityInput): Promise<IncidentDetail> {
  return patchIncident(id, 'priority', input, 'No se pudo asignar la prioridad de la incidencia.');
}
