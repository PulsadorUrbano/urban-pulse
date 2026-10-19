/// <reference types="jest" />
import { BACKEND_API_URL } from '@/constants/config';
import {
  SIMULATED_TOKEN_MAX_DELAY_MS,
  SIMULATED_TOKEN_MIN_DELAY_MS,
  requestToken,
} from '@/services/token.service';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import type { AuthToken } from '@/types/token';

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

// Respuesta mínima compatible con lo que usa el servicio (ok + json).
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as unknown as Response;
}

// Respuesta cuyo cuerpo no es JSON válido.
function malformedJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  } as unknown as Response;
}

const STANDARD_BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decodifica base64 estándar (con o sin padding) a una cadena de bytes (un char por byte).
function decodeBase64ToBinaryString(base64Text: string): string {
  const unpaddedText = base64Text.replace(/=+$/, '');
  let binaryText = '';
  let bitBuffer = 0;
  let bitCount = 0;

  for (const char of unpaddedText) {
    const sextetValue = STANDARD_BASE64_ALPHABET.indexOf(char);
    if (sextetValue === -1) {
      throw new Error(`Carácter base64 no válido: ${char}`);
    }
    bitBuffer = (bitBuffer << 6) | sextetValue;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      binaryText += String.fromCharCode((bitBuffer >> bitCount) & 0xff);
    }
  }

  return binaryText;
}

// Decodifica la parte payload de un token mock (base64url sin padding sobre bytes UTF-8).
function decodeMockPayload(encodedPayload: string): unknown {
  const standardBase64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (standardBase64.length % 4)) % 4;
  const paddedBase64 = standardBase64 + '='.repeat(paddingLength);
  const utf8Text = decodeURIComponent(escape(decodeBase64ToBinaryString(paddedBase64)));
  return JSON.parse(utf8Text) as unknown;
}

// Ejecuta requestToken y avanza el reloj falso hasta cubrir la latencia simulada máxima.
async function requestTokenAndFlushSimulation(userId: string): Promise<AuthToken | null> {
  const pendingToken = requestToken(userId);
  await jest.advanceTimersByTimeAsync(SIMULATED_TOKEN_MAX_DELAY_MS);
  return pendingToken;
}

describe('requestToken', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchWithTimeoutMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('respuesta correcta del backend', () => {
    it('devuelve el token con source "backend" cuando la respuesta es ok con accessToken', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'backend-jwt' }));

      const issuedToken = await requestToken('42');

      expect(issuedToken).toEqual({ accessToken: 'backend-jwt', source: 'backend' });
    });

    it('no usa simulación cuando el backend responde correctamente', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'backend-jwt' }));

      const issuedToken = await requestToken('42');

      // Sin avanzar timers: la resolución debe ser inmediata al venir del backend.
      expect(issuedToken?.source).toBe('backend');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('envía POST a la URL de auth/token con Content-Type JSON y body { userId }', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'backend-jwt' }));

      await requestToken('42');

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      const [requestUrl, requestInit] = fetchWithTimeoutMock.mock.calls[0];
      expect(requestUrl).toBe(`${BACKEND_API_URL}/auth/token`);
      expect(requestInit?.method).toBe('POST');
      expect(requestInit?.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(requestInit?.body as string)).toEqual({ userId: '42' });
    });
  });

  describe('fallos que degradan a token simulado (source "mock")', () => {
    it('respuesta 404 devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({}, false));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
      expect(issuedToken?.accessToken).toMatch(/^mock\./);
    });

    it('respuesta 500 devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'ignorado' }, false));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
      expect(issuedToken?.accessToken).not.toBe('ignorado');
    });

    it('RequestTimeoutError devuelve un token mock sin relanzar', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new RequestTimeoutError());

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('rechazo de red (TypeError) devuelve un token mock sin relanzar', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('response.json() que lanza devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(malformedJsonResponse());

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('respuesta {} (sin accessToken) devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({}));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('accessToken vacío devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: '' }));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('accessToken que no es string (número) devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ accessToken: 12345 }));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });

    it('cuerpo null devuelve un token mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(null));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.source).toBe('mock');
    });
  });

  describe('token simulado', () => {
    it('tiene formato mock.<payload>.simulated con tres partes', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const issuedToken = await requestTokenAndFlushSimulation('42');
      const tokenParts = issuedToken?.accessToken.split('.') ?? [];

      expect(tokenParts).toHaveLength(3);
      expect(tokenParts[0]).toBe('mock');
      expect(tokenParts[2]).toBe('simulated');
      expect(issuedToken?.accessToken.startsWith('mock.')).toBe(true);
      expect(issuedToken?.accessToken.endsWith('.simulated')).toBe(true);
    });

    it('usa base64url sin padding y sin caracteres estándar "+", "/" o "="', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const issuedToken = await requestTokenAndFlushSimulation('42');

      expect(issuedToken?.accessToken).toMatch(/^mock\.[A-Za-z0-9_-]+\.simulated$/);
    });

    it('el payload decodificado contiene userId, source "mock" e iat numérico', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const issuedToken = await requestTokenAndFlushSimulation('42');
      const encodedPayload = issuedToken?.accessToken.split('.')[1] ?? '';
      const decodedPayload = decodeMockPayload(encodedPayload) as Record<string, unknown>;

      expect(decodedPayload.userId).toBe('42');
      expect(decodedPayload.source).toBe('mock');
      expect(typeof decodedPayload.iat).toBe('number');
    });

    it.each(['a', 'ab', 'abc', 'abcd', 'usuario-largo-con-guiones_y_guion_bajo'])(
      'codifica y decodifica correctamente userId "%s" (distintos restos de módulo 3)',
      async (userId) => {
        fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

        const issuedToken = await requestTokenAndFlushSimulation(userId);
        const encodedPayload = issuedToken?.accessToken.split('.')[1] ?? '';

        expect(decodeMockPayload(encodedPayload)).toMatchObject({ userId, source: 'mock' });
      },
    );

    it('codifica correctamente userId con caracteres no ASCII (UTF-8)', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const issuedToken = await requestTokenAndFlushSimulation('josé-ñandú-😀');
      const encodedPayload = issuedToken?.accessToken.split('.')[1] ?? '';

      expect(decodeMockPayload(encodedPayload)).toMatchObject({ userId: 'josé-ñandú-😀' });
    });
  });

  describe('latencia simulada', () => {
    it('no resuelve antes del retardo mínimo y resuelve al alcanzarlo', async () => {
      // Math.random = 0 fija el retardo en SIMULATED_TOKEN_MIN_DELAY_MS.
      jest.spyOn(Math, 'random').mockReturnValue(0);
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));
      let hasResolved = false;

      const pendingToken = requestToken('42').then((issuedToken) => {
        hasResolved = true;
        return issuedToken;
      });

      await jest.advanceTimersByTimeAsync(SIMULATED_TOKEN_MIN_DELAY_MS - 1);
      expect(hasResolved).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(pendingToken).resolves.toMatchObject({ source: 'mock' });
    });

    it('el retardo simulado queda dentro del rango [MIN, MAX)', async () => {
      // Math.random = 0.5 fija el retardo en el punto medio del rango.
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));
      const midpointDelayMs =
        SIMULATED_TOKEN_MIN_DELAY_MS +
        (SIMULATED_TOKEN_MAX_DELAY_MS - SIMULATED_TOKEN_MIN_DELAY_MS) / 2;
      let hasResolved = false;

      const pendingToken = requestToken('42').then((issuedToken) => {
        hasResolved = true;
        return issuedToken;
      });

      await jest.advanceTimersByTimeAsync(midpointDelayMs - 1);
      expect(hasResolved).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      await expect(pendingToken).resolves.toMatchObject({ source: 'mock' });
      expect(midpointDelayMs).toBeGreaterThanOrEqual(SIMULATED_TOKEN_MIN_DELAY_MS);
      expect(midpointDelayMs).toBeLessThan(SIMULATED_TOKEN_MAX_DELAY_MS);
    });
  });

  describe('contrato de no rechazo', () => {
    it('nunca rechaza aunque fetchWithTimeout rechace con un valor que no es Error', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce('boom');

      await expect(requestTokenAndFlushSimulation('42')).resolves.toMatchObject({
        source: 'mock',
      });
    });

    it('nunca rechaza si fetchWithTimeout devuelve undefined', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(undefined as unknown as Response);

      await expect(requestTokenAndFlushSimulation('42')).resolves.toMatchObject({
        source: 'mock',
      });
    });
  });
});
