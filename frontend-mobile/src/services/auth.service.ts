import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import { simulateToken } from '@/services/token.service';
import type { AuthToken } from '@/types/token';
import type { BackendUser, LoginUserInput, MockUser, RegisterUserInput, User } from '@/types/user';
import { generateMockUuid } from '@/utils/uuid';

import { RequestTimeoutError, buildBackendRejectionMessage, fetchWithTimeout } from './http';

export const USERS_ENDPOINT = `${API_BASE_URL}/users`;
const BACKEND_LOGIN_ENDPOINT = `${BACKEND_API_URL}/auth/login`;
const BACKEND_REGISTER_ENDPOINT = `${BACKEND_API_URL}/auth/register`;
const BACKEND_ME_ENDPOINT = `${BACKEND_API_URL}/auth/me`;

const INVALID_CREDENTIALS_MESSAGE = 'El usuario o contraseña no son correctos, inténtelo de nuevo.';
const LOGIN_GENERIC_ERROR_MESSAGE = 'No se pudo iniciar sesión. Inténtalo de nuevo más tarde.';
const REGISTER_GENERIC_ERROR_MESSAGE = 'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.';
const USERNAME_TAKEN_MESSAGE = 'Ese nombre de usuario ya está en uso.';
const EMAIL_TAKEN_MESSAGE = 'Ese correo ya está registrado.';
const BACKEND_TAKEN_MESSAGE = 'Ese nombre de usuario, correo o teléfono ya está en uso.';

// Credenciales incorrectas; se distingue de errores de red/timeout para que
// solo este caso cuente como intento fallido.
export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

// Username o email ya registrados; se distingue cuál para dar un mensaje preciso
// en el camino mock (el backend real no distingue el campo duplicado).
export class UsernameOrEmailTakenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsernameOrEmailTakenError';
  }
}

export interface LoginResult {
  user: User;
  token: AuthToken | null;
  source: 'backend' | 'mock';
}

export interface RegisterResult {
  user: User;
  token: AuthToken | null;
  source: 'backend' | 'mock';
  // Solo true en el camino backend: el registro tuvo éxito pero el login
  // automático posterior (para obtener el token) falló. token es null en ese caso.
  autoLoginFailed?: boolean;
}

// Forma plana de un registro de `users` tal como lo devuelve json-server.
interface MockUserRecord {
  id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  civicId: string;
}

// DTO que devuelve el backend real en /auth/register, /auth/login (GET /auth/me) y /auth/me.
interface BackendPublicUserDto {
  userId: string;
  username: string;
  email: string;
  role: string;
  phone: string | null;
}

function toMockUser(record: MockUserRecord): MockUser {
  return { ...record, source: 'mock' };
}

// `civicId` se sintetiza igual a `userId`: el backend no conoce ese concepto
// (es del dominio de incidencias, 100% mock), pero my-incidents.tsx y new.tsx
// leen `user?.civicId` directamente, así que debe quedar siempre presente.
function toBackendUser(dto: BackendPublicUserDto): BackendUser {
  return {
    id: dto.userId,
    civicId: dto.userId,
    username: dto.username,
    email: dto.email,
    role: dto.role,
    phone: dto.phone,
    source: 'backend',
  };
}

// Traduce un fallo de conexión (timeout o red) a un Error con mensaje amigable.
function toConnectionError(error: unknown): Error {
  if (error instanceof RequestTimeoutError) {
    return new Error(
      'El servidor tardó demasiado en responder. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
    );
  }

  return new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
}

// Consulta usuarios del mock por un campo concreto y filtra en cliente por igualdad exacta.
async function fetchUsersByField(
  field: 'username' | 'email',
  value: string,
): Promise<MockUserRecord[]> {
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${USERS_ENDPOINT}?${field}=${encodeURIComponent(value)}`,
      { method: 'GET' },
    );
  } catch (error) {
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error(LOGIN_GENERIC_ERROR_MESSAGE);
  }

  const userList = (await response.json()) as MockUserRecord[];
  return userList.filter((user) => user[field] === value);
}

// Autentica contra el mock buscando por username y, si no hay match, por email.
async function loginOnMock(input: LoginUserInput): Promise<LoginResult> {
  const identifier = input.username_email.trim();

  let matchingUsers = await fetchUsersByField('username', identifier);

  if (matchingUsers.length === 0) {
    matchingUsers = await fetchUsersByField('email', identifier);
  }

  const matchedRecord = matchingUsers.find((user) => user.password === input.password);

  if (!matchedRecord) {
    throw new InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE);
  }

  const user = toMockUser(matchedRecord);
  const token = await simulateToken(user.id);
  return { user, token, source: 'mock' };
}

// Autentica contra el backend real intentando primero /auth/login y, si hay
// conexión, completando los datos de usuario con /auth/me. Cae al mock solo
// si no hay conexión (timeout/red) en cualquiera de las dos peticiones; un
// rechazo definitivo (401, u otro !ok) nunca cae al mock.
export async function login(input: LoginUserInput): Promise<LoginResult> {
  let loginResponse: Response;

  try {
    loginResponse = await fetchWithTimeout(BACKEND_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: input.username_email.trim(), password: input.password }),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return loginOnMock(input);
  }

  if (loginResponse.status === 401) {
    throw new InvalidCredentialsError(INVALID_CREDENTIALS_MESSAGE);
  }
  if (!loginResponse.ok) {
    throw new Error(await buildBackendRejectionMessage(loginResponse, LOGIN_GENERIC_ERROR_MESSAGE));
  }

  const { accessToken } = (await loginResponse.json()) as { accessToken: string };

  let meResponse: Response;
  try {
    meResponse = await fetchWithTimeout(BACKEND_ME_ENDPOINT, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth.service] /auth/me sin conexión tras login ok, fallback a mock:', error);
    }
    return loginOnMock(input);
  }

  if (!meResponse.ok) {
    // Anómalo (login válido pero /auth/me rechaza): se trata como fallo de
    // conexión con el backend, no como rechazo de credenciales.
    if (__DEV__) {
      console.warn(`[auth.service] /auth/me rechazó tras login ok (${meResponse.status}), fallback a mock.`);
    }
    return loginOnMock(input);
  }

  const user = toBackendUser((await meResponse.json()) as BackendPublicUserDto);
  return { user, token: { accessToken, source: 'backend' }, source: 'backend' };
}

// Crea un ciudadano nuevo en el mock tras comprobar que username y email están libres.
async function registerOnMock(input: RegisterUserInput): Promise<RegisterResult> {
  const username = input.username.trim();
  const email = input.email.trim();

  const existingByUsername = await fetchUsersByField('username', username);
  if (existingByUsername.length > 0) {
    throw new UsernameOrEmailTakenError(USERNAME_TAKEN_MESSAGE);
  }

  const existingByEmail = await fetchUsersByField('email', email);
  if (existingByEmail.length > 0) {
    throw new UsernameOrEmailTakenError(EMAIL_TAKEN_MESSAGE);
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(USERS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password: input.password,
        role: 'civic',
        civicId: generateMockUuid(),
      }),
    });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error(REGISTER_GENERIC_ERROR_MESSAGE);
  }

  const record = (await response.json()) as MockUserRecord;
  const user = toMockUser(record);
  const token = await simulateToken(user.id);
  return { user, token, source: 'mock' };
}

// Registra un ciudadano intentando primero el backend real. Cae al mock solo
// si no hay conexión con /auth/register (timeout/red); un rechazo definitivo
// (409, u otro !ok) nunca cae al mock. Una vez creado el usuario en el
// backend, nunca se cae al mock (duplicaría el usuario): si el login
// automático posterior falla, se devuelve `autoLoginFailed: true`.
export async function register(input: RegisterUserInput): Promise<RegisterResult> {
  const username = input.username.trim();
  const email = input.email.trim();
  const trimmedPhone = input.phone?.trim();

  let registerResponse: Response;
  try {
    registerResponse = await fetchWithTimeout(BACKEND_REGISTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password: input.password,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      }),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return registerOnMock(input);
  }

  if (registerResponse.status === 409) {
    throw new UsernameOrEmailTakenError(BACKEND_TAKEN_MESSAGE);
  }
  if (!registerResponse.ok) {
    throw new Error(await buildBackendRejectionMessage(registerResponse, REGISTER_GENERIC_ERROR_MESSAGE));
  }

  const user = toBackendUser((await registerResponse.json()) as BackendPublicUserDto);

  try {
    const autoLoginResponse = await fetchWithTimeout(BACKEND_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: username, password: input.password }),
    });

    if (!autoLoginResponse.ok) {
      if (__DEV__) {
        console.warn(`[auth.service] Cuenta creada pero login automático rechazado (${autoLoginResponse.status}).`);
      }
      return { user, token: null, source: 'backend', autoLoginFailed: true };
    }

    const { accessToken } = (await autoLoginResponse.json()) as { accessToken: string };
    return { user, token: { accessToken, source: 'backend' }, source: 'backend' };
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth.service] Cuenta creada pero login automático sin conexión:', error);
    }
    return { user, token: null, source: 'backend', autoLoginFailed: true };
  }
}

export type BackendSessionValidation = 'valid' | 'invalid' | 'unknown';

// Valida un token de origen backend contra /auth/me, usado al restaurar la
// sesión (use-session.ts). Sin conexión se devuelve 'unknown' (se confía en
// la sesión local); un 401 es un rechazo definitivo ('invalid'); cualquier
// otro fallo del servidor no es prueba de invalidez ('unknown').
export async function validateBackendSession(accessToken: string): Promise<BackendSessionValidation> {
  let response: Response;
  try {
    response = await fetchWithTimeout(BACKEND_ME_ENDPOINT, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return 'unknown';
  }

  if (response.status === 401) {
    return 'invalid';
  }
  if (!response.ok) {
    return 'unknown';
  }
  return 'valid';
}
