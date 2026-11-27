import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveBackendAssetUrl } from '../../constants/config';
import { BackendContractError } from '../../services/http';
import {
  BackendUnavailableError,
  changeIncidentPriority,
  changeIncidentStatus,
  fetchIncidentPage,
  fetchIncidentCategories,
  fetchIncidentById,
  IncidentConflictError,
  IncidentNotFoundError,
} from '../../services/incident.service';
import type { IncidentDetail, IncidentPageFilters } from '../../types/incident';

const INCIDENT_ID = '0b6a3b8e-6f1d-4a43-9c55-0d2e6e1b7a10';
const TOKEN = 'token-prueba';
const NEW_INCIDENT_STATUSES = ['in_progress', 'resolved', 'reopened', 'closed'] as const;

const incident: IncidentDetail = {
  id: INCIDENT_ID,
  title: 'Farola apagada',
  description: 'La farola no ilumina la calle.',
  civicId: '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6',
  categoryId: null,
  category: 'Iluminación',
  urbanAssetId: null,
  departmentId: null,
  teamId: null,
  technicianId: null,
  location: { latitude: 36.7213, longitude: -4.4214, accuracy: 8.5, createdAt: '2026-11-07T10:00:00.000Z' },
  images: [
    { id: 'img-1', url: `/uploads/incidents/${INCIDENT_ID}/img-1.png`, mimeType: 'image/png', createdAt: '2026-11-07T10:00:00.000Z' },
  ],
  status: 'reported',
  priority: 'low',
  createdAt: '2026-11-07T10:00:00.000Z',
};

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('incident.service', () => {
  it.each<IncidentPageFilters>([
    {},
    { priority: 'high' },
    { categoryId: INCIDENT_ID },
    { priority: 'medium', categoryId: INCIDENT_ID },
    { status: 'assigned' },
    { from: '2026-11-01', to: '2026-11-30' },
    { order: 'oldest' },
    { status: 'reopened', from: '2026-11-01', order: 'oldest', priority: 'high', categoryId: INCIDENT_ID },
  ])('envía los filtros al servidor y los conserva al continuar: %j', async (filters) => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, [])));
    vi.stubGlobal('fetch', fetchMock);

    await fetchIncidentPage(TOKEN, undefined, filters);
    await fetchIncidentPage(TOKEN, 'cursor+/=', filters);

    for (const [index, call] of fetchMock.mock.calls.entries()) {
      const url = new URL(String(call[0]), 'http://localhost');
      expect(url.searchParams.get('priority')).toBe(filters.priority ?? null);
      expect(url.searchParams.get('categoryId')).toBe(filters.categoryId ?? null);
      expect(url.searchParams.get('status')).toBe(filters.status ?? null);
      expect(url.searchParams.get('from')).toBe(filters.from ?? null);
      expect(url.searchParams.get('to')).toBe(filters.to ?? null);
      expect(url.searchParams.get('order')).toBe(filters.order ?? null);
      expect(url.searchParams.get('cursor')).toBe(index ? 'cursor+/=' : null);
      expect([...url.searchParams.keys()].sort()).toEqual([
        ...Object.keys(filters), ...(index ? ['cursor'] : []),
      ].sort());
    }
  });

  it('obtiene el catálogo real sin solicitar detalles de incidencias', async () => {
    const categories = [{ id: INCIDENT_ID, name: 'Iluminación', createdAt: incident.createdAt }];
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, categories));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIncidentCategories()).resolves.toEqual(categories);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/categories');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('admite un catálogo vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, [])));
    await expect(fetchIncidentCategories()).resolves.toEqual([]);
  });

  it.each([
    {},
    [{ name: 'Iluminación', createdAt: incident.createdAt }],
    [{ id: 'id-inválido', name: 'Iluminación', createdAt: incident.createdAt }],
    [{ id: INCIDENT_ID, name: '', createdAt: incident.createdAt }],
    [{ id: INCIDENT_ID, name: 'Iluminación', createdAt: 'ayer' }],
  ])('rechaza un catálogo que no cumple el contrato: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, body)));
    await expect(fetchIncidentCategories()).rejects.toBeInstanceOf(BackendContractError);
  });

  it('propaga el rechazo y la falta de conexión del catálogo sin simular categorías', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(400, { message: 'Catálogo no disponible' })));
    await expect(fetchIncidentCategories()).rejects.toThrow('Catálogo no disponible');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));
    await expect(fetchIncidentCategories()).rejects.toBeInstanceOf(BackendUnavailableError);
  });

  it('obtiene la primera página autenticada y devuelve el siguiente cursor', async () => {
    const { id, title, status, createdAt } = incident;
    const items = [{ id, title, status, createdAt }];
    const response = jsonResponse(200, items);
    response.headers.set('X-Next-Cursor', 'siguiente');
    const fetchMock = vi.fn().mockResolvedValueOnce(response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIncidentPage(TOKEN)).resolves.toEqual({ items, nextCursor: 'siguiente' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/incidents');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('admite una página con estados anteriores y nuevos', async () => {
    const { title, createdAt } = incident;
    const items = [incident.status, ...NEW_INCIDENT_STATUSES].map((status, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index}`, title, status, createdAt,
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, items)));

    await expect(fetchIncidentPage(TOKEN)).resolves.toEqual({ items, nextCursor: null });
  });

  it('codifica el cursor y admite una última página vacía', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIncidentPage(TOKEN, 'a+/=')).resolves.toEqual({ items: [], nextCursor: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/incidents?cursor=a%2B%2F%3D');
  });

  it('rechaza un resumen de incidencia inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, [{ ...incident, status: 'unknown' }])));

    await expect(fetchIncidentPage(TOKEN)).rejects.toBeInstanceOf(BackendContractError);
  });

  it('muestra el rechazo del backend al cargar el listado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(403, { message: 'Acceso denegado' })));

    await expect(fetchIncidentPage(TOKEN)).rejects.toThrow('Acceso denegado');
  });

  it('obtiene el detalle de una incidencia del backend', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, incident));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).resolves.toEqual(incident);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/incidents/${INCIDENT_ID}`);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-prueba');
  });

  it.each(NEW_INCIDENT_STATUSES)('admite el estado %s en el detalle', async (status) => {
    const detail = { ...incident, status };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, detail)));

    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).resolves.toEqual(detail);
  });

  it('traduce un 404 a IncidentNotFoundError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(404, { message: 'Not Found' })));

    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).rejects.toBeInstanceOf(IncidentNotFoundError);
  });

  it('muestra el mensaje del backend ante un 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(400, { message: 'Validation failed (uuid is expected)' })));

    await expect(fetchIncidentById('no-es-uuid', TOKEN)).rejects.toThrow('uuid is expected');
  });

  it('rechaza una respuesta que no cumple el contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { ...incident, technicianId: undefined })));

    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).rejects.toBeInstanceOf(BackendContractError);
  });

  it('sin conexión o con 502 del proxy lanza BackendUnavailableError, sin datos simulados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')));
    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).rejects.toBeInstanceOf(BackendUnavailableError);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 502 })));
    await expect(fetchIncidentById(INCIDENT_ID, TOKEN)).rejects.toBeInstanceOf(BackendUnavailableError);
  });

  it('valida o rechaza con PATCH /incidents/:id/status con Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ...incident, status: 'validated' }));
    vi.stubGlobal('fetch', fetchMock);

    const updated = await changeIncidentStatus(INCIDENT_ID, { status: 'validated', cause: 'Revisado in situ' }, TOKEN);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/incidents/${INCIDENT_ID}/status`);
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer token-prueba');
    expect(JSON.parse(init.body)).toEqual({ status: 'validated', cause: 'Revisado in situ' });
    expect(updated.status).toBe('validated');
  });

  it('traduce un 409 a IncidentConflictError con el mensaje del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(409, { message: 'La incidencia ya no está en estado reported' })),
    );

    const attempt = changeIncidentStatus(INCIDENT_ID, { status: 'rejected', cause: 'Duplicado: ya existe' }, TOKEN);

    await expect(attempt).rejects.toBeInstanceOf(IncidentConflictError);
    await expect(attempt).rejects.toThrow('ya no está en estado reported');
  });

  it('asigna la prioridad con PATCH /incidents/:id/priority', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ...incident, status: 'validated', priority: 'high' }));
    vi.stubGlobal('fetch', fetchMock);

    const updated = await changeIncidentPriority(INCIDENT_ID, { priority: 'high', cause: 'Riesgo para peatones' }, TOKEN);

    expect(fetchMock.mock.calls[0][0]).toBe(`/api/incidents/${INCIDENT_ID}/priority`);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-prueba');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ priority: 'high', cause: 'Riesgo para peatones' });
    expect(updated.priority).toBe('high');
  });

  it('resuelve las URL de imágenes relativas al backend', () => {
    expect(resolveBackendAssetUrl('/uploads/incidents/a/b.png')).toBe('/api/uploads/incidents/a/b.png');
    vi.stubEnv('VITE_BACKEND_URL', 'https://api.urbanpulse.dev');
    expect(resolveBackendAssetUrl('/uploads/incidents/a/b.png')).toBe('https://api.urbanpulse.dev/uploads/incidents/a/b.png');
    expect(resolveBackendAssetUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png');
  });
});
