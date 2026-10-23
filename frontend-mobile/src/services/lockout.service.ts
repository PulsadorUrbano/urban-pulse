import * as SecureStore from 'expo-secure-store';

import { EMPTY_LOCKOUT_STATE, type LockoutLevel, type LockoutState } from '@/types/auth';

// Número de fallos dentro de la ventana que dispara el bloqueo.
export const FAILURE_THRESHOLD = 5;
// Ventana de tiempo (1 min) en la que se cuentan los fallos recientes.
export const FAILURE_WINDOW_MS = 60_000;
// Duración del bloqueo por nivel: 1 min, 5 min y 24 h.
export const LOCK_DURATIONS_MS = [60_000, 300_000, 86_400_000] as const;

const LOCKOUT_STORAGE_KEY = 'urbanpulse.auth.lockout';

// Crea un estado vacío nuevo; clona el array para no compartir la referencia.
function createEmptyLockoutState(): LockoutState {
  return { ...EMPTY_LOCKOUT_STATE, recentFailures: [] };
}

// Registra un intento fallido y devuelve un NUEVO estado (sin mutar el original).
export function registerFailure(state: LockoutState, now: number): LockoutState {
  const recentFailures = [...state.recentFailures, now].filter(
    (failureTimestamp) => now - failureTimestamp <= FAILURE_WINDOW_MS,
  );

  if (recentFailures.length < FAILURE_THRESHOLD) {
    return { recentFailures, level: state.level, lockUntil: state.lockUntil };
  }

  // Umbral alcanzado: escala el nivel (máximo 3) y vacía los fallos recientes.
  const nextLevel = Math.min(state.level + 1, 3) as 1 | 2 | 3;

  return {
    recentFailures: [],
    level: nextLevel,
    lockUntil: now + LOCK_DURATIONS_MS[nextLevel - 1],
  };
}

export function isLocked(state: LockoutState, now: number): boolean {
  return state.lockUntil != null && now < state.lockUntil;
}

// Milisegundos que faltan para desbloquear; 0 si no hay bloqueo activo.
export function remainingLockMs(state: LockoutState, now: number): number {
  if (!isLocked(state, now) || state.lockUntil == null) {
    return 0;
  }

  return state.lockUntil - now;
}

export function lockMessageFor(level: LockoutLevel): string {
  switch (level) {
    case 1:
      return 'Has realizado demasiados intentos de sesión, por favor, inténtelo en 1 minuto.';
    case 2:
      return 'Has realizado demasiados intentos de sesión, por favor, inténtelo en 5 minutos.';
    case 3:
      return 'Has realizado demasiados intentos de sesión. Tu acceso queda bloqueado temporalmente durante 24 horas.';
    default:
      return '';
  }
}

// Lee el estado persistido; si no existe, está corrupto o SecureStore falla, devuelve vacío.
export async function loadLockoutState(): Promise<LockoutState> {
  try {
    const storedValue = await SecureStore.getItemAsync(LOCKOUT_STORAGE_KEY);

    if (storedValue == null) {
      return createEmptyLockoutState();
    }

    const parsedValue = JSON.parse(storedValue) as Partial<LockoutState> | null;

    if (
      parsedValue == null ||
      !Array.isArray(parsedValue.recentFailures) ||
      (parsedValue.level !== 0 &&
        parsedValue.level !== 1 &&
        parsedValue.level !== 2 &&
        parsedValue.level !== 3) ||
      (parsedValue.lockUntil !== null && typeof parsedValue.lockUntil !== 'number')
    ) {
      return createEmptyLockoutState();
    }

    return {
      recentFailures: parsedValue.recentFailures.filter(
        (timestamp): timestamp is number => typeof timestamp === 'number',
      ),
      level: parsedValue.level,
      lockUntil: parsedValue.lockUntil,
    };
  } catch {
    return createEmptyLockoutState();
  }
}

export async function saveLockoutState(state: LockoutState): Promise<void> {
  await SecureStore.setItemAsync(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
}

// Un login correcto limpia todo el estado de bloqueo.
// TODO futuro: el cambio de contraseña verificado debe invocar `resetLockout()` para levantar el bloqueo.
export async function resetLockout(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCKOUT_STORAGE_KEY);
}
