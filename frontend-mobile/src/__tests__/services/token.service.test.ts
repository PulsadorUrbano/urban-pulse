/// <reference types="jest" />
import { SIMULATED_TOKEN_MAX_DELAY_MS, SIMULATED_TOKEN_MIN_DELAY_MS, simulateToken } from '@/services/token.service';
import type { AuthToken } from '@/types/token';

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

// Ejecuta simulateToken y avanza el reloj falso hasta cubrir la latencia simulada máxima.
async function simulateTokenAndFlush(userId: string): Promise<AuthToken> {
  const pendingToken = simulateToken(userId);
  await jest.advanceTimersByTimeAsync(SIMULATED_TOKEN_MAX_DELAY_MS);
  return pendingToken;
}

describe('simulateToken', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('token simulado', () => {
    it('tiene formato mock.<payload>.simulated con tres partes', async () => {
      const issuedToken = await simulateTokenAndFlush('42');
      const tokenParts = issuedToken.accessToken.split('.');

      expect(tokenParts).toHaveLength(3);
      expect(tokenParts[0]).toBe('mock');
      expect(tokenParts[2]).toBe('simulated');
      expect(issuedToken.accessToken.startsWith('mock.')).toBe(true);
      expect(issuedToken.accessToken.endsWith('.simulated')).toBe(true);
      expect(issuedToken.source).toBe('mock');
    });

    it('usa base64url sin padding y sin caracteres estándar "+", "/" o "="', async () => {
      const issuedToken = await simulateTokenAndFlush('42');

      expect(issuedToken.accessToken).toMatch(/^mock\.[A-Za-z0-9_-]+\.simulated$/);
    });

    it('el payload decodificado contiene userId, source "mock" e iat numérico', async () => {
      const issuedToken = await simulateTokenAndFlush('42');
      const encodedPayload = issuedToken.accessToken.split('.')[1] ?? '';
      const decodedPayload = decodeMockPayload(encodedPayload) as Record<string, unknown>;

      expect(decodedPayload.userId).toBe('42');
      expect(decodedPayload.source).toBe('mock');
      expect(typeof decodedPayload.iat).toBe('number');
    });

    it.each(['a', 'ab', 'abc', 'abcd', 'usuario-largo-con-guiones_y_guion_bajo'])(
      'codifica y decodifica correctamente userId "%s" (distintos restos de módulo 3)',
      async (userId) => {
        const issuedToken = await simulateTokenAndFlush(userId);
        const encodedPayload = issuedToken.accessToken.split('.')[1] ?? '';

        expect(decodeMockPayload(encodedPayload)).toMatchObject({ userId, source: 'mock' });
      },
    );

    it('codifica correctamente userId con caracteres no ASCII (UTF-8)', async () => {
      const issuedToken = await simulateTokenAndFlush('josé-ñandú-\u{10400}');
      const encodedPayload = issuedToken.accessToken.split('.')[1] ?? '';

      expect(decodeMockPayload(encodedPayload)).toMatchObject({ userId: 'josé-ñandú-\u{10400}' });
    });
  });

  describe('latencia simulada', () => {
    it('no resuelve antes del retardo mínimo y resuelve al alcanzarlo', async () => {
      // Math.random = 0 fija el retardo en SIMULATED_TOKEN_MIN_DELAY_MS.
      jest.spyOn(Math, 'random').mockReturnValue(0);
      let hasResolved = false;

      const pendingToken: Promise<AuthToken> = simulateToken('42').then((issuedToken) => {
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
      const midpointDelayMs =
        SIMULATED_TOKEN_MIN_DELAY_MS +
        (SIMULATED_TOKEN_MAX_DELAY_MS - SIMULATED_TOKEN_MIN_DELAY_MS) / 2;
      let hasResolved = false;

      const pendingToken: Promise<AuthToken> = simulateToken('42').then((issuedToken) => {
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
});
