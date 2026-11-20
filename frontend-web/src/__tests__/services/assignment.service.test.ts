import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadMockAssignment, MOCK_INCIDENT_ID } from '../../mocks/assignment-mock';
import {
  AssignmentAccessError,
  AssignmentConflictError,
  fetchAssignmentOptions,
  isAssignmentOptions,
  saveBackendAssignment,
  startDemoAssignment,
} from '../../services/assignment.service';
import { BackendContractError } from '../../services/http';
import { BackendUnavailableError, IncidentNotFoundError } from '../../services/incident.service';

const { incident, options } = loadMockAssignment(MOCK_INCIDENT_ID);
const TOKEN = 'token-prueba';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('assignment.service', () => {
  it('carga solo el catálogo real con Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, options));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAssignmentOptions(TOKEN)).resolves.toEqual(options);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/incidents/assignment-options');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  it('valida la forma de las tres listas y rechaza una respuesta incompleta', async () => {
    expect(isAssignmentOptions(options)).toBe(true);
    expect(isAssignmentOptions({ departments: [], teams: [], technicians: [] })).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { departments: [], teams: [] })));
    await expect(fetchAssignmentOptions(TOKEN)).rejects.toBeInstanceOf(BackendContractError);
  });

  it('distingue una incidencia que ya no existe al guardar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(404, { message: 'No existe' })));
    await expect(saveBackendAssignment(MOCK_INCIDENT_ID, { teamId: null }, TOKEN))
      .rejects.toBeInstanceOf(IncidentNotFoundError);
  });

  it('envía solo los campos del parche y conserva null explícito', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ...incident, departmentId: null }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveBackendAssignment(MOCK_INCIDENT_ID, { departmentId: null }, TOKEN))
      .resolves.toEqual({ ...incident, departmentId: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/incidents/${MOCK_INCIDENT_ID}/assignment`);
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual({ Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ departmentId: null });
  });

  it('no envía un parche vacío', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveBackendAssignment(MOCK_INCIDENT_ID, {}, TOKEN)).rejects.toThrow('Selecciona un cambio');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía el equipo actual en una reasignación y devuelve la incidencia asignada del servidor', async () => {
    const { departmentId, id: teamId } = options.teams[0];
    const assigned = { ...incident, status: 'assigned', departmentId, teamId };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, assigned));
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveBackendAssignment(incident.id, { teamId }, TOKEN)).resolves.toEqual(assigned);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/incidents/${incident.id}/assignment`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ teamId }) }),
    );
  });

  it.each([401, 403] as const)('distingue HTTP %s y no lo convierte en modo demo', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(status, { message: 'Sin acceso' })));
    await expect(fetchAssignmentOptions(TOKEN)).rejects.toMatchObject({ name: AssignmentAccessError.name, status });
  });

  it.each([[403, AssignmentAccessError], [409, AssignmentConflictError]] as const)(
    'señala el error %s al reasignar sin guardar un cambio simulado', async (status, error) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(status, { message: 'Guardado rechazado' })));
      await expect(saveBackendAssignment(MOCK_INCIDENT_ID, { teamId: options.teams[0].id }, TOKEN))
        .rejects.toBeInstanceOf(error);
      expect(loadMockAssignment(MOCK_INCIDENT_ID).incident.teamId).toBeNull();
    },
  );

  it('informa de caída del backend sin fingir persistencia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));
    await expect(saveBackendAssignment(MOCK_INCIDENT_ID, { departmentId: options.departments[0].id }, TOKEN))
      .rejects.toBeInstanceOf(BackendUnavailableError);
    expect(loadMockAssignment(MOCK_INCIDENT_ID).incident.departmentId).toBeNull();
  });

  it('ofrece demostración solo en desarrollo', async () => {
    vi.stubEnv('DEV', true);
    await expect(startDemoAssignment()).resolves.toMatchObject({ incident: { id: MOCK_INCIDENT_ID } });
    vi.stubEnv('DEV', false);
    await expect(startDemoAssignment()).rejects.toThrow('solo está disponible en desarrollo');
  });
});
