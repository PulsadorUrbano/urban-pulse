// Persistencia de la sesión en el navegador. Equivale a token-storage.service.ts y
// session-user-storage.service.ts del móvil, que usan SecureStore.
import type { CurrentSession, SessionInfo } from '../types/auth';
import type { SessionUser } from '../types/user';
import { isRecord } from './http';
import { isUserRole } from './token.service';

export const SESSION_STORAGE_KEY = 'urban_pulse_session_meta';

type StorageKind = SessionInfo['storage'];
const STORAGE_KINDS: readonly StorageKind[] = ['localStorage', 'sessionStorage'];

function storageFor(kind: StorageKind): Storage {
  return kind === 'localStorage' ? localStorage : sessionStorage;
}

function isSessionUser(value: unknown): value is SessionUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.email !== 'string' ||
    !isUserRole(value.role)
  ) {
    return false;
  }
  if (value.source === 'backend') {
    return value.phone === null || typeof value.phone === 'string';
  }
  return value.source === 'mock' && typeof value.fullName === 'string' && !('password' in value);
}

function isCurrentSession(value: unknown): value is CurrentSession {
  if (!isRecord(value) || !isSessionUser(value.user)) return false;
  const { token, session } = value;
  return (
    isRecord(token) &&
    typeof token.accessToken === 'string' &&
    (token.source === 'backend' || token.source === 'mock') &&
    isRecord(session) &&
    (session.storage === 'localStorage' || session.storage === 'sessionStorage') &&
    (session.expiresAt === null || typeof session.expiresAt === 'string')
  );
}

// Devuelve la sesión guardada; descarta contenido corrupto o con otra forma.
export function loadSession(): CurrentSession | null {
  for (const kind of STORAGE_KINDS) {
    let raw: string | null;
    try {
      raw = storageFor(kind).getItem(SESSION_STORAGE_KEY);
    } catch {
      continue;
    }
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isCurrentSession(parsed)) return parsed;
    } catch {
      // Contenido no JSON: se trata como sesión inexistente.
    }
  }
  return null;
}

export function saveSession(session: CurrentSession): void {
  clearSession();
  storageFor(session.session.storage).setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  for (const kind of STORAGE_KINDS) {
    try {
      storageFor(kind).removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible.
    }
  }
}
