import type { AuthToken, TokenPayload } from '../types/token';
import type { MockUser, SessionUser } from '../types/user';

/**
 * Datos simulados de autenticación. Solo se usan en desarrollo, como respaldo cuando el
 * backend no responde, igual que el mock de frontend-mobile. No llegan al build de producción. `admin` y `ciudadano` replican los
 * usuarios de backend/src/dev-seed/dev-seed.service.ts.
 */
export const MOCK_USERS: readonly MockUser[] = [
  {
    source: 'mock',
    id: '3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c',
    username: 'admin',
    email: 'admin@urbanpulse.dev',
    role: 'admin',
    fullName: 'Administrador General',
    departmentName: 'Dirección de Servicios e Infraestructuras',
    badgeNumber: 'ADM-0001',
    password: 'admin',
  },
  {
    source: 'mock',
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    username: 'alejandro',
    email: 'alejandro.sanchez@malaga.es',
    role: 'administrative',
    fullName: 'Alejandro Sánchez',
    departmentName: 'Gestión de Infraestructuras y Vías Públicas',
    badgeNumber: 'AG-8492',
    password: 'malaga2026',
  },
  {
    source: 'mock',
    id: 'e12bb45a-87ef-4931-bc62-7f93a1d94821',
    username: 'carlos.tecnico',
    email: 'carlos.martinez@malaga.es',
    role: 'technician',
    fullName: 'Carlos Martínez',
    departmentName: 'Brigada Operativa de Asfalto',
    badgeNumber: 'TEC-1102',
    password: 'malaga2026',
  },
  {
    source: 'mock',
    id: 'c89de23f-11ba-45c9-9401-2a6c8410e334',
    username: 'maria.analyst',
    email: 'maria.gomez@malaga.es',
    role: 'analyst',
    fullName: 'María Gómez',
    departmentName: 'Observatorio de Movilidad y Smart City',
    badgeNumber: 'ANA-3304',
    password: 'malaga2026',
  },
  {
    source: 'mock',
    id: '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6',
    username: 'ciudadano',
    email: 'ciudadano@urbanpulse.dev',
    role: 'civic',
    fullName: 'Ciudadano de prueba',
    password: 'ciudadano',
  },
];

// Busca por usuario o email (sin distinguir mayúsculas) y comprueba la contraseña.
export function findMockUser(usernameOrEmail: string, password: string): MockUser | null {
  const identifier = usernameOrEmail.trim().toLowerCase();
  const user = MOCK_USERS.find(
    (candidate) =>
      candidate.username.toLowerCase() === identifier || candidate.email.toLowerCase() === identifier,
  );
  return user && user.password === password ? user : null;
}

// Quita la contraseña antes de guardar el usuario en la sesión.
export function toMockSessionUser(user: MockUser): SessionUser {
  return {
    source: 'mock',
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    departmentName: user.departmentName,
    badgeNumber: user.badgeNumber,
  };
}

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Token simulado con el formato `mock.<payload>.simulated` (mismo formato que
// simulateToken en frontend-mobile). No lleva firma ni secreto: nunca puede pasar
// por un JWT del backend.
export function createMockToken(user: SessionUser, expirationHours = 24): AuthToken {
  const iat = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    userId: user.id,
    username: user.username,
    role: user.role,
    source: 'mock',
    iat,
    exp: iat + expirationHours * 3600,
  };
  return { accessToken: `mock.${encodeBase64Url(JSON.stringify(payload))}.simulated`, source: 'mock' };
}

export function isMockToken(accessToken: string): boolean {
  return accessToken.startsWith('mock.') && accessToken.endsWith('.simulated');
}
