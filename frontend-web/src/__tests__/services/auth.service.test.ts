import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockToken, isMockToken, MOCK_USERS, toMockSessionUser } from '../../mocks/auth-mock';
import {
  canUseWebPanel,
  ForbiddenRoleError,
  getCurrentSession,
  InvalidCredentialsError,
  login,
  logout,
  OFFLINE_FALLBACK_NOTICE,
  restoreSession,
  validateBackendSession,
  verifyTokenWithBackend,
} from '../../services/auth.service';
import { BackendContractError } from '../../services/http';
import { SESSION_STORAGE_KEY, saveSession } from '../../services/session-storage.service';
import { decodeToken, getTokenExpirationDate, isTokenExpired } from '../../services/token.service';
import type { CurrentSession } from '../../types/auth';
import type { BackendPublicUserDto } from '../../types/user';

// Almacenamiento en memoria para localStorage y sessionStorage
function createMemoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

function toBase64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// JWT con la forma de los que emite el backend (la firma no se comprueba en el cliente)
function backendJwt(claims: object = {}, expInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    toBase64Url({ alg: 'HS256', typ: 'JWT' }),
    toBase64Url({ sub: 'u-1', userId: 'u-1', username: 'admin', role: 'admin', iat: now, exp: now + expInSeconds, ...claims }),
    'firma-del-backend',
  ].join('.');
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const adminDto: BackendPublicUserDto = {
  userId: '3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c',
  username: 'admin',
  email: 'admin@urbanpulse.dev',
  role: 'admin',
  phone: null,
};

const offline = () => vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

function backendSession(accessToken: string): CurrentSession {
  return {
    user: { source: 'backend', id: adminDto.userId, username: 'admin', email: adminDto.email, role: 'admin', phone: null },
    token: { accessToken, source: 'backend' },
    session: { storage: 'localStorage', expiresAt: null },
  };
}

describe('auth.service (frontend-web)', () => {
  let local: ReturnType<typeof createMemoryStorage>;
  let session: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    local = createMemoryStorage();
    session = createMemoryStorage();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('token', () => {
    it('el token simulado tiene el formato mock.<payload>.simulated y no lleva firma', () => {
      const { accessToken, source } = createMockToken(toMockSessionUser(MOCK_USERS[0]));
      const [prefix, , suffix] = accessToken.split('.');

      expect(source).toBe('mock');
      expect(prefix).toBe('mock');
      expect(suffix).toBe('simulated');
      expect(isMockToken(accessToken)).toBe(true);

      const { header, payload } = decodeToken(accessToken);
      expect(header).toBeNull();
      expect(payload?.userId).toBe(MOCK_USERS[0].id);
      expect(payload?.source).toBe('mock');
    });

    it('decodifica un JWT del backend y no lo considera simulado', () => {
      const token = backendJwt({ username: 'maria' });
      const { header, payload, signature } = decodeToken(token);

      expect(header?.alg).toBe('HS256');
      expect(payload?.username).toBe('maria');
      expect(signature).toBe('firma-del-backend');
      expect(isMockToken(token)).toBe(false);
    });

    it('no lanza con tokens mal formados ni con claims de otro contrato', () => {
      for (const token of ['', 'no-es-un-token', 'a.b.c.d', 'a.b.c']) {
        expect(decodeToken(token).payload).toBeNull();
      }
      expect(decodeToken(backendJwt({ role: 'superuser' })).payload).toBeNull();
    });

    it('detecta un token vigente, uno caducado y uno sin exp', () => {
      expect(isTokenExpired(backendJwt())).toBe(false);
      expect(isTokenExpired(backendJwt({}, -60))).toBe(true);
      expect(getTokenExpirationDate(backendJwt())?.getTime()).toBeGreaterThan(Date.now());
      expect(getTokenExpirationDate('token-invalido')).toBeNull();
    });
  });

  it('solo el personal municipal accede al panel web', () => {
    expect(canUseWebPanel('admin')).toBe(true);
    expect(canUseWebPanel('technician')).toBe(true);
    expect(canUseWebPanel('analyst')).toBe(true);
    expect(canUseWebPanel('civic')).toBe(false);
  });

  describe('login', () => {
    it('usa POST /auth/login y GET /auth/me y guarda el usuario del backend', async () => {
      const token = backendJwt();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: token }))
        .mockResolvedValueOnce(jsonResponse(200, adminDto));
      vi.stubGlobal('fetch', fetchMock);

      const result = await login({ usernameOrEmail: ' admin ', password: 'admin', rememberMe: true });

      const [loginUrl, loginInit] = fetchMock.mock.calls[0];
      expect(loginUrl).toBe('/api/auth/login');
      expect(loginInit.method).toBe('POST');
      expect(JSON.parse(loginInit.body)).toEqual({ usernameOrEmail: 'admin', password: 'admin' });

      const [meUrl, meInit] = fetchMock.mock.calls[1];
      expect(meUrl).toBe('/api/auth/me');
      expect(meInit.headers).toEqual({ Authorization: `Bearer ${token}` });

      expect(result.token).toEqual({ accessToken: token, source: 'backend' });
      expect(result.notice).toBeNull();
      expect(result.user).toEqual({
        source: 'backend',
        id: adminDto.userId,
        username: 'admin',
        email: adminDto.email,
        role: 'admin',
        phone: null,
      });
      expect(result.session.storage).toBe('localStorage');
      expect(local.setItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY, expect.any(String));
      expect(getCurrentSession()?.user.username).toBe('admin');
    });

    it('sin «mantener sesión» guarda la sesión en sessionStorage', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse(200, { accessToken: backendJwt() }))
          .mockResolvedValueOnce(jsonResponse(200, adminDto)),
      );

      const result = await login({ usernameOrEmail: 'admin', password: 'admin' });

      expect(result.session.storage).toBe('sessionStorage');
      expect(session.setItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY, expect.any(String));
    });

    it('respeta VITE_BACKEND_URL', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'https://api.urbanpulse.dev/');
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { accessToken: backendJwt() }))
        .mockResolvedValueOnce(jsonResponse(200, adminDto));
      vi.stubGlobal('fetch', fetchMock);

      await login({ usernameOrEmail: 'admin', password: 'admin' });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.urbanpulse.dev/auth/login');
    });

    it('un 401 se muestra como credenciales incorrectas y no cae al mock', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(401, { message: 'Usuario o contraseña incorrectos' }));
      vi.stubGlobal('fetch', fetchMock);

      // admin/admin existe en el mock: si cayera al mock, el login funcionaría.
      await expect(login({ usernameOrEmail: 'admin', password: 'admin' })).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(local.setItem).not.toHaveBeenCalled();
    });

    it('otro rechazo del backend muestra su mensaje y no cae al mock', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(400, { message: ['password must not be empty'] })));

      await expect(login({ usernameOrEmail: 'admin', password: 'admin' })).rejects.toThrow('password must not be empty');
    });

    it('rechaza una respuesta de login sin accessToken', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { token: 'otro-campo' })));

      await expect(login({ usernameOrEmail: 'admin', password: 'admin' })).rejects.toBeInstanceOf(BackendContractError);
    });

    it('sin conexión usa los datos simulados y devuelve un aviso', async () => {
      vi.stubGlobal('fetch', offline());

      const result = await login({ usernameOrEmail: 'admin', password: 'admin' });

      expect(result.token.source).toBe('mock');
      expect(isMockToken(result.token.accessToken)).toBe(true);
      expect(result.notice).toBe(OFFLINE_FALLBACK_NOTICE);
      expect(result.user).not.toHaveProperty('password');
    });

    it('un 502 del proxy (backend apagado) cuenta como falta de conexión', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 502 })));

      const result = await login({ usernameOrEmail: 'admin', password: 'admin' });

      expect(result.token.source).toBe('mock');
    });

    it('sin conexión, unas credenciales incorrectas siguen fallando', async () => {
      vi.stubGlobal('fetch', offline());

      await expect(login({ usernameOrEmail: 'admin', password: 'mal' })).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rechaza a la ciudadanía y no guarda sesión', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(jsonResponse(200, { accessToken: backendJwt({ role: 'civic' }) }))
          .mockResolvedValueOnce(jsonResponse(200, { ...adminDto, username: 'ciudadano', role: 'civic' })),
      );

      await expect(login({ usernameOrEmail: 'ciudadano', password: 'ciudadano' })).rejects.toBeInstanceOf(ForbiddenRoleError);
      expect(local.setItem).not.toHaveBeenCalled();
      expect(session.setItem).not.toHaveBeenCalled();
    });
  });

  describe('sesión guardada', () => {
    it('descarta la sesión si el token ha caducado', () => {
      saveSession(backendSession(backendJwt({}, -60)));

      expect(getCurrentSession()).toBeNull();
      expect(local.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });

    it('descarta una sesión guardada con otra forma', () => {
      local.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: { id: 1 }, token: 'x' }));

      expect(getCurrentSession()).toBeNull();
    });

    it('logout borra la sesión de ambos almacenamientos', () => {
      saveSession(backendSession(backendJwt()));

      logout();

      expect(local.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
      expect(session.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
      expect(getCurrentSession()).toBeNull();
    });

    it('restoreSession cierra la sesión si el backend rechaza el token (401)', async () => {
      saveSession(backendSession(backendJwt()));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(401)));

      expect(await restoreSession()).toBeNull();
      expect(getCurrentSession()).toBeNull();
    });

    it('restoreSession conserva la sesión si no hay conexión', async () => {
      const token = backendJwt();
      saveSession(backendSession(token));
      vi.stubGlobal('fetch', offline());

      expect((await restoreSession())?.token.accessToken).toBe(token);
    });

    it('restoreSession actualiza el usuario con los datos de /auth/me', async () => {
      saveSession(backendSession(backendJwt()));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { ...adminDto, email: 'nuevo@urbanpulse.dev' })));

      expect((await restoreSession())?.user.email).toBe('nuevo@urbanpulse.dev');
      expect(getCurrentSession()?.user.email).toBe('nuevo@urbanpulse.dev');
    });

    it('restoreSession no llama al backend con un token simulado', async () => {
      const user = toMockSessionUser(MOCK_USERS[0]);
      saveSession({ user, token: createMockToken(user), session: { storage: 'localStorage', expiresAt: null } });
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await restoreSession();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('validateBackendSession distingue válido, inválido y sin conexión', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, adminDto)));
      expect(await validateBackendSession(backendJwt())).toBe('valid');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(401)));
      expect(await validateBackendSession(backendJwt())).toBe('invalid');

      vi.stubGlobal('fetch', offline());
      expect(await validateBackendSession(backendJwt())).toBe('unknown');
    });
  });

  describe('verifyTokenWithBackend', () => {
    it('rechaza un token caducado o simulado sin llamar al backend', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      expect((await verifyTokenWithBackend(backendJwt({}, -60))).error).toContain('caducó');
      const mockToken = createMockToken(toMockSessionUser(MOCK_USERS[0])).accessToken;
      expect((await verifyTokenWithBackend(mockToken)).error).toContain('simulado');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve los datos de /auth/me cuando el backend acepta el token', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, adminDto)));

      expect(await verifyTokenWithBackend(backendJwt())).toEqual({ valid: true, claims: adminDto });
    });

    it('informa del rechazo (401) y de la falta de conexión', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(401)));
      expect((await verifyTokenWithBackend(backendJwt())).error).toContain('401');

      vi.stubGlobal('fetch', offline());
      expect((await verifyTokenWithBackend(backendJwt())).error).toContain('conectar');
    });
  });
});
