/// <reference types="jest" />
import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import { CATEGORIES_ENDPOINT, fetchCategories } from '@/services/category.service';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import type { Category } from '@/types/category';

// Mock de la capa HTTP: se conserva RequestTimeoutError real para que el
// servicio distinga los errores exactamente como en producción.
jest.mock('@/services/http', () => {
  const actualHttpModule = jest.requireActual<typeof import('@/services/http')>(
    '@/services/http',
  );
  return {
    ...actualHttpModule,
    fetchWithTimeout: jest.fn(),
  };
});

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);

// Implementación real de fetchWithTimeout, usada solo en el test de timeout
// para ejercitar el AbortController de verdad con fake timers.
const actualFetchWithTimeout = jest.requireActual<typeof import('@/services/http')>(
  '@/services/http',
).fetchWithTimeout;

// Endpoint del backend (real-first) y del mock (json-server) al que cae el servicio.
// `BACKEND_CATEGORIES_ENDPOINT` no está exportado: el alias público es CATEGORIES_ENDPOINT.
const BACKEND_CATEGORIES_ENDPOINT = CATEGORIES_ENDPOINT;
const MOCK_CATEGORIES_ENDPOINT = `${API_BASE_URL}/categories`;

const categoriesFixture: Category[] = [
  { id: '1', name: 'Vías' },
  { id: '2', name: 'Alumbrado' },
];

const MESSAGE_CATEGORIES_LOAD_ERROR =
  'No se pudieron cargar las categorías. Inténtalo de nuevo más tarde.';
const MESSAGE_MOCK_TIMEOUT_ERROR = /tardó demasiado/i;
const MESSAGE_MOCK_CONNECTION_ERROR = /Revisa tu conexión/i;

// Respuesta mínima compatible con lo que usa el servicio (ok + json + text).
// `status` decide `ok`: 2xx es correcto, cualquier otro código es rechazo.
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// Respuesta con cuerpo en texto plano (no JSON): `json()` falla como en producción.
function rawTextResponse(rawBody: string, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
    text: async () => rawBody,
  } as unknown as Response;
}

// Respuesta cuyo `text()` también lanza (p. ej. el cuerpo ya se consumió o la conexión se cortó).
function unreadableBodyResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('body unreadable');
    },
    text: async () => {
      throw new Error('body unreadable');
    },
  } as unknown as Response;
}

// Resultado que devuelve fetchWithTimeout para un endpoint concreto: respuesta o fallo de red/timeout.
type EndpointOutcome = Response | Error;

interface EndpointOutcomes {
  backend: EndpointOutcome;
  mock: EndpointOutcome;
}

// Enruta cada llamada de fetchWithTimeout según la URL: backend o mock.
// Así el mismo test puede simular un backend caído y un mock sano (o al revés).
function routeFetchByEndpoint(outcomes: EndpointOutcomes): void {
  fetchWithTimeoutMock.mockImplementation(async (requestUrl: string) => {
    const outcome = requestUrl === BACKEND_CATEGORIES_ENDPOINT ? outcomes.backend : outcomes.mock;
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  });
}

// Devuelve la URL de una llamada concreta de fetchWithTimeout.
function readRequestUrlAt(callIndex = 0): string {
  const [requestUrl] = fetchWithTimeoutMock.mock.calls[callIndex];
  return requestUrl;
}

// Devuelve el init (método, etc.) de una llamada concreta.
function readRequestInitAt(callIndex = 0): RequestInit {
  const [, requestInit] = fetchWithTimeoutMock.mock.calls[callIndex];
  return requestInit ?? {};
}

describe('fetchCategories', () => {
  const originalFetch = globalThis.fetch;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    // El servicio avisa por console.warn en modo dev al hacer fallback; se silencia para no ensuciar la salida.
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Por defecto el backend responde correctamente; el mock queda sano por si se usara.
    routeFetchByEndpoint({
      backend: jsonResponse(categoriesFixture, 200),
      mock: jsonResponse(categoriesFixture, 200),
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  describe('endpoints', () => {
    it('CATEGORIES_ENDPOINT exportado sigue apuntando al backend (compatibilidad)', () => {
      expect(CATEGORIES_ENDPOINT).toBe(`${BACKEND_API_URL}/categories`);
    });

    it('el endpoint del mock es distinto del del backend', () => {
      expect(MOCK_CATEGORIES_ENDPOINT).not.toBe(BACKEND_CATEGORIES_ENDPOINT);
    });
  });

  describe('camino backend: éxito', () => {
    it('devuelve { categories, source: "backend", backendErrorMessage: null } cuando response.ok', async () => {
      const result = await fetchCategories();

      expect(result).toEqual({
        categories: categoriesFixture,
        source: 'backend',
        backendErrorMessage: null,
      });
    });

    it('no llama al mock: fetchWithTimeout se invoca una sola vez', async () => {
      await fetchCategories();

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('la única llamada va al endpoint del backend, con método GET', async () => {
      await fetchCategories();

      expect(readRequestUrlAt(0)).toBe(BACKEND_CATEGORIES_ENDPOINT);
      expect(readRequestInitAt(0).method).toBe('GET');
    });

    it('no avisa por console.warn cuando el backend responde bien', async () => {
      await fetchCategories();

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('fallback por fallo de conexión', () => {
    it('con error de red (TypeError) cae al mock y devuelve source "mock"', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.source).toBe('mock');
      expect(result.categories).toEqual(categoriesFixture);
    });

    it('con error de red el backendErrorMessage es un string no vacío que describe la conexión', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(typeof result.backendErrorMessage).toBe('string');
      expect(result.backendErrorMessage).not.toBe('');
      expect(result.backendErrorMessage).toMatch(/No se pudo conectar con el backend/);
    });

    it('en el fallback hace dos llamadas: primero backend y luego mock, ambas con GET', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse(categoriesFixture, 200),
      });

      await fetchCategories();

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(readRequestUrlAt(0)).toBe(BACKEND_CATEGORIES_ENDPOINT);
      expect(readRequestUrlAt(1)).toBe(MOCK_CATEGORIES_ENDPOINT);
      expect(readRequestInitAt(0).method).toBe('GET');
      expect(readRequestInitAt(1).method).toBe('GET');
    });

    it('avisa por console.warn al hacer fallback', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse(categoriesFixture, 200),
      });

      await fetchCategories();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallback por timeout del backend', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('con RequestTimeoutError (lanzado por la capa HTTP) cae al mock con source "mock"', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.source).toBe('mock');
      expect(result.categories).toEqual(categoriesFixture);
    });

    it('con timeout real (AbortController tras 10s) cae al mock y el backendErrorMessage menciona el timeout', async () => {
      // fetch nativo que nunca resuelve; solo se rechaza al abortar la señal del servicio.
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

      fetchWithTimeoutMock.mockImplementation(
        async (requestUrl: string, requestInit?: RequestInit) => {
          if (requestUrl === BACKEND_CATEGORIES_ENDPOINT) {
            return actualFetchWithTimeout(requestUrl, requestInit);
          }
          return jsonResponse(categoriesFixture, 200);
        },
      );

      const resultPromise = fetchCategories();
      // Avanza el reloj hasta disparar el AbortController del backend.
      jest.advanceTimersByTime(10000);
      const result = await resultPromise;

      expect(result.source).toBe('mock');
      expect(result.backendErrorMessage).toMatch(/tardó demasiado/);
    });

    it('con RequestTimeoutError el backendErrorMessage menciona el timeout', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.backendErrorMessage).toMatch(/tardó demasiado/);
    });
  });

  describe('fallback por !response.ok del backend', () => {
    it('con body JSON { message: "texto" } incluye el status y el mensaje real', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'texto' }, 500),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.source).toBe('mock');
      expect(result.backendErrorMessage).toBe(
        'El backend respondió con un error (500): texto',
      );
    });

    it('con body JSON { message: ["a","b"] } une los mensajes con "; "', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: ['a', 'b'] }, 400),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.backendErrorMessage).toBe(
        'El backend respondió con un error (400): a; b',
      );
    });

    it('con body no-JSON devuelve solo el mensaje genérico con status, sin fragmento vacío', async () => {
      routeFetchByEndpoint({
        backend: rawTextResponse('<html>Bad Gateway</html>', 502),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.backendErrorMessage).toBe('El backend respondió con un error (502).');
    });

    it('con body JSON sin campo message devuelve solo el mensaje genérico con status', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ error: 'Internal' }, 503),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.backendErrorMessage).toBe('El backend respondió con un error (503).');
    });

    it('con body JSON vacío "{}" devuelve solo el mensaje genérico sin ": " colgando', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({}, 404),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.backendErrorMessage).toBe('El backend respondió con un error (404).');
      expect(result.backendErrorMessage).not.toMatch(/:\s*$/);
    });

    it('si response.text() lanza no rompe: devuelve igualmente el mensaje genérico con status', async () => {
      routeFetchByEndpoint({
        backend: unreadableBodyResponse(500),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.source).toBe('mock');
      expect(result.categories).toEqual(categoriesFixture);
      expect(result.backendErrorMessage).toBe('El backend respondió con un error (500).');
    });

    it('con !ok del backend no devuelve source "backend" aunque haya cuerpo válido', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse(categoriesFixture, 500),
        mock: jsonResponse(categoriesFixture, 200),
      });

      const result = await fetchCategories();

      expect(result.source).toBe('mock');
      expect(result.backendErrorMessage).not.toBeNull();
    });
  });

  describe('doble fallo: backend y mock', () => {
    it('backend con error de conexión + mock !ok: la promesa se rechaza, no devuelve source "mock" silencioso', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse({ message: 'boom' }, 500),
      });

      await expect(fetchCategories()).rejects.toThrow(MESSAGE_CATEGORIES_LOAD_ERROR);
    });

    it('backend !ok + mock !ok: la promesa se rechaza', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'boom' }, 500),
        mock: jsonResponse({}, 500),
      });

      await expect(fetchCategories()).rejects.toThrow(MESSAGE_CATEGORIES_LOAD_ERROR);
    });

    it('backend con error de conexión + mock con error de red: la promesa se rechaza con el mensaje de conexión', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: new TypeError('Network request failed'),
      });

      await expect(fetchCategories()).rejects.toThrow(MESSAGE_MOCK_CONNECTION_ERROR);
    });

    it('backend caído por timeout + mock con timeout: la promesa se rechaza con el mensaje de timeout', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: new RequestTimeoutError(),
      });

      await expect(fetchCategories()).rejects.toThrow(MESSAGE_MOCK_TIMEOUT_ERROR);
    });

    it('en el doble fallo no se devuelve resultado: se hacen exactamente dos llamadas', async () => {
      routeFetchByEndpoint({
        backend: new TypeError('Network request failed'),
        mock: jsonResponse({}, 500),
      });

      await expect(fetchCategories()).rejects.toThrow();

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(readRequestUrlAt(1)).toBe(MOCK_CATEGORIES_ENDPOINT);
    });
  });

  describe('endpoint del fallback', () => {
    it('la llamada de fallback usa el endpoint del mock y no el del backend', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: jsonResponse(categoriesFixture, 200),
      });

      await fetchCategories();

      expect(readRequestUrlAt(1)).toBe(`${API_BASE_URL}/categories`);
      expect(readRequestUrlAt(1)).not.toBe(readRequestUrlAt(0));
    });
  });
});
