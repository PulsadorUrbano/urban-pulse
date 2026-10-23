// Tipos compartidos de la feature de login (002-gestion-sesion).
// `LoginUserInput` y `User` viven en `src/types/user.ts` y se reutilizan desde allí.

// Nivel de escalado del bloqueo: 0 = sin bloqueo previo, 1 = 1 min, 2 = 5 min, 3 = 24 h.
export type LockoutLevel = 0 | 1 | 2 | 3;

// Estado persistido del bloqueo por intentos fallidos de login.
export interface LockoutState {
  // Timestamps (ms epoch) de los intentos fallidos recientes.
  recentFailures: number[];
  // Nivel de escalado alcanzado hasta ahora.
  level: LockoutLevel;
  // ms epoch hasta el que el login está bloqueado; null si no hay bloqueo activo.
  lockUntil: number | null;
}

// Estado inicial vacío: sin fallos, sin escalado y sin bloqueo.
export const EMPTY_LOCKOUT_STATE: LockoutState = {
  recentFailures: [],
  level: 0,
  lockUntil: null,
};
