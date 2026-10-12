/// <reference types="jest" />
import { LOCATIONS_ENDPOINT, createLocation } from './location.service';
import type { Location, LocationCoordinates } from '@/types/location';

const coordinates: LocationCoordinates = {
  latitude: 4.6533,
  longitude: -74.0836,
  accuracy: 12.5,
};

const serverLocation: Location = {
  id: 'loc-1',
  latitude: coordinates.latitude,
  longitude: coordinates.longitude,
  accuracy: coordinates.accuracy,
  createdAt: '2026-10-12T14:00:00.000Z',
};

describe('createLocation', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restaura los timers reales tras cada test que active fake timers.
    jest.useRealTimers();
  });

  it('hace POST al endpoint de ubicaciones con Content-Type application/json', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverLocation,
    });

    await createLocation(coordinates);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(LOCATIONS_ENDPOINT);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('envía coordenadas y un createdAt ISO válido en el body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverLocation,
    });

    await createLocation(coordinates);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.latitude).toBe(coordinates.latitude);
    expect(body.longitude).toBe(coordinates.longitude);
    expect(body.accuracy).toBe(coordinates.accuracy);

    // createdAt debe ser una fecha ISO válida.
    expect(typeof body.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
  });

  it('lanza un Error cuando response.ok es false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(createLocation(coordinates)).rejects.toThrow(Error);
  });

  it('lanza un Error cuando fetch rechaza (fallo de red)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(createLocation(coordinates)).rejects.toThrow(Error);
  });

  it('devuelve la ubicación parseada con su id en caso de éxito', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverLocation,
    });

    const location = await createLocation(coordinates);

    expect(location).toEqual(serverLocation);
    expect(location.id).toBe('loc-1');
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

    const promise = createLocation(coordinates);

    // Avanza el reloj hasta disparar el AbortController del servicio.
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(/tardó demasiado/i);
  });
});
