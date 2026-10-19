/// <reference types="jest" />
import { IMAGES_ENDPOINT, createImage } from '@/services/image.service';
import type { CreateIncidentImageInput, IncidentImage } from '@/types/incident-image';

// Payload de entrada con espacios extra a propósito para verificar el trim().
const validInput: CreateIncidentImageInput = {
  url: '  file:///tmp/foto-bache.jpg  ',
  incidentId: 'inc-1',
};

const serverImage: IncidentImage = {
  id: 'img-1',
  url: 'file:///tmp/foto-bache.jpg',
  incidentId: 'inc-1',
};

describe('createImage', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restaura los timers reales tras cada test que active fake timers.
    jest.useRealTimers();
  });

  it('hace POST al endpoint de imágenes con Content-Type application/json', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverImage,
    });

    await createImage(validInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(IMAGES_ENDPOINT);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('envía el payload exacto: url sin espacios e incidentId', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverImage,
    });

    await createImage(validInput);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body).toEqual({
      url: 'file:///tmp/foto-bache.jpg',
      incidentId: 'inc-1',
    });
  });

  it('devuelve la imagen parseada con su id en caso de éxito', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => serverImage,
    });

    const image = await createImage(validInput);

    expect(image).toEqual(serverImage);
    expect(image.id).toBe('img-1');
  });

  it('lanza un Error en español cuando la respuesta no es ok (p. ej. 500)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(createImage(validInput)).rejects.toThrow(/No se pudo guardar la imagen/i);
  });

  it('lanza un Error en español cuando fetch rechaza (fallo de red)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(createImage(validInput)).rejects.toThrow(/No se pudo conectar/i);
  });

  it('lanza un Error en español de timeout cuando fetch no responde en 10s', async () => {
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

    const promise = createImage(validInput);

    // Avanza el reloj hasta disparar el AbortController del servicio.
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(/tardó demasiado/i);
  });
});
