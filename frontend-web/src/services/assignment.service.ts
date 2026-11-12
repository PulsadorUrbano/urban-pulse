import { resolveBackendApiUrl } from '../constants/config';
import type { AssignmentOptions, AssignmentPatch } from '../types/assignment';
import type { IncidentDetail } from '../types/incident';
import {
  bearerHeader,
  buildBackendRejectionMessage,
  extractBackendErrorMessage,
  fetchWithTimeout,
  isBackendUnavailable,
  isRecord,
  readJson,
  RequestTimeoutError,
} from './http';
import { BackendUnavailableError, fetchIncidentById, IncidentNotFoundError, isIncidentDetail } from './incident.service';

const endpoint = (): string => `${resolveBackendApiUrl()}/incidents`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export class AssignmentAccessError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? 'La sesión ya no es válida. Inicia sesión de nuevo.' : 'No tienes permiso para asignar incidencias.');
    this.name = 'AssignmentAccessError';
  }
}

export class AssignmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssignmentConflictError';
  }
}

function isNamedOption(value: unknown): value is { id: string; name: string } {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

export function isAssignmentOptions(value: unknown): value is AssignmentOptions {
  return isRecord(value)
    && Array.isArray(value.departments) && value.departments.every(isNamedOption)
    && Array.isArray(value.teams) && value.teams.every((team: unknown) => isNamedOption(team) && 'departmentId' in team && typeof team.departmentId === 'string')
    && Array.isArray(value.technicians) && value.technicians.every((technician: unknown) => isNamedOption(technician) && 'teamId' in technician && typeof technician.teamId === 'string');
}

async function request(url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, init);
  } catch (error) {
    if (error instanceof RequestTimeoutError) throw new BackendUnavailableError('El backend tardó demasiado en responder.');
    throw new BackendUnavailableError();
  }
  if (isBackendUnavailable(response)) throw new BackendUnavailableError();
  return response;
}

function checkAccess(response: Response): void {
  if (response.status === 401 || response.status === 403) throw new AssignmentAccessError(response.status);
}

export async function fetchAssignmentOptions(token: string): Promise<AssignmentOptions> {
  const response = await request(`${endpoint()}/assignment-options`, {
    method: 'GET',
    headers: bearerHeader(token),
  });
  checkAccess(response);
  if (!response.ok) throw new Error(await buildBackendRejectionMessage(response, 'No se pudo cargar el catálogo de asignación.'));
  return readJson(response, isAssignmentOptions, 'GET /incidents/assignment-options');
}

export async function loadBackendAssignment(id: string, token: string): Promise<{ incident: IncidentDetail; options: AssignmentOptions }> {
  const [incident, options] = await Promise.all([fetchIncidentById(id), fetchAssignmentOptions(token)]);
  return { incident, options };
}

export async function saveBackendAssignment(id: string, patch: AssignmentPatch, token: string): Promise<IncidentDetail> {
  if (Object.keys(patch).length === 0) throw new Error('Selecciona un cambio antes de guardar.');
  const response = await request(`${endpoint()}/${encodeURIComponent(id)}/assignment`, {
    method: 'PATCH',
    headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  checkAccess(response);
  if (response.status === 404) throw new IncidentNotFoundError();
  if (response.status === 409) {
    throw new AssignmentConflictError(
      extractBackendErrorMessage(await response.text()) ?? 'La asignación cambió. Recarga la incidencia antes de reintentar.',
    );
  }
  if (!response.ok) throw new Error(await buildBackendRejectionMessage(response, 'No se pudo guardar la asignación.'));
  return readJson(response, isIncidentDetail, 'PATCH /incidents/:id/assignment');
}

export async function loadDemoAssignment(id: string): Promise<{ incident: IncidentDetail; options: AssignmentOptions }> {
  if (!import.meta.env.DEV) throw new Error('La demostración solo está disponible en desarrollo.');
  const demo = await import('../mocks/assignment-mock');
  return demo.loadMockAssignment(id);
}

export async function startDemoAssignment(): Promise<{ incident: IncidentDetail; options: AssignmentOptions }> {
  if (!import.meta.env.DEV) throw new Error('La demostración solo está disponible en desarrollo.');
  const demo = await import('../mocks/assignment-mock');
  return demo.loadMockAssignment(demo.MOCK_INCIDENT_ID);
}

export async function saveDemoAssignment(patch: AssignmentPatch): Promise<IncidentDetail> {
  if (!import.meta.env.DEV) throw new Error('La demostración solo está disponible en desarrollo.');
  if (Object.keys(patch).length === 0) throw new Error('Selecciona un cambio antes de guardar.');
  const demo = await import('../mocks/assignment-mock');
  return demo.saveMockAssignment(patch);
}
