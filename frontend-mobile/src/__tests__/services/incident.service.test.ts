/// <reference types="jest" />
import { INCIDENTS_ENDPOINT, createIncident } from '@/services/incident.service';
import type { CreateIncidentInput, IncidentPayload } from '@/types/incident';

// Identificador temporal del ciudadano que el servicio envía en todos los casos.
const TEMPORARY_CIVIC_ID = 'a62718e8563';

// Claves exactas que el front envía al mock; cualquier otra es un fallo de contrato.
const EXPECTED_PAYLOAD_KEYS = [
  'accuracy',
  'category',
  'categoryId',
  'civicId',
  'description',
  'latitude',
  'longitude',
  'title',
].sort();

// Campos que el servidor o el backend gestionan y que el front NUNCA debe enviar.
const FORBIDDEN_PAYLOAD_KEYS = [
  'status',
  'priority',
  'createdAt',
  'locationId',
  'urbanAssetId',
  'departmentId',
  'teamId',
  'technicianId',
];

const MESSAGE_CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const MESSAGE_REGISTER_ERROR = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';

// Payload de entrada con espacios extra a propósito para verificar el trim().
// Incluye coordenadas numéricas completas (caso con ubicación).
const validInput: CreateIncidentInput = {
  title: '  Bache en la avenida principal  ',
  description: '  Hay un bache profundo que pone en riesgo a los vehículos.  ',
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

// Respuesta simulada de json-server: el payload enviado más el id asignado.
const serverIncident: IncidentPayload & { id: string } = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
  civicId: TEMPORARY_CIVIC_ID,
  categoryId: null,
  category: null,
};

// Extrae el body JSON enviado en una llamada concreta de fetch.
function readSentBody(fetchMock: jest.Mock, callIndex = 0): Record<string, unknown> {
  const [, options] = fetchMock.mock.calls[callIndex];
  return JSON.parse(options.body) as Record<string, unknown>;
}

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

  it('envía exactamente los 8 campos del contrato y ninguno más', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const body = readSentBody(fetchMock);
    expect(Object.keys(body).sort()).toEqual(EXPECTED_PAYLOAD_KEYS);
    expect(Object.keys(body)).toHaveLength(8);
  });

  it('no envía status, priority, createdAt ni ninguna clave de relación', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const body = readSentBody(fetchMock);
    for (const forbiddenKey of FORBIDDEN_PAYLOAD_KEYS) {
      expect(body).not.toHaveProperty(forbiddenKey);
    }
  });

  it('envía civicId con el identificador temporal del ciudadano', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    expect(readSentBody(fetchMock).civicId).toBe(TEMPORARY_CIVIC_ID);
  });

  it('hace trim de title y description', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const body = readSentBody(fetchMock);
    expect(body.title).toBe('Bache en la avenida principal');
    expect(body.description).toBe('Hay un bache profundo que pone en riesgo a los vehículos.');
  });

  it('envía latitude, longitude y accuracy numéricos tal cual', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    const body = readSentBody(fetchMock);
    expect(body.latitude).toBe(40.4168);
    expect(body.longitude).toBe(-3.7038);
    expect(body.accuracy).toBe(10);
  });

  it('envía latitude, longitude y accuracy como null cuando no hay ubicación', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({
      ...validInput,
      latitude: null,
      longitude: null,
      accuracy: null,
    });

    const body = readSentBody(fetchMock);
    expect(body.latitude).toBeNull();
    expect(body.longitude).toBeNull();
    expect(body.accuracy).toBeNull();
  });

  it('envía accuracy null cuando hay coordenadas pero la precisión es desconocida', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, accuracy: null });

    const body = readSentBody(fetchMock);
    expect(body.latitude).toBe(40.4168);
    expect(body.longitude).toBe(-3.7038);
    expect(body.accuracy).toBeNull();
  });

  it('incluye categoryId y category cuando se pasan en el input', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, categoryId: '2', category: 'Vallado' });

    const body = readSentBody(fetchMock);
    expect(body.categoryId).toBe('2');
    expect(body.category).toBe('Vallado');
  });

  it('envía categoryId null cuando no se pasa en el input', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    expect(readSentBody(fetchMock).categoryId).toBeNull();
  });

  it('envía categoryId null cuando llega explícitamente como null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, categoryId: null });

    expect(readSentBody(fetchMock).categoryId).toBeNull();
  });

  it('hace trim de una category con espacios alrededor', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, category: '  Vallado  ' });

    expect(readSentBody(fetchMock).category).toBe('Vallado');
  });

  it('normaliza a null una category en blanco o con solo espacios', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, categoryId: '2', category: '   ' });

    expect(readSentBody(fetchMock, 0).category).toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, category: '' });

    expect(readSentBody(fetchMock, 1).category).toBeNull();
  });

  it('normaliza a null una category omitida o null', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident(validInput);

    expect(readSentBody(fetchMock, 0).category).toBeNull();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverIncident,
    });

    await createIncident({ ...validInput, category: null });

    expect(readSentBody(fetchMock, 1).category).toBeNull();
  });

  it('lanza un Error con mensaje de registro cuando response.ok es false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(createIncident(validInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
  });

  it('lanza un Error con mensaje de conexión cuando fetch rechaza (fallo de red)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(createIncident(validInput)).rejects.toThrow(MESSAGE_CONNECTION_ERROR);
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
