/**
 * Authentication type definitions for Urban Pulse.
 * Directly maps to PostgreSQL database schema (urbanPulse_diagram.sql)
 * and NestJS DTOs.
 */

// User roles according to PostgreSQL profile_role ENUM
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
  sub?: string;
  userId?: string;
  username: string;
  email?: string;
  role: ProfileRole;
  iss?: string;
  iat?: number;
  exp?: number;
}

export type TokenSource = 'backend' | 'mock';

export interface AuthTokens {
  accessToken: string; // Signed single JWT access token
  source: TokenSource;
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
  isOpen: boolean; // Cookie state (open / active vs closed / revoked)
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
  tokenSource: TokenSource;
  verifiedClaims?: {
    userId: string;
    username: string;
    role: ProfileRole;
  };
  cookie: CookieMetadata;
  message?: string;
}

export interface LogoutResponse {
  success: boolean;
  cookieCleared: boolean;
  message: string;
}
