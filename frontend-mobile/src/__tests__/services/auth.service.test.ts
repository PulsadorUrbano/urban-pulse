/// <reference types="jest" />
import { BACKEND_API_URL } from '@/constants/config';
import {
  InvalidCredentialsError,
  USERS_ENDPOINT,
  UsernameOrEmailTakenError,
  login,
  register,
  validateBackendSession,
} from '@/services/auth.service';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import { simulateToken } from '@/services/token.service';
import type { AuthToken } from '@/types/token';
import type { BackendUser, MockUser, RegisterUserInput } from '@/types/user';

// Mock de la capa HTTP: se conserva RequestTimeoutError real para que el
// servicio distinga los errores exactamente como en producción.
jest.mock('@/services/http', () => {
  const actualHttpModule = jest.requireActual<typeof import('@/services/http')>('@/services/http');
  return {
    ...actualHttpModule,
    fetchWithTimeout: jest.fn(),
  };
});

// El token simulado tiene su propio test dedicado (token.service.test.ts);
// aquí solo importa que auth.service lo invoque en el camino mock.
jest.mock('@/services/token.service', () => ({
  simulateToken: jest.fn(),
}));

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);
const simulateTokenMock = jest.mocked(simulateToken);

const BACKEND_LOGIN_ENDPOINT = `${BACKEND_API_URL}/auth/login`;
const BACKEND_REGISTER_ENDPOINT = `${BACKEND_API_URL}/auth/register`;
const BACKEND_ME_ENDPOINT = `${BACKEND_API_URL}/auth/me`;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Usuario de referencia que devuelve el servidor mock (json-server).
const ana: MockUser = {
  id: '1',
  username: 'ana_garcia',
  email: 'ana@example.com',
  password: 'Secreta123',
  role: 'civic',
  civicId: '0b9f3c1a-5d2e-4a7b-8c6d-9e0f1a2b3c4d',
  source: 'mock',
};

const mockTokenFixture: AuthToken = { accessToken: 'mock.token.simulated', source: 'mock' };

// Respuesta mínima compatible con lo que usa el servicio (ok/status + json/text).
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// Captura el error lanzado por una promesa rechazada para inspeccionarlo.
async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba que la promesa rechazara, pero resolvió');
}

beforeEach(() => {
  fetchWithTimeoutMock.mockReset();
  simulateTokenMock.mockReset();
  simulateTokenMock.mockResolvedValue(mockTokenFixture);
});

describe('login', () => {
  it('usa el endpoint de usuarios del servidor mock', () => {
    expect(USERS_ENDPOINT).toMatch(/\/users$/);
  });

  describe('camino backend (real-first)', () => {
    const backendUserDto = {
      userId: 'backend-1',
      username: 'ana_garcia',
      email: 'ana@example.com',
      role: 'civic',
      phone: '+34600111222',
    };

    const expectedBackendUser: BackendUser = {
      id: 'backend-1',
      username: 'ana_garcia',
      email: 'ana@example.com',
      role: 'civic',
      civicId: 'backend-1',
      phone: '+34600111222',
      source: 'backend',
    };

    it('login ok + /auth/me ok devuelve el usuario mapeado con source "backend"', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }))
        .mockResolvedValueOnce(jsonResponse(backendUserDto));

      const result = await login({ username_email: 'ana_garcia', password: 'Secreta123' });

      expect(result).toEqual({
        user: expectedBackendUser,
        token: { accessToken: 'jwt-real', source: 'backend' },
        source: 'backend',
      });
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);

      const [loginUrl, loginInit] = fetchWithTimeoutMock.mock.calls[0];
      expect(loginUrl).toBe(BACKEND_LOGIN_ENDPOINT);
      expect(loginInit?.method).toBe('POST');
      expect(JSON.parse(loginInit?.body as string)).toEqual({
        usernameOrEmail: 'ana_garcia',
        password: 'Secreta123',
      });

      const [meUrl, meInit] = fetchWithTimeoutMock.mock.calls[1];
      expect(meUrl).toBe(BACKEND_ME_ENDPOINT);
      expect(meInit?.headers).toEqual({ Authorization: 'Bearer jwt-real' });
      expect(simulateTokenMock).not.toHaveBeenCalled();
    });

    it('recorta espacios alrededor del identificador antes de enviarlo', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }))
        .mockResolvedValueOnce(jsonResponse(backendUserDto));

      await login({ username_email: '   ana_garcia  ', password: 'Secreta123' });

      const [, loginInit] = fetchWithTimeoutMock.mock.calls[0];
      expect(JSON.parse(loginInit?.body as string).usernameOrEmail).toBe('ana_garcia');
    });

    it('401 en /auth/login lanza InvalidCredentialsError sin caer al mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ message: 'Usuario o contraseña incorrectos' }, 401));

      const error = await captureRejection(login({ username_email: 'ana_garcia', password: 'mal' }));

      expect(error).toBeInstanceOf(InvalidCredentialsError);
      expect((error as Error).message).toBe('El usuario o contraseña no son correctos, inténtelo de nuevo.');
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('un !ok distinto de 401 en /auth/login lanza Error con el mensaje del backend, sin caer al mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ message: 'Campo no permitido: role' }, 400));

      const error = await captureRejection(login({ username_email: 'ana_garcia', password: 'Secreta123' }));

      expect(error).not.toBeInstanceOf(InvalidCredentialsError);
      expect((error as Error).message).toBe(
        'No se pudo iniciar sesión. Inténtalo de nuevo más tarde. (Campo no permitido: role)',
      );
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('login ok pero /auth/me responde !ok cae al mock (no es un rechazo de credenciales)', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }))
        .mockResolvedValueOnce(jsonResponse({}, 401))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const result = await login({ username_email: 'ana_garcia', password: 'Secreta123' });

      expect(result).toEqual({ user: ana, token: mockTokenFixture, source: 'mock' });
      expect(simulateTokenMock).toHaveBeenCalledWith(ana.id);
    });

    it('login ok pero /auth/me falla por conexión cae al mock', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }))
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const result = await login({ username_email: 'ana_garcia', password: 'Secreta123' });

      expect(result.source).toBe('mock');
    });
  });

  describe('camino mock (fallback por fallo de conexión en /auth/login)', () => {
    it('resuelve el usuario cuando el identificador coincide por username y la contraseña es correcta', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const result = await login({ username_email: 'ana_garcia', password: 'Secreta123' });

      expect(result).toEqual({ user: ana, token: mockTokenFixture, source: 'mock' });
      expect(fetchWithTimeoutMock.mock.calls[1][0]).toBe(`${USERS_ENDPOINT}?username=ana_garcia`);
    });

    it('si no hay match por username, busca por email y resuelve con el usuario correcto', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const result = await login({ username_email: 'ana@example.com', password: 'Secreta123' });

      expect(result.user).toEqual(ana);
      expect(fetchWithTimeoutMock.mock.calls[1][0]).toBe(`${USERS_ENDPOINT}?username=ana%40example.com`);
      expect(fetchWithTimeoutMock.mock.calls[2][0]).toBe(`${USERS_ENDPOINT}?email=ana%40example.com`);
    });

    it('lanza InvalidCredentialsError cuando la contraseña no coincide', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const error = await captureRejection(login({ username_email: 'ana_garcia', password: 'otra-contraseña' }));

      expect(error).toBeInstanceOf(InvalidCredentialsError);
      expect((error as Error).message).toBe('El usuario o contraseña no son correctos, inténtelo de nuevo.');
    });

    it('lanza InvalidCredentialsError cuando el usuario no existe (ambas búsquedas vacías)', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([]));

      const error = await captureRejection(login({ username_email: 'fantasma', password: 'cualquiera' }));

      expect(error).toBeInstanceOf(InvalidCredentialsError);
    });

    it('una respuesta HTTP no ok en la búsqueda del mock lanza el mensaje genérico de login', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse({}, 500));

      const error = await captureRejection(login({ username_email: 'ana_garcia', password: 'Secreta123' }));

      expect(error).not.toBeInstanceOf(InvalidCredentialsError);
      expect((error as Error).message).toBe('No se pudo iniciar sesión. Inténtalo de nuevo más tarde.');
    });

    it('un timeout (RequestTimeoutError) en la búsqueda del mock lanza el mensaje de servidor lento', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockRejectedValueOnce(new RequestTimeoutError());

      const error = await captureRejection(login({ username_email: 'ana_garcia', password: 'Secreta123' }));

      expect(error).not.toBeInstanceOf(InvalidCredentialsError);
      expect((error as Error).message).toContain('El servidor tardó demasiado en responder.');
    });
  });
});

describe('validateBackendSession', () => {
  it('devuelve "valid" cuando /auth/me responde ok', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({}));

    await expect(validateBackendSession('jwt-real')).resolves.toBe('valid');
    const [url, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(url).toBe(BACKEND_ME_ENDPOINT);
    expect(init?.headers).toEqual({ Authorization: 'Bearer jwt-real' });
  });

  it('devuelve "invalid" cuando /auth/me responde 401', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(validateBackendSession('jwt-real')).resolves.toBe('invalid');
  });

  it('devuelve "unknown" cuando no hay conexión', async () => {
    fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(validateBackendSession('jwt-real')).resolves.toBe('unknown');
  });

  it('devuelve "unknown" ante un fallo del servidor distinto de 401', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(validateBackendSession('jwt-real')).resolves.toBe('unknown');
  });
});

describe('register', () => {
  // Datos de un ciudadano nuevo que aún no existe en el mock.
  const nuevoInput: RegisterUserInput = {
    username: 'luis_perez',
    email: 'luis@example.com',
    password: 'OtraSecreta456',
  };

  // Usuario que devuelve json-server tras crear el registro (lleva id asignado).
  const luisCreado: MockUser = {
    id: '3',
    username: 'luis_perez',
    email: 'luis@example.com',
    password: 'OtraSecreta456',
    role: 'civic',
    civicId: '7d3e8f2a-1b4c-4d5e-9f60-a1b2c3d4e5f6',
    source: 'mock',
  };

  describe('camino backend (real-first)', () => {
    const backendUserDto = {
      userId: 'backend-3',
      username: 'luis_perez',
      email: 'luis@example.com',
      role: 'civic',
      phone: '+34600111222',
    };

    const expectedBackendUser: BackendUser = {
      id: 'backend-3',
      username: 'luis_perez',
      email: 'luis@example.com',
      role: 'civic',
      civicId: 'backend-3',
      phone: '+34600111222',
      source: 'backend',
    };

    it('registro ok + auto-login ok devuelve user y token con source "backend"', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse(backendUserDto, 201))
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }));

      const result = await register({ ...nuevoInput, phone: '+34600111222' });

      expect(result).toEqual({
        user: expectedBackendUser,
        token: { accessToken: 'jwt-real', source: 'backend' },
        source: 'backend',
      });

      const [registerUrl, registerInit] = fetchWithTimeoutMock.mock.calls[0];
      expect(registerUrl).toBe(BACKEND_REGISTER_ENDPOINT);
      expect(JSON.parse(registerInit?.body as string)).toEqual({
        username: 'luis_perez',
        email: 'luis@example.com',
        password: 'OtraSecreta456',
        phone: '+34600111222',
      });

      const [autoLoginUrl, autoLoginInit] = fetchWithTimeoutMock.mock.calls[1];
      expect(autoLoginUrl).toBe(BACKEND_LOGIN_ENDPOINT);
      expect(JSON.parse(autoLoginInit?.body as string)).toEqual({
        usernameOrEmail: 'luis_perez',
        password: 'OtraSecreta456',
      });
    });

    it('nunca envía el campo phone cuando no se proporciona', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse(backendUserDto, 201))
        .mockResolvedValueOnce(jsonResponse({ accessToken: 'jwt-real' }));

      await register(nuevoInput);

      const [, registerInit] = fetchWithTimeoutMock.mock.calls[0];
      const body = JSON.parse(registerInit?.body as string);
      expect(body).not.toHaveProperty('phone');
      expect(body).not.toHaveProperty('role');
    });

    it('409 lanza UsernameOrEmailTakenError con el mensaje genérico del backend, sin auto-login ni mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ message: 'conflicto' }, 409));

      const error = await captureRejection(register(nuevoInput));

      expect(error).toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe('Ese nombre de usuario, correo o teléfono ya está en uso.');
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('un !ok distinto de 409 lanza Error con el mensaje del backend, sin auto-login ni mock', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ message: 'password debe tener entre 8 y 72 bytes' }, 400));

      const error = await captureRejection(register(nuevoInput));

      expect(error).not.toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe(
        'No se pudo crear la cuenta. Inténtalo de nuevo más tarde. (password debe tener entre 8 y 72 bytes)',
      );
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('registro ok + auto-login falla por conexión devuelve autoLoginFailed:true sin tocar el mock', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse(backendUserDto, 201))
        .mockRejectedValueOnce(new TypeError('Network request failed'));

      const result = await register(nuevoInput);

      expect(result).toEqual({
        user: expectedBackendUser,
        token: null,
        source: 'backend',
        autoLoginFailed: true,
      });
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      const calledUrls = fetchWithTimeoutMock.mock.calls.map((call) => call[0]);
      expect(calledUrls).not.toContain(USERS_ENDPOINT);
    });

    it('registro ok + auto-login responde !ok devuelve autoLoginFailed:true sin tocar el mock', async () => {
      fetchWithTimeoutMock
        .mockResolvedValueOnce(jsonResponse(backendUserDto, 201))
        .mockResolvedValueOnce(jsonResponse({}, 401));

      const result = await register(nuevoInput);

      expect(result).toEqual({
        user: expectedBackendUser,
        token: null,
        source: 'backend',
        autoLoginFailed: true,
      });
    });
  });

  describe('camino mock (fallback por fallo de conexión en /auth/register)', () => {
    it('crea el usuario con POST cuando username y email están libres y devuelve el User creado', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse(luisCreado));

      const result = await register(nuevoInput);

      expect(result).toEqual({ user: luisCreado, token: mockTokenFixture, source: 'mock' });

      const [postUrl, postInit] = fetchWithTimeoutMock.mock.calls[3] as [string, RequestInit];
      expect(postUrl).toBe(USERS_ENDPOINT);
      expect(postInit.method).toBe('POST');
      expect(JSON.parse(postInit.body as string)).toEqual({
        username: 'luis_perez',
        email: 'luis@example.com',
        password: 'OtraSecreta456',
        role: 'civic',
        civicId: expect.stringMatching(UUID_V4_PATTERN),
      });
    });

    it('si el username ya existe lanza UsernameOrEmailTakenError con mensaje de username y no hace POST ni comprueba el email', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const error = await captureRejection(register({ ...nuevoInput, username: 'ana_garcia' }));

      expect(error).toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe('Ese nombre de usuario ya está en uso.');
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    });

    it('si el username está libre pero el email ya existe lanza UsernameOrEmailTakenError con mensaje de correo y no hace POST', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([ana]));

      const error = await captureRejection(register({ ...nuevoInput, email: 'ana@example.com' }));

      expect(error).toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe('Ese correo ya está registrado.');
      // La primera llamada es el intento fallido contra /auth/register (POST,
      // el que dispara el fallback); las siguientes, ya en el mock, no deben
      // incluir ningún POST (solo las búsquedas GET por username/email).
      const mockFallbackMethods = fetchWithTimeoutMock.mock.calls
        .slice(1)
        .map((call) => (call[1] as RequestInit | undefined)?.method);
      expect(mockFallbackMethods).not.toContain('POST');
    });

    it('un timeout (RequestTimeoutError) en la búsqueda inicial del mock lanza el mensaje de servidor lento', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockRejectedValueOnce(new RequestTimeoutError());

      const error = await captureRejection(register(nuevoInput));

      expect(error).not.toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toContain('El servidor tardó demasiado en responder.');
    });

    it('un fallo de red genérico en el POST del mock lanza el mensaje de conexión', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockRejectedValueOnce(new TypeError('Network request failed'));

      const error = await captureRejection(register(nuevoInput));

      expect(error).not.toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe(
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    });

    it('si la respuesta del POST del mock no es ok lanza el error genérico de creación de cuenta', async () => {
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse({}, 500));

      const error = await captureRejection(register(nuevoInput));

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(UsernameOrEmailTakenError);
      expect((error as Error).message).toBe('No se pudo crear la cuenta. Inténtalo de nuevo más tarde.');
    });
  });

  it('UsernameOrEmailTakenError tiene name "UsernameOrEmailTakenError" y es instanceof Error', () => {
    const error = new UsernameOrEmailTakenError('Ese correo ya está registrado.');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UsernameOrEmailTakenError);
    expect(error.name).toBe('UsernameOrEmailTakenError');
    expect(error.message).toBe('Ese correo ya está registrado.');
  });
});
