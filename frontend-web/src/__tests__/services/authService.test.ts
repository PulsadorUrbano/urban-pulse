import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  authService, 
  generateUniqueJwtToken, 
  parseJwt, 
  signHmacSha256, 
  MOCK_USERS 
} from '../../services/authService';
import { User } from '../../types/auth';

// In-memory mock for localStorage in test environment
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
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
    key: vi.fn((idx: number) => Object.keys(store)[idx] || null)
  };
};

describe('authService - Frontend Web JWT & Authentication Unit Tests', () => {
  const mockStorage = createMockLocalStorage();
  const testAdminUser: User = MOCK_USERS[0]; // Admin user seeded in NestJS backend

  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage);
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('signHmacSha256', () => {
    it('produces a reproducible base64url HMAC-SHA256 signature using the secret', async () => {
      const data = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
      const sig1 = await signHmacSha256(data, 'test-secret');
      const sig2 = await signHmacSha256(data, 'test-secret');
      
      expect(sig1).toBeDefined();
      expect(sig1.length).toBeGreaterThan(10);
      expect(sig1).toBe(sig2);
    });

    it('produces different signatures for different secrets or data payloads', async () => {
      const data = 'header.payload';
      const sigA = await signHmacSha256(data, 'secret-a');
      const sigB = await signHmacSha256(data, 'secret-b');

      expect(sigA).not.toBe(sigB);
    });
  });

  describe('generateUniqueJwtToken', () => {
    it('generates a 3-part RFC 7519 compliant JWT string', async () => {
      const { token, header, payload } = await generateUniqueJwtToken(testAdminUser);

      expect(token).toBeDefined();
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      expect(payload.userId).toBe(testAdminUser.id);
      expect(payload.username).toBe(testAdminUser.username);
      expect(payload.role).toBe(testAdminUser.role);
      expect(payload.iss).toBe('urban-pulse-nest-api');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat!);
    });

    it('sets the expiration according to the specified hours parameter', async () => {
      const hours = 48;
      const { payload } = await generateUniqueJwtToken(testAdminUser, hours);
      const expectedDiff = hours * 3600;

      expect(payload.exp! - payload.iat!).toBe(expectedDiff);
    });
  });

  describe('parseJwt', () => {
    it('correctly decodes header, payload and signature from a valid JWT', async () => {
      const { token } = await generateUniqueJwtToken(testAdminUser);
      const decoded = parseJwt(token);

      expect(decoded.header?.alg).toBe('HS256');
      expect(decoded.payload?.username).toBe(testAdminUser.username);
      expect(decoded.payload?.role).toBe(testAdminUser.role);
      expect(decoded.signature).toBeDefined();
    });

    it('gracefully handles malformed tokens without throwing exceptions', () => {
      const resultA = parseJwt('not-a-token');
      expect(resultA.header).toBeNull();
      expect(resultA.payload).toBeNull();

      const resultB = parseJwt('a.b.c.d');
      expect(resultB.header).toBeNull();
      expect(resultB.payload).toBeNull();

      const resultC = parseJwt('');
      expect(resultC.header).toBeNull();
      expect(resultC.payload).toBeNull();
    });
  });

  describe('isTokenExpired and getTokenExpirationDate', () => {
    it('returns false for newly generated tokens valid for 24h', async () => {
      const { token } = await generateUniqueJwtToken(testAdminUser, 24);
      expect(authService.isTokenExpired(token)).toBe(false);

      const expDate = authService.getTokenExpirationDate(token);
      expect(expDate).toBeInstanceOf(Date);
      expect(expDate!.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns true when a token expiration timestamp is in the past', () => {
      // Create token expired 1 hour ago
      const expiredPayload = {
        userId: '123',
        username: 'admin',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) - 3600
      };
      const headerStr = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadStr = btoa(JSON.stringify(expiredPayload));
      const expiredToken = `${headerStr}.${payloadStr}.fakeSignature`;

      expect(authService.isTokenExpired(expiredToken)).toBe(true);

      const expDate = authService.getTokenExpirationDate(expiredToken);
      expect(expDate).toBeInstanceOf(Date);
      expect(expDate!.getTime()).toBeLessThan(Date.now());
    });

    it('returns null / false when token has no exp or is invalid', () => {
      expect(authService.isTokenExpired('invalid-token')).toBe(false);
      expect(authService.getTokenExpirationDate('invalid-token')).toBeNull();
    });
  });

  describe('requestToken', () => {
    it('returns backend token when POST /auth/token succeeds with 200 OK', async () => {
      const mockBackendToken = 'eyJhbGciOiJIUzI1NiJ9.backend_payload.signature';
      const mockVerifiedClaims = {
        userId: testAdminUser.id,
        username: testAdminUser.username,
        role: testAdminUser.role
      };

      const fetchMock = vi.fn()
        .mockImplementationOnce(async (url: string) => {
          if (url.includes('/auth/token')) {
            return {
              ok: true,
              json: async () => ({ accessToken: mockBackendToken })
            } as Response;
          }
          return { ok: false } as Response;
        })
        .mockImplementationOnce(async (url: string) => {
          if (url.includes('/auth/me')) {
            return {
              ok: true,
              json: async () => mockVerifiedClaims
            } as Response;
          }
          return { ok: false } as Response;
        });

      vi.stubGlobal('fetch', fetchMock);

      const result = await authService.requestToken(testAdminUser);

      expect(result.token).toBe(mockBackendToken);
      expect(result.source).toBe('backend');
      expect(result.verifiedClaims).toEqual(mockVerifiedClaims);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('falls back gracefully to local JWT when backend is unreachable or throws error', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await authService.requestToken(testAdminUser);

      expect(result.token).toBeDefined();
      expect(result.source).toBe('mock');
      expect(result.token.split('.')).toHaveLength(3);

      const decoded = parseJwt(result.token);
      expect(decoded.payload?.userId).toBe(testAdminUser.id);
    });
  });

  describe('verifyTokenWithBackend', () => {
    it('rejects expired tokens immediately without calling the backend', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const validHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 100 };
      const token = `${validHeader}.${btoa(JSON.stringify(expiredPayload))}.sig`;

      const result = await authService.verifyTokenWithBackend(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token expired');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns valid: true when NestJS backend responds 200 OK', async () => {
      const { token } = await generateUniqueJwtToken(testAdminUser);
      const mockClaims = { userId: testAdminUser.id, username: 'admin', role: 'admin' };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockClaims
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await authService.verifyTokenWithBackend(token);

      expect(result.valid).toBe(true);
      expect(result.claims).toEqual(mockClaims);
    });

    it('returns valid: false when backend rejects the token with 401 Unauthorized', async () => {
      const { token } = await generateUniqueJwtToken(testAdminUser);

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await authService.verifyTokenWithBackend(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Backend rejected the token (HTTP 401)');
    });
  });

  describe('login, logout, and getCurrentSession lifecycle', () => {
    it('authenticates valid credentials, creates session metadata and simulates HttpOnly cookie', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Backend offline'));
      vi.stubGlobal('fetch', fetchMock);

      const response = await authService.login({
        usernameOrEmail: 'admin',
        password: 'admin',
        rememberMe: true
      });

      expect(response.success).toBe(true);
      expect(response.user.username).toBe('admin');
      expect(response.token).toBeDefined();
      expect(response.cookie.isOpen).toBe(true);
      expect(response.cookie.httpOnly).toBe(true);
      expect(response.cookie.secure).toBe(true);
      expect(response.cookie.sameSite).toBe('strict');
      expect(response.cookie.maxAgeSeconds).toBe(86400); // 24h for rememberMe

      // Check localStorage persistence
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'urban_pulse_session_meta',
        expect.any(String)
      );

      // Session can be retrieved
      const current = authService.getCurrentSession();
      expect(current.user?.id).toBe(testAdminUser.id);
      expect(current.token).toBe(response.token);
      expect(current.cookieInfo?.isOpen).toBe(true);
    });

    it('rejects unknown users', async () => {
      await expect(authService.login({
        usernameOrEmail: 'nonexistent_user',
        password: 'password'
      })).rejects.toThrow('Invalid credentials. User not found in system.');
    });

    it('rejects incorrect passwords', async () => {
      await expect(authService.login({
        usernameOrEmail: 'admin',
        password: 'wrong_password'
      })).rejects.toThrow('Incorrect password. Please verify institutional credentials.');
    });

    it('clears session from localStorage on logout', async () => {
      const res = await authService.logout();

      expect(res.success).toBe(true);
      expect(res.cookieCleared).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith('urban_pulse_session_meta');

      const current = authService.getCurrentSession();
      expect(current.user).toBeNull();
      expect(current.token).toBeNull();
    });

    it('automatically invalidates session if stored token has expired', () => {
      const validHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const expiredPayload = {
        userId: testAdminUser.id,
        exp: Math.floor(Date.now() / 1000) - 500
      };
      const token = `${validHeader}.${btoa(JSON.stringify(expiredPayload))}.sig`;

      mockStorage.getItem.mockReturnValue(JSON.stringify({
        userId: testAdminUser.id,
        token,
        cookieIsOpen: true
      }));

      const current = authService.getCurrentSession();
      expect(current.user).toBeNull();
      expect(current.token).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('urban_pulse_session_meta');
    });
  });
});
