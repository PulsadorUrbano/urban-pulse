/// <reference types="jest" />
import { API_BASE_URL } from '@/constants/config';
import { CIVICS_ENDPOINT, createCivic } from '@/services/civic.service';
import type { Civic, CreateCivicInput } from '@/types/civic';

// Payload de entrada válido para el registro de un ciudadano.
const validInput: CreateCivicInput = {
  userId: 'user-1',
  phone: '+34600111222',
};

// json-server devuelve el registro persistido con un `id` generado. El tipo
// `Civic` no declara `id`, así que se extiende localmente para simular la respuesta real.
const serverCivic: Civic & { id: string } = {
  id: 'civic-1',
  userId: 'user-1',
  phone: '+34600111222',
};

describe('createCivic', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restaura los timers reales tras cada test que active fake timers.
    jest.useRealTimers();
  });

  it('hace POST a ${API_BASE_URL}/civics con Content-Type application/json', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => serverCivic,
    });

    await createCivic(validInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/civics`);
    expect(url).toBe(CIVICS_ENDPOINT);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('envía el body exacto { userId, phone } sin campos extra', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => serverCivic,
    });

    // Se fuerza un campo extra para verificar que el servicio no lo reenvía al servidor.
    const inputWithExtraField = {
      ...validInput,
      role: 'admin',
    } as CreateCivicInput;

    await createCivic(inputWithExtraField);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body).toEqual({
      userId: 'user-1',
      phone: '+34600111222',
    });
    expect(Object.keys(body).sort()).toEqual(['phone', 'userId']);
  });

  it('devuelve el civic creado tal cual lo responde el servidor (201 con id)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => serverCivic,
    });

    const createdCivic = await createCivic(validInput);

    expect(createdCivic).toEqual(serverCivic);
  });

  it('lanza el error de timeout específico cuando la petición supera el tiempo límite', async () => {
    jest.useFakeTimers();

    // fetch no resuelve nunca; solo se rechaza cuando el AbortController del servicio aborta.
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

    const promise = createCivic(validInput);

    // Avanza el reloj hasta disparar el timeout de 10s de fetchWithTimeout.
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(
      /El servidor tardó demasiado en responder al guardar el ciudadano/,
    );
  });

  it('lanza el error genérico de conexión cuando fetch rechaza por fallo de red', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(createCivic(validInput)).rejects.toThrow(
      'No se pudo conectar con el servidor para guardar el ciudadano. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it.each([400, 500])(
    'lanza el error de guardado cuando la respuesta no es ok (status %i)',
    async (status) => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({}),
      });

      await expect(createCivic(validInput)).rejects.toThrow(
        'No se pudo guardar el ciudadano. Inténtalo de nuevo más tarde.',
      );
    },
  );
});
