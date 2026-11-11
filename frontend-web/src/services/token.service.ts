// Utilidades del token de acceso: decodificar claims y comprobar caducidad.
// El token simulado se genera en src/mocks/auth-mock.ts (createMockToken).
import type { TokenPayload } from '../types/token';
import type { UserRole } from '../types/user';
import { isRecord } from './http';

const USER_ROLES: readonly UserRole[] = [
  'administrative',
  'department',
  'team',
  'technician',
  'civic',
  'admin',
  'analyst',
];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export interface DecodedToken {
  header: Record<string, unknown> | null;
  payload: TokenPayload | null;
  signature: string;
}

function decodeBase64Url(part: string): unknown {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function decodePart(part: string): unknown {
  try {
    return decodeBase64Url(part);
  } catch {
    return null;
  }
}

function isTokenPayload(value: unknown): value is TokenPayload {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    typeof value.username === 'string' &&
    isUserRole(value.role) &&
    (value.exp === undefined || typeof value.exp === 'number') &&
    (value.iat === undefined || typeof value.iat === 'number')
  );
}

// Decodifica un JWT del backend o un token simulado (`mock.<payload>.simulated`) sin lanzar.
export function decodeToken(accessToken: string): DecodedToken {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return { header: null, payload: null, signature: '' };

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  const validPayload = isTokenPayload(payload) ? payload : null;
  return {
    header: isRecord(header) ? header : null,
    payload: validPayload,
    signature: validPayload ? parts[2] : '',
  };
}

export function getTokenExpirationDate(accessToken: string): Date | null {
  const exp = decodeToken(accessToken).payload?.exp;
  return exp === undefined ? null : new Date(exp * 1000);
}

export function isTokenExpired(accessToken: string, now = Date.now()): boolean {
  const expiration = getTokenExpirationDate(accessToken);
  return expiration !== null && expiration.getTime() < now;
}
