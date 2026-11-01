/// <reference types="jest" />
import { fetchWithTimeout, RequestTimeoutError } from '@/services/http';
import { INCIDENTS_ENDPOINT, IncidentNotFoundError, createIncident, fetchIncidentById, fetchMyIncidents } from '@/services/incident.service';

jest.mock('@/services/http', () => {
  const real = jest.requireActual<typeof import('@/services/http')>('@/services/http');
  return { ...real, fetchWithTimeout: jest.fn() };
});

const request = jest.mocked(fetchWithTimeout);
const civicId = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';
const input = { title: 'Farola rota', description: 'No alumbra' };

beforeEach(() => request.mockReset());

it('registra la incidencia solo en el backend', async () => {
  const incident = { id: 'inc-1' };
  request.mockResolvedValue({ ok: true, json: async () => incident } as Response);
  await expect(createIncident(input, civicId)).resolves.toEqual({ incident, source: 'backend' });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(INCIDENTS_ENDPOINT);
  expect(request.mock.calls[0][1]?.method).toBe('POST');
});

it('no guarda una copia local si falla la conexión al crear', async () => {
  request.mockRejectedValue(new Error('Sin red'));
  await expect(createIncident(input, civicId)).rejects.toThrow('No se pudo conectar con el servidor');
  expect(request).toHaveBeenCalledTimes(1);
});

it('consulta el listado solo en el backend', async () => {
  const incidents = [{ id: 'inc-1', title: 'Farola rota', status: 'reported', createdAt: '2026-01-01' }];
  request.mockResolvedValue({ ok: true, json: async () => incidents } as Response);
  await expect(fetchMyIncidents(civicId)).resolves.toEqual({ incidents, source: 'backend' });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(`${INCIDENTS_ENDPOINT}?civicId=${civicId}`);
});

it('no consulta el mock si falla la conexión al listar', async () => {
  request.mockRejectedValue(new RequestTimeoutError());
  await expect(fetchMyIncidents(civicId)).rejects.toThrow(/servidor tard/);
  expect(request).toHaveBeenCalledTimes(1);
});

it('obtiene el detalle solo del backend', async () => {
  const incident = { id: 'inc-1' };
  request.mockResolvedValue({ ok: true, status: 200, json: async () => incident } as Response);
  await expect(fetchIncidentById('inc-1')).resolves.toEqual({ incident, source: 'backend' });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(`${INCIDENTS_ENDPOINT}/inc-1`);
});

it('devuelve error 404 sin consultar almacenamiento local', async () => {
  request.mockResolvedValue({ ok: false, status: 404 } as Response);
  await expect(fetchIncidentById('missing')).rejects.toBeInstanceOf(IncidentNotFoundError);
  expect(request).toHaveBeenCalledTimes(1);
});
