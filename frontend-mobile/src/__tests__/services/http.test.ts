/// <reference types="jest" />
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  RequestTimeoutError,
  buildBackendRejectionMessage,
  extractBackendErrorMessage,
  fetchWithTimeout,
  toConnectionErrorMessage,
} from '@/services/http';

// Respuesta mínima compatible con lo que usa `buildBackendRejectionMessage` (status + text).
function textResponse(rawBody: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => rawBody,
  } as unknown as Response;
}

// Respuesta cuyo `text()` lanza, como si el cuerpo ya se hubiese consumido o la conexión se cortase.
function unreadableBodyResponse(status: number): Response {
  return {
    ok: false,
    status,
    text: async () => {
      throw new Error('body unreadable');
    },
  } as unknown as Response;
}

// fetch que nunca resuelve por sí mismo; solo se rechaza cuando se aborta la señal.
function mockFetchRejectingOnAbort(): void {
  globalThis.fetch = jest.fn(
    (_requestUrl: string, requestInit?: RequestInit) =>
      new Promise((_resolve, reject) => {
        requestInit?.signal?.addEventListener('abort', () => {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }),
  ) as unknown as typeof fetch;
}

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('resuelve con la respuesta cuando fetch responde a tiempo', async () => {
    const fakeResponse = { ok: true } as Response;
    globalThis.fetch = jest.fn().mockResolvedValue(fakeResponse);

    const result = await fetchWithTimeout('https://example.com/resource');

    expect(result).toBe(fakeResponse);
  });

  it('pasa la url y el init a fetch, añadiendo la señal de abort', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchWithTimeout('https://example.com/resource', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe('https://example.com/resource');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('lanza RequestTimeoutError si se supera el timeout por defecto', async () => {
    jest.useFakeTimers();
    mockFetchRejectingOnAbort();

    const resultPromise = fetchWithTimeout('https://example.com/resource');
    jest.advanceTimersByTime(DEFAULT_REQUEST_TIMEOUT_MS);

    await expect(resultPromise).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it('lanza RequestTimeoutError si se supera un timeout personalizado', async () => {
    jest.useFakeTimers();
    mockFetchRejectingOnAbort();

    const resultPromise = fetchWithTimeout('https://example.com/resource', {}, 1000);
    jest.advanceTimersByTime(1000);

    await expect(resultPromise).rejects.toBeInstanceOf(RequestTimeoutError);
  });

  it('propaga tal cual cualquier otro error distinto de un abort por timeout', async () => {
    const networkError = new TypeError('Network request failed');
    globalThis.fetch = jest.fn().mockRejectedValue(networkError);

    await expect(fetchWithTimeout('https://example.com/resource')).rejects.toBe(networkError);
  });
});

describe('extractBackendErrorMessage', () => {
  it('con body { message: "texto" } devuelve el texto', () => {
    const result = extractBackendErrorMessage(JSON.stringify({ message: 'algo falló' }));

    expect(result).toBe('algo falló');
  });

  it('con body { message: ["a", "b"] } une los mensajes con "; "', () => {
    const result = extractBackendErrorMessage(JSON.stringify({ message: ['a', 'b'] }));

    expect(result).toBe('a; b');
  });

  it('con body no-JSON devuelve null', () => {
    const result = extractBackendErrorMessage('<html>Bad Gateway</html>');

    expect(result).toBeNull();
  });

  it('con body JSON sin campo message devuelve null', () => {
    const result = extractBackendErrorMessage(JSON.stringify({ error: 'Internal' }));

    expect(result).toBeNull();
  });
});

describe('toConnectionErrorMessage', () => {
  const timeoutMessage = 'El servidor mock/backend no está levantado.';
  const connectionMessage = 'Revisa tu conexión a internet.';

  it('con un RequestTimeoutError devuelve el mensaje de timeout', () => {
    const result = toConnectionErrorMessage(
      new RequestTimeoutError(),
      timeoutMessage,
      connectionMessage,
    );

    expect(result).toBe(timeoutMessage);
  });

  it('con cualquier otro error devuelve el mensaje de conexión genérico', () => {
    const result = toConnectionErrorMessage(
      new TypeError('Network request failed'),
      timeoutMessage,
      connectionMessage,
    );

    expect(result).toBe(connectionMessage);
  });

  it('con un error desconocido (no instancia de Error) devuelve igualmente el mensaje de conexión', () => {
    const result = toConnectionErrorMessage('fallo inesperado', timeoutMessage, connectionMessage);

    expect(result).toBe(connectionMessage);
  });
});

describe('buildBackendRejectionMessage', () => {
  const genericMessage = 'El backend respondió con un error (500).';
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // La función avisa por console.warn en modo dev; se silencia para no ensuciar la salida del test.
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('con body { message: "texto" } devuelve "${genericMessage} (${backendMessage})"', async () => {
    const response = textResponse(JSON.stringify({ message: 'texto' }), 500);

    const result = await buildBackendRejectionMessage(response, genericMessage);

    expect(result).toBe(`${genericMessage} (texto)`);
  });

  it('sin campo message en el cuerpo devuelve solo el mensaje genérico', async () => {
    const response = textResponse(JSON.stringify({ error: 'Internal' }), 500);

    const result = await buildBackendRejectionMessage(response, genericMessage);

    expect(result).toBe(genericMessage);
  });

  it('con body no-JSON devuelve solo el mensaje genérico', async () => {
    const response = textResponse('<html>Bad Gateway</html>', 500);

    const result = await buildBackendRejectionMessage(response, genericMessage);

    expect(result).toBe(genericMessage);
  });

  it('si response.text() lanza devuelve igualmente el mensaje genérico', async () => {
    const response = unreadableBodyResponse(500);

    const result = await buildBackendRejectionMessage(response, genericMessage);

    expect(result).toBe(genericMessage);
  });
});
