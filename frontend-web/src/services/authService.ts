import { 
  User, 
  LoginCredentials, 
  LoginResponse, 
  LogoutResponse, 
  JwtPayload, 
  JwtHeader, 
  CookieMetadata 
} from '../types/auth';

// Usuarios institucionales registrados en la base de datos PostgreSQL
export const MOCK_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    username: 'alejandro',
    email: 'alejandro.sanchez@malaga.es',
    fullName: 'Alejandro Sánchez',
    role: 'administrative',
    departmentName: 'Gestión de Infraestructuras y Vías Públicas',
    badgeNumber: 'AG-8492',
    passwordHash: 'malaga2026' // Para demostración institucional
  },
  {
    id: 'e12bb45a-87ef-4931-bc62-7f93a1d94821',
    username: 'carlos.tecnico',
    email: 'carlos.martinez@malaga.es',
    fullName: 'Carlos Martínez',
    role: 'technician',
    departmentName: 'Brigada Operativa de Asfalto',
    badgeNumber: 'TEC-1102',
    passwordHash: 'malaga2026'
  },
  {
    id: 'c89de23f-11ba-45c9-9401-2a6c8410e334',
    username: 'maria.analyst',
    email: 'maria.gomez@malaga.es',
    fullName: 'María Gómez',
    role: 'analyst',
    departmentName: 'Observatorio de Movilidad y Smart City',
    badgeNumber: 'ANA-3304',
    passwordHash: 'malaga2026'
  }
];

// Función utilitaria para codificar en Base64Url (estándar JWT RFC 7519)
const toBase64Url = (obj: object): string => {
  const jsonStr = JSON.stringify(obj);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Generador de Token JWT único conforme al estándar RFC 7519
export const generateUniqueJwtToken = (user: User, expirationHours = 8): { token: string; header: JwtHeader; payload: JwtPayload } => {
  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iss: 'urban-pulse-nest-api',
    iat: nowSeconds,
    exp: nowSeconds + (expirationHours * 3600)
  };

  const encodedHeader = toBase64Url(header);
  const encodedPayload = toBase64Url(payload);
  // Firma criptográfica simulada con clave secreta de NestJS
  const mockSignature = toBase64Url({ sig: 'nest_secret_hmac_sha256_verified_' + user.id.slice(0, 8) });

  const token = `${encodedHeader}.${encodedPayload}.${mockSignature}`;
  return { token, header, payload };
};

// Decodificador seguro de JWT para inspección visual en frontend
export const parseJwt = (token: string): { header: JwtHeader | null; payload: JwtPayload | null; signature: string } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { header: null, payload: null, signature: '' };
    
    const decodePart = (str: string) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    };

    return {
      header: decodePart(parts[0]),
      payload: decodePart(parts[1]),
      signature: parts[2]
    };
  } catch (e) {
    return { header: null, payload: null, signature: '' };
  }
};

/**
 * Servicio de Autenticación compatible con NestJS API REST
 */
export const authService = {
  /**
   * Inicia sesión (Login), genera el JWT único y simula la APERTURA de la Cookie de sesión HttpOnly.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const identifier = credentials.usernameOrEmail.trim().toLowerCase();
        const found = MOCK_USERS.find(
          u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
        );

        if (!found) {
          reject(new Error('Credenciales inválidas. Usuario no registrado en el sistema municipal.'));
          return;
        }

        if (credentials.password !== found.passwordHash) {
          reject(new Error('Contraseña incorrecta. Verifique sus credenciales institucionales.'));
          return;
        }

        // 1. Generación de Único Token JWT
        const { token, payload } = generateUniqueJwtToken(found, credentials.rememberMe ? 24 : 8);

        // 2. Apertura de Cookie de sesión (Set-Cookie en NestJS)
        const maxAge = credentials.rememberMe ? 86400 : 28800;
        const expiresDate = new Date(Date.now() + maxAge * 1000).toUTCString();

        const cookieInfo: CookieMetadata = {
          name: 'access_token',
          value: token,
          httpOnly: true, // Protege contra XSS: no accesible vía document.cookie
          secure: true,   // Solo viaja por HTTPS
          sameSite: 'strict', // Protege contra ataques CSRF
          path: '/',
          maxAgeSeconds: maxAge,
          expiresAt: expiresDate,
          isOpen: true
        };

        // Guardamos metadatos de sesión (en producción la cookie HttpOnly la maneja el browser)
        localStorage.setItem('urban_pulse_session_meta', JSON.stringify({
          userId: found.id,
          username: found.username,
          role: found.role,
          token: token,
          cookieIsOpen: true,
          expiresAt: expiresDate
        }));

        resolve({
          success: true,
          user: found,
          token,
          cookie: cookieInfo,
          message: 'Sesión iniciada correctamente. Token JWT emitido y cookie establecida.'
        });
      }, 500);
    });
  },

  /**
   * Cierra sesión (Logout): Realiza el CIERRE de la Cookie (Set-Cookie: access_token=; Max-Age=0)
   * e invalida el token JWT.
   */
  async logout(): Promise<LogoutResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem('urban_pulse_session_meta');
        
        resolve({
          success: true,
          cookieCleared: true,
          message: 'Sesión cerrada. Cookie revocada (Max-Age=0) y token invalidado en el servidor.'
        });
      }, 400);
    });
  },

  /**
   * Recupera el estado actual de la sesión si existe una cookie activa
   */
  getCurrentSession(): { user: User | null; token: string | null; cookieInfo: CookieMetadata | null } {
    try {
      const raw = localStorage.getItem('urban_pulse_session_meta');
      if (!raw) return { user: null, token: null, cookieInfo: null };
      const parsed = JSON.parse(raw);
      const user = MOCK_USERS.find(u => u.id === parsed.userId) || null;
      if (!user) return { user: null, token: null, cookieInfo: null };

      const cookieInfo: CookieMetadata = {
        name: 'access_token',
        value: parsed.token,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAgeSeconds: 28800,
        expiresAt: parsed.expiresAt,
        isOpen: parsed.cookieIsOpen
      };

      return { user, token: parsed.token, cookieInfo };
    } catch {
      return { user: null, token: null, cookieInfo: null };
    }
  }
};
