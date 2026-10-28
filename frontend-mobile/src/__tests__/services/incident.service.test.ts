/// <reference types="jest" />
import { INCIDENTS_ENDPOINT, createIncident } from '@/services/incident.service';
import type { CreateIncidentInput } from '@/types/incident';

// Payload de entrada con espacios extra a propósito para verificar el trim().
const validInput: CreateIncidentInput = {
  title: '  Bache en la avenida principal  ',
  description: '  Hay un bache profundo que pone en riesgo a los vehículos.  ',
  categoryId: '2',
  category: '  Vallado  ',
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

// Input mínimo: sin descripción, sin categoría y sin ubicación.
const minimalInput: CreateIncidentInput = {
  title: 'Farola fundida',
  description: '',
  categoryId: null,
  category: null,
  latitude: null,
  longitude: null,
  accuracy: null,
};

// Respuesta del backend real (POST /incidents) con el shape de CreatedIncident.
const serverCreatedIncident: CreatedIncident = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  status: 'reported',
  priority: null,
  createdAt: '2026-10-12T14:00:00.000Z',
  civicId: null,
  locationId: null,
  urbanAssetId: null,
  categoryId: null,
  category: null,
  departmentId: null,
  teamId: null,
  technicianId: null,
};

describe('createIncident', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restaura los timers reales tras cada test que active fake timers.
    jest.useRealTimers();
  });

  it('hace POST al endpoint con Content-Type application/json', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(INCIDENTS_ENDPOINT);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('envía el payload con los campos automáticos correctos', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.title).toBe('Bache en la avenida principal');
    expect(body.description).toBe('Hay un bache profundo que pone en riesgo a los vehículos.');
    expect(body.status).toBe('reported');
    expect(body.priority).toBeNull();

    // createdAt debe ser una fecha ISO válida.
    expect(typeof body.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);

    // Los 7 ids de relación deben ir en null.
    expect(body.civicId).toBeNull();
    expect(body.locationId).toBeNull();
    expect(body.urbanAssetId).toBeNull();
    expect(body.categoryId).toBeNull();
    expect(body.departmentId).toBeNull();
    expect(body.teamId).toBeNull();
    expect(body.technicianId).toBeNull();
  });

  it('incluye categoryId y category cuando se pasan en el input', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, categoryId: '2', category: 'Vallado' });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.categoryId).toBe('2');
    expect(body.category).toBe('Vallado');
  });

  it('normaliza a null una category en blanco', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, categoryId: '2', category: '   ' });

    const [, spacedOptions] = fetchMock.mock.calls[0];
    const spacedBody = JSON.parse(spacedOptions.body);

    expect(spacedBody.category).toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, category: '' });

    const [, emptyOptions] = fetchMock.mock.calls[1];
    const emptyBody = JSON.parse(emptyOptions.body);

    expect(emptyBody.category).toBeNull();
  });

  it('envía locationId cuando se pasa y null cuando se omite', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, locationId: 'loc-1' });

    const [, withLocationOptions] = fetchMock.mock.calls[0];
    const withLocationBody = JSON.parse(withLocationOptions.body);

    expect(withLocationBody.locationId).toBe('loc-1');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const [, withoutLocationOptions] = fetchMock.mock.calls[1];
    const withoutLocationBody = JSON.parse(withoutLocationOptions.body);

    expect(withoutLocationBody.locationId).toBeNull();
  });

  it('lanza un Error cuando response.ok es false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(createIncident(validInput)).rejects.toThrow(Error);
  });

  it('lanza un Error cuando fetch rechaza (fallo de red)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(createIncident(validInput)).rejects.toThrow(Error);
  });

  it('devuelve la incidencia parseada en caso de éxito', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    const incident = await createIncident(validInput);

    expect(incident).toEqual(serverIncident);
    expect(incident.id).toBe('42');
  });

  it('lanza un Error de timeout cuando fetch no responde en 10s', async () => {
    jest.useFakeTimers();

    // fetch devuelve una promesa que nunca resuelve; solo se rechaza al abortar.
    fetchMock.mockImplementationOnce(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const promise = createIncident(validInput);

    // Avanza el reloj hasta disparar el AbortController del servicio.
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(/tardó demasiado/i);
  });
});
