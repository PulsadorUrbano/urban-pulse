// Tipos de la sesión del panel web.
import type { AuthToken } from './token';
import type { BackendPublicUserDto, SessionUser } from './user';

// Dónde se guarda la sesión en el navegador (el móvil usa SecureStore).
export interface SessionInfo {
  storage: 'localStorage' | 'sessionStorage';
  expiresAt: string | null;
}

export interface LoginResult {
  user: SessionUser;
  token: AuthToken;
  session: SessionInfo;
  // Aviso para la interfaz cuando el backend no responde y se usan datos simulados.
  notice: string | null;
}

export interface CurrentSession {
  user: SessionUser;
  token: AuthToken;
  session: SessionInfo;
}

export type BackendSessionValidation = 'valid' | 'invalid' | 'unknown';

export interface TokenVerification {
  valid: boolean;
  claims?: BackendPublicUserDto;
  error?: string;
}
