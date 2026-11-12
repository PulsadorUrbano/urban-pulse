// Autenticación del panel web contra el backend real, con el mismo patrón que
// frontend-mobile/src/services/auth.service.ts: real-first y respaldo al mock solo
// si no hay conexión. Un rechazo del backend (401 u otro !ok) nunca cae al mock.
import { resolveBackendApiUrl } from '../constants/config';
import { createMockToken, findMockUser, isMockToken, toMockSessionUser } from '../mocks/auth-mock';
import type {
  BackendSessionValidation,
  CurrentSession,
  LoginResult,
  TokenVerification,
} from '../types/auth';
import type { AuthToken } from '../types/token';
import type { BackendPublicUserDto, BackendUser, LoginUserInput, SessionUser, UserRole } from '../types/user';
import {
  bearerHeader,
  buildBackendRejectionMessage,
  fetchWithTimeout,
  isBackendUnavailable,
  isRecord,
  readJson,
} from './http';
import { clearSession, loadSession, saveSession } from './session-storage.service';
import { getTokenExpirationDate, isTokenExpired, isUserRole } from './token.service';

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.';
const LOGIN_GENERIC_ERROR_MESSAGE = 'No se pudo iniciar sesión. Inténtalo de nuevo más tarde.';
const CIVIC_ROLE_MESSAGE =
  'Las cuentas de ciudadanía acceden desde la app móvil; este panel es para el personal municipal.';
const BACKEND_UNAVAILABLE_MESSAGE = 'No se ha podido conectar con el servidor. Inténtalo de nuevo más tarde.';
export const OFFLINE_FALLBACK_NOTICE =
  'No se ha podido conectar al backend: la sesión se ha iniciado con datos simulados.';

const loginEndpoint = (): string => `${resolveBackendApiUrl()}/auth/login`;
const meEndpoint = (): string => `${resolveBackendApiUrl()}/auth/me`;

// Roles con acceso al panel web (ADR 0002): todo el personal municipal, no la ciudadanía.
export const WEB_PANEL_ROLES: readonly UserRole[] = [
  'admin',
  'administrative',
  'department',
  'team',
  'technician',
  'analyst',
];

export function canUseWebPanel(role: UserRole): boolean {
  return WEB_PANEL_ROLES.includes(role);
}

// Credenciales incorrectas; se distingue de los errores de red.
export class InvalidCredentialsError extends Error {
  constructor(message = INVALID_CREDENTIALS_MESSAGE) {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

// El usuario existe pero su rol no tiene acceso al panel web.
export class ForbiddenRoleError extends Error {
  constructor(message = CIVIC_ROLE_MESSAGE) {
    super(message);
    this.name = 'ForbiddenRoleError';
  }
}

function isLoginResponse(value: unknown): value is { accessToken: string } {
  return isRecord(value) && typeof value.accessToken === 'string' && value.accessToken.length > 0;
}

function isBackendPublicUserDto(value: unknown): value is BackendPublicUserDto {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    typeof value.username === 'string' &&
    typeof value.email === 'string' &&
    isUserRole(value.role) &&
    (value.phone === null || typeof value.phone === 'string')
  );
}

function toBackendUser(dto: BackendPublicUserDto): BackendUser {
  return {
    source: 'backend',
    id: dto.userId,
    username: dto.username,
    email: dto.email,
    role: dto.role,
    phone: dto.phone,
  };
}

type CurrentUserResult =
  | { status: 'ok'; dto: BackendPublicUserDto }
  | { status: 'invalid' }
  | { status: 'offline' }
  | { status: 'error'; httpStatus: number };

// Consulta GET /auth/me con el token dado.
async function fetchCurrentUser(accessToken: string): Promise<CurrentUserResult> {
  let response: Response;
  try {
    response = await fetchWithTimeout(meEndpoint(), { method: 'GET', headers: bearerHeader(accessToken) });
  } catch {
    return { status: 'offline' };
  }

  if (isBackendUnavailable(response)) return { status: 'offline' };
  if (response.status === 401) return { status: 'invalid' };
  if (!response.ok) return { status: 'error', httpStatus: response.status };
  return { status: 'ok', dto: await readJson(response, isBackendPublicUserDto, 'GET /auth/me') };
}

interface AuthOutcome {
  user: SessionUser;
  token: AuthToken;
  notice: string | null;
}

function loginOnMock(input: LoginUserInput): AuthOutcome {
  const found = findMockUser(input.usernameOrEmail, input.password);
  if (!found) throw new InvalidCredentialsError();
  const user = toMockSessionUser(found);
  return { user, token: createMockToken(user), notice: OFFLINE_FALLBACK_NOTICE };
}

// Sin conexión: los datos simulados solo existen en desarrollo. Con `import.meta.env.DEV`
// escrito aquí, Vite elimina del build de producción los usuarios y sus contraseñas.
function loginWithoutBackend(input: LoginUserInput): AuthOutcome {
  if (import.meta.env.DEV) {
    return loginOnMock(input);
  }
  throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
}

async function loginOnBackend(input: LoginUserInput): Promise<AuthOutcome> {
  let response: Response;
  try {
    response = await fetchWithTimeout(loginEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: input.usernameOrEmail, password: input.password }),
    });
  } catch {
    return loginWithoutBackend(input);
  }

  if (isBackendUnavailable(response)) return loginWithoutBackend(input);
  if (response.status === 401) throw new InvalidCredentialsError();
  if (!response.ok) {
    throw new Error(await buildBackendRejectionMessage(response, LOGIN_GENERIC_ERROR_MESSAGE));
  }

  const { accessToken } = await readJson(response, isLoginResponse, 'POST /auth/login');
  const me = await fetchCurrentUser(accessToken);
  if (me.status === 'offline') return loginWithoutBackend(input);
  if (me.status !== 'ok') throw new Error(LOGIN_GENERIC_ERROR_MESSAGE);

  return {
    user: toBackendUser(me.dto),
    token: { accessToken, source: 'backend' },
    notice: null,
  };
}

// Inicia sesión: backend real primero (POST /auth/login + GET /auth/me) y datos
// simulados solo si el backend no responde. Rechaza los roles sin acceso a la web.
export async function login(input: LoginUserInput): Promise<LoginResult> {
  const credentials: LoginUserInput = { ...input, usernameOrEmail: input.usernameOrEmail.trim() };
  const outcome = await loginOnBackend(credentials);

  if (!canUseWebPanel(outcome.user.role)) {
    throw new ForbiddenRoleError();
  }

  const session: CurrentSession = {
    user: outcome.user,
    token: outcome.token,
    session: {
      storage: credentials.rememberMe ? 'localStorage' : 'sessionStorage',
      expiresAt: getTokenExpirationDate(outcome.token.accessToken)?.toISOString() ?? null,
    },
  };
  saveSession(session);
  return { ...session, notice: outcome.notice };
}

export function logout(): void {
  clearSession();
}

// Sesión guardada en el navegador; descarta la que haya caducado.
export function getCurrentSession(): CurrentSession | null {
  const stored = loadSession();
  if (!stored) return null;
  const isMockOutsideDevelopment = stored.token.source === 'mock' && !import.meta.env.DEV;
  if (isMockOutsideDevelopment || isTokenExpired(stored.token.accessToken)) {
    clearSession();
    return null;
  }
  return stored;
}

// Valida un token del backend contra /auth/me (igual que validateBackendSession del
// móvil): sin conexión se devuelve 'unknown'; un 401 es definitivo ('invalid').
export async function validateBackendSession(accessToken: string): Promise<BackendSessionValidation> {
  const me = await fetchCurrentUser(accessToken);
  if (me.status === 'invalid') return 'invalid';
  if (me.status === 'ok') return 'valid';
  return 'unknown';
}

// Restaura la sesión al cargar la página. Un token del backend se revalida con
// GET /auth/me y se refrescan los datos del usuario; si el backend lo rechaza,
// se cierra la sesión; sin conexión se confía en la sesión guardada. Una sesión
// simulada se descarta en cuanto el backend responde, igual que en use-session.ts
// del móvil: esa identidad ya no sirve.
export async function restoreSession(): Promise<CurrentSession | null> {
  const current = getCurrentSession();
  if (!current) return null;

  if (current.token.source === 'mock') {
    const reachability = await validateBackendSession(current.token.accessToken);
    if (reachability === 'unknown') return current;
    clearSession();
    return null;
  }

  const me = await fetchCurrentUser(current.token.accessToken);
  if (me.status === 'invalid') {
    clearSession();
    return null;
  }
  if (me.status === 'ok') {
    const refreshed: CurrentSession = { ...current, user: toBackendUser(me.dto) };
    saveSession(refreshed);
    return refreshed;
  }
  return current;
}

// Comprueba un token contra GET /auth/me (consola técnica). Los tokens simulados no
// se envían al backend.
export async function verifyTokenWithBackend(accessToken: string): Promise<TokenVerification> {
  if (isTokenExpired(accessToken)) {
    const expiration = getTokenExpirationDate(accessToken);
    return {
      valid: false,
      error: `El token caducó el ${expiration?.toLocaleString() ?? 'momento indicado'}. Inicia sesión de nuevo.`,
    };
  }
  if (isMockToken(accessToken)) {
    return { valid: false, error: 'Token simulado (mock): no se puede verificar en el backend.' };
  }

  const me = await fetchCurrentUser(accessToken);
  switch (me.status) {
    case 'ok':
      return { valid: true, claims: me.dto };
    case 'offline':
      return { valid: false, error: 'No se pudo conectar con el backend.' };
    case 'invalid':
      return { valid: false, error: 'El backend rechazó el token (HTTP 401).' };
    case 'error':
      return { valid: false, error: `El backend rechazó el token (HTTP ${me.httpStatus}).` };
  }
}
