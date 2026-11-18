// Contratos de datos para la integración del token de acceso.
// Origen del token: emitido por el backend real o generado localmente (mock).
export type TokenSource = 'backend' | 'mock';

// Token de acceso almacenado en la app, junto con su origen.
export interface AuthToken {
  accessToken: string;
  source: TokenSource;
}
