// Contratos de datos del token de acceso. Mismos nombres que frontend-mobile/src/types/token.ts.
import type { UserRole } from './user';

// Claims del JWT que firma el backend (backend/src/auth/token-payload.ts).
export interface TokenPayload {
  sub?: string;
  userId: string;
  username: string;
  role: UserRole;
  // Solo en el token simulado del mock.
  source?: 'mock';
  iat?: number;
  exp?: number;
}

// Origen del token: emitido por el backend real o generado localmente (mock).
export type TokenSource = 'backend' | 'mock';

// Token de acceso almacenado en la app, junto con su origen.
export interface AuthToken {
  accessToken: string;
  source: TokenSource;
}
