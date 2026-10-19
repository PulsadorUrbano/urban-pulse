// Contratos de datos para la integración del token de acceso.
import type { UserRole } from './user';

// Contenido (claims) del JWT. Espejo del payload que genera el backend.
export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Cuerpo de la petición al backend para generar un token.
export interface CreateTokenRequest {
  userId: string;
}

// Respuesta del backend al generar un token.
export interface CreateTokenResponse {
  accessToken: string;
}

// Origen del token: emitido por el backend real o generado localmente (mock).
export type TokenSource = 'backend' | 'mock';

// Token de acceso almacenado en la app, junto con su origen.
export interface AuthToken {
  accessToken: string;
  source: TokenSource;
}
