/**
 * Definiciones de tipos para autenticación en Urban Pulse.
 * Mapean directamente con la base de datos PostgreSQL (urbanPulse_diagram.sql)
 * y los DTOs de NestJS.
 */

// Roles de usuario según el ENUM profile_role de PostgreSQL
export type ProfileRole = 
  | 'administrative'
  | 'department'
  | 'team'
  | 'technician'
  | 'civic'
  | 'admin'
  | 'analyst';

export interface User {
  id: string; // UUID
  username: string;
  email: string;
  fullName: string;
  role: ProfileRole;
  departmentName?: string;
  badgeNumber?: string;
}

export interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  sub: string; // User UUID
  username: string;
  email: string;
  role: ProfileRole;
  iss: 'urban-pulse-nest-api';
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

export interface AuthTokens {
  accessToken: string; // Token JWT único firmado
}

export interface CookieMetadata {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAgeSeconds: number;
  expiresAt: string;
  isOpen: boolean; // Estado de la cookie (abierta / cerrada)
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  cookie: CookieMetadata;
  message?: string;
}

export interface LogoutResponse {
  success: boolean;
  cookieCleared: boolean;
  message: string;
}
