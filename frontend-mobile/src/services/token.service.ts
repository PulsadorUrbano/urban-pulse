import type { AuthToken } from '@/types/token';

// Rango de latencia simulada (ms) para el token generado localmente.
export const SIMULATED_TOKEN_MIN_DELAY_MS = 300;
export const SIMULATED_TOKEN_MAX_DELAY_MS = 600;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Claims mínimos del token simulado (no es un JWT real).
interface MockTokenPayload {
  userId: string;
  source: 'mock';
  iat: number;
}

// Codifica texto a base64url (sin padding) sin depender de `btoa`/`Buffer`.
// Convierte primero a bytes UTF-8 para soportar caracteres no ASCII.
function encodeBase64Url(text: string): string {
  const bytes = Array.from(unescape(encodeURIComponent(text)), (char) => char.charCodeAt(0));
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    encoded += BASE64_ALPHABET[first >> 2];
    encoded += BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)];

    if (second !== undefined) {
      encoded += BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)];
    }

    if (third !== undefined) {
      encoded += BASE64_ALPHABET[third & 63];
    }
  }

  return encoded;
}

// Genera un token local de respaldo tras una latencia de red simulada, para
// el camino mock de login/registro (auth.service.ts). El token real para el
// camino backend viene embebido en la respuesta de /auth/login, no de aquí.
// Formato: mock.<base64url(payload)>.simulated (sin criptografía real).
export async function simulateToken(userId: string): Promise<AuthToken> {
  const delayMs =
    SIMULATED_TOKEN_MIN_DELAY_MS +
    Math.random() * (SIMULATED_TOKEN_MAX_DELAY_MS - SIMULATED_TOKEN_MIN_DELAY_MS);

  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));

  const payload: MockTokenPayload = { userId, source: 'mock', iat: Math.floor(Date.now() / 1000) };

  return {
    accessToken: `mock.${encodeBase64Url(JSON.stringify(payload))}.simulated`,
    source: 'mock',
  };
}
