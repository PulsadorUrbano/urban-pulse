/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

import {
  FAILURE_THRESHOLD,
  FAILURE_WINDOW_MS,
  LOCK_DURATIONS_MS,
  isLocked,
  loadLockoutState,
  lockMessageFor,
  registerFailure,
  remainingLockMs,
  resetLockout,
  saveLockoutState,
} from '@/services/lockout.service';
import { EMPTY_LOCKOUT_STATE, type LockoutState } from '@/types/auth';

// Mock de SecureStore: los tests de IO no tocan el almacenamiento nativo.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Clave de storage usada internamente por el servicio (no exportada).
const LOCKOUT_STORAGE_KEY = 'urbanpulse.auth.lockout';

// Timestamp fijo para que los tests sean deterministas.
const BASE_TIME_MS = 1_700_000_000_000;

// Registra `count` fallos consecutivos a partir de `startMs`, separados 1 ms.
function registerFailuresInRow(
  initialState: LockoutState,
  count: number,
  startMs: number,
): LockoutState {
  let currentState = initialState;
  for (let index = 0; index < count; index += 1) {
    currentState = registerFailure(currentState, startMs + index);
  }
  return currentState;
}

describe('constantes del lockout', () => {
  it('exponen el umbral, la ventana y las duraciones de bloqueo esperadas', () => {
    expect(FAILURE_THRESHOLD).toBe(5);
    expect(FAILURE_WINDOW_MS).toBe(60_000);
    expect(LOCK_DURATIONS_MS).toEqual([60_000, 300_000, 86_400_000]);
  });
});

describe('registerFailure', () => {
  it('con 4 fallos dentro de 60 s no activa bloqueo y mantiene level y lockUntil', () => {
    const stateAfterFailures = registerFailuresInRow(EMPTY_LOCKOUT_STATE, 4, BASE_TIME_MS);

    expect(stateAfterFailures.recentFailures).toHaveLength(4);
    expect(stateAfterFailures.level).toBe(0);
    expect(stateAfterFailures.lockUntil).toBeNull();
    expect(isLocked(stateAfterFailures, BASE_TIME_MS + 4)).toBe(false);
  });

  it('con 4 fallos y lockUntil previo mantiene ese lockUntil y el level', () => {
    const previousState: LockoutState = {
      recentFailures: [],
      level: 1,
      lockUntil: BASE_TIME_MS - 1,
    };

    const nextState = registerFailuresInRow(previousState, 4, BASE_TIME_MS);

    expect(nextState.level).toBe(1);
    expect(nextState.lockUntil).toBe(BASE_TIME_MS - 1);
  });

  it('el 5.º fallo dentro de 60 s activa el nivel 1 con lockUntil = now + 60000 y vacía recentFailures', () => {
    const failureTime = BASE_TIME_MS + 10;
    const stateBeforeThreshold = registerFailuresInRow(EMPTY_LOCKOUT_STATE, 4, BASE_TIME_MS);

    const lockedState = registerFailure(stateBeforeThreshold, failureTime);

    expect(lockedState.level).toBe(1);
    expect(lockedState.lockUntil).toBe(failureTime + LOCK_DURATIONS_MS[0]);
    expect(lockedState.lockUntil).toBe(failureTime + 60_000);
    expect(lockedState.recentFailures).toEqual([]);
  });

  it('escala a nivel 2 (+5 min) cuando, tras expirar el bloqueo, se alcanza otro umbral', () => {
    const firstLockState = registerFailuresInRow(EMPTY_LOCKOUT_STATE, 5, BASE_TIME_MS);
    // Instante posterior a la expiración del primer bloqueo.
    const afterFirstLockMs = firstLockState.lockUntil! + 1;

    const secondLockState = registerFailuresInRow(firstLockState, 5, afterFirstLockMs);

    expect(secondLockState.level).toBe(2);
    expect(secondLockState.lockUntil).toBe(afterFirstLockMs + 4 + LOCK_DURATIONS_MS[1]);
    expect(secondLockState.recentFailures).toEqual([]);
  });

  it('escala a nivel 3 (+24 h) tras un segundo bloqueo expirado', () => {
    const firstLockState = registerFailuresInRow(EMPTY_LOCKOUT_STATE, 5, BASE_TIME_MS);
    const afterFirstLockMs = firstLockState.lockUntil! + 1;
    const secondLockState = registerFailuresInRow(firstLockState, 5, afterFirstLockMs);
    const afterSecondLockMs = secondLockState.lockUntil! + 1;

    const thirdLockState = registerFailuresInRow(secondLockState, 5, afterSecondLockMs);

    expect(thirdLockState.level).toBe(3);
    expect(thirdLockState.lockUntil).toBe(afterSecondLockMs + 4 + LOCK_DURATIONS_MS[2]);
    expect(thirdLockState.lockUntil! - afterSecondLockMs).toBeGreaterThanOrEqual(86_400_000);
  });

  it('en nivel 3, un nuevo umbral se mantiene en nivel 3 y renueva lockUntil con 24 h', () => {
    const maxLevelState: LockoutState = {
      recentFailures: [],
      level: 3,
      lockUntil: BASE_TIME_MS,
    };
    const renewalTime = BASE_TIME_MS + 1_000;

    const renewedState = registerFailuresInRow(maxLevelState, 5, renewalTime);

    expect(renewedState.level).toBe(3);
    expect(renewedState.lockUntil).toBe(renewalTime + 4 + 86_400_000);
    expect(renewedState.recentFailures).toEqual([]);
  });

  describe('ventana de fallos', () => {
    it('un fallo con antigüedad exactamente FAILURE_WINDOW_MS se conserva', () => {
      const oldFailureTime = BASE_TIME_MS;
      const stateWithOldFailure: LockoutState = {
        recentFailures: [oldFailureTime],
        level: 0,
        lockUntil: null,
      };

      const nextState = registerFailure(stateWithOldFailure, oldFailureTime + FAILURE_WINDOW_MS);

      expect(nextState.recentFailures).toEqual([oldFailureTime, oldFailureTime + FAILURE_WINDOW_MS]);
    });

    it('un fallo con antigüedad FAILURE_WINDOW_MS + 1 se descarta', () => {
      const oldFailureTime = BASE_TIME_MS;
      const stateWithOldFailure: LockoutState = {
        recentFailures: [oldFailureTime],
        level: 0,
        lockUntil: null,
      };

      const nextState = registerFailure(
        stateWithOldFailure,
        oldFailureTime + FAILURE_WINDOW_MS + 1,
      );

      expect(nextState.recentFailures).toEqual([oldFailureTime + FAILURE_WINDOW_MS + 1]);
    });

    it('los fallos antiguos fuera de ventana no cuentan para el umbral', () => {
      // Cuatro fallos viejos ya fuera de ventana + uno nuevo no deben disparar el bloqueo.
      const staleState = registerFailuresInRow(EMPTY_LOCKOUT_STATE, 4, BASE_TIME_MS);
      const freshFailureTime = BASE_TIME_MS + FAILURE_WINDOW_MS + 1_000;

      const nextState = registerFailure(staleState, freshFailureTime);

      expect(nextState.level).toBe(0);
      expect(nextState.lockUntil).toBeNull();
      expect(nextState.recentFailures).toEqual([freshFailureTime]);
    });
  });

  it('no muta el estado de entrada ni EMPTY_LOCKOUT_STATE', () => {
    const inputState: LockoutState = {
      recentFailures: [BASE_TIME_MS],
      level: 0,
      lockUntil: null,
    };
    const inputSnapshot = JSON.parse(JSON.stringify(inputState)) as LockoutState;
    const emptySnapshot = JSON.parse(JSON.stringify(EMPTY_LOCKOUT_STATE)) as LockoutState;

    const nextState = registerFailure(inputState, BASE_TIME_MS + 1);
    registerFailure(EMPTY_LOCKOUT_STATE, BASE_TIME_MS + 1);

    expect(inputState).toEqual(inputSnapshot);
    expect(EMPTY_LOCKOUT_STATE).toEqual(emptySnapshot);
    expect(nextState).not.toBe(inputState);
    expect(nextState.recentFailures).not.toBe(inputState.recentFailures);
  });
});

describe('isLocked', () => {
  const lockedState: LockoutState = {
    recentFailures: [],
    level: 1,
    lockUntil: BASE_TIME_MS + 60_000,
  };

  it('devuelve true mientras now es menor que lockUntil', () => {
    expect(isLocked(lockedState, BASE_TIME_MS + 59_999)).toBe(true);
  });

  it('devuelve false cuando now === lockUntil (comparación estricta)', () => {
    expect(isLocked(lockedState, lockedState.lockUntil!)).toBe(false);
  });

  it('devuelve false cuando lockUntil es null', () => {
    expect(isLocked(EMPTY_LOCKOUT_STATE, BASE_TIME_MS)).toBe(false);
  });
});

describe('remainingLockMs', () => {
  const lockedState: LockoutState = {
    recentFailures: [],
    level: 1,
    lockUntil: BASE_TIME_MS + 60_000,
  };

  it('devuelve la diferencia positiva mientras el bloqueo está activo', () => {
    expect(remainingLockMs(lockedState, BASE_TIME_MS + 10_000)).toBe(50_000);
  });

  it('devuelve 0 cuando now === lockUntil', () => {
    expect(remainingLockMs(lockedState, lockedState.lockUntil!)).toBe(0);
  });

  it('devuelve 0 cuando ya ha expirado el bloqueo', () => {
    expect(remainingLockMs(lockedState, BASE_TIME_MS + 120_000)).toBe(0);
  });

  it('devuelve 0 cuando no hay bloqueo (lockUntil null)', () => {
    expect(remainingLockMs(EMPTY_LOCKOUT_STATE, BASE_TIME_MS)).toBe(0);
  });
});

describe('lockMessageFor', () => {
  it('nivel 1 indica que se reintente en 1 minuto', () => {
    expect(lockMessageFor(1)).toContain('inténtelo en 1 minuto.');
  });

  it('nivel 2 indica que se reintente en 5 minutos', () => {
    expect(lockMessageFor(2)).toContain('inténtelo en 5 minutos.');
  });

  it('nivel 3 indica bloqueo temporal de 24 horas', () => {
    expect(lockMessageFor(3)).toContain('bloqueado temporalmente durante 24 horas.');
  });

  it('nivel 0 devuelve cadena vacía', () => {
    expect(lockMessageFor(0)).toBe('');
  });
});

describe('persistencia del estado de bloqueo (SecureStore)', () => {
  const getItemAsyncMock = SecureStore.getItemAsync as jest.Mock;
  const setItemAsyncMock = SecureStore.setItemAsync as jest.Mock;
  const deleteItemAsyncMock = SecureStore.deleteItemAsync as jest.Mock;

  beforeEach(() => {
    getItemAsyncMock.mockReset();
    setItemAsyncMock.mockReset();
    deleteItemAsyncMock.mockReset();
  });

  describe('loadLockoutState', () => {
    it('devuelve estado vacío cuando no hay valor guardado (null)', async () => {
      getItemAsyncMock.mockResolvedValueOnce(null);

      const loadedState = await loadLockoutState();

      expect(getItemAsyncMock).toHaveBeenCalledWith(LOCKOUT_STORAGE_KEY);
      expect(loadedState).toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve estado vacío cuando el JSON guardado está corrupto', async () => {
      getItemAsyncMock.mockResolvedValueOnce('{no es json');

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve estado vacío cuando la forma del JSON no es válida', async () => {
      // level fuera de rango y lockUntil de tipo incorrecto.
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({ recentFailures: [], level: 9, lockUntil: 'mañana' }),
      );

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve estado vacío cuando el JSON es null', async () => {
      getItemAsyncMock.mockResolvedValueOnce('null');

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve estado vacío cuando recentFailures no es un array', async () => {
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({ recentFailures: 'x', level: 0, lockUntil: null }),
      );

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve estado vacío cuando SecureStore lanza un error', async () => {
      getItemAsyncMock.mockRejectedValueOnce(new Error('keychain no disponible'));

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });

    it('devuelve el estado parseado cuando el JSON es válido', async () => {
      const persistedState: LockoutState = {
        recentFailures: [BASE_TIME_MS, BASE_TIME_MS + 1],
        level: 2,
        lockUntil: BASE_TIME_MS + 300_000,
      };
      getItemAsyncMock.mockResolvedValueOnce(JSON.stringify(persistedState));

      await expect(loadLockoutState()).resolves.toEqual(persistedState);
    });

    it('acepta lockUntil null con level 0 como estado válido', async () => {
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({ recentFailures: [], level: 0, lockUntil: null }),
      );

      await expect(loadLockoutState()).resolves.toEqual(EMPTY_LOCKOUT_STATE);
    });
  });

  describe('saveLockoutState', () => {
    it('guarda el estado serializado como JSON bajo la clave del lockout', async () => {
      const stateToSave: LockoutState = {
        recentFailures: [],
        level: 1,
        lockUntil: BASE_TIME_MS + 60_000,
      };

      await saveLockoutState(stateToSave);

      expect(setItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(setItemAsyncMock).toHaveBeenCalledWith(
        LOCKOUT_STORAGE_KEY,
        JSON.stringify(stateToSave),
      );
    });
  });

  describe('resetLockout', () => {
    it('elimina la clave del lockout de SecureStore', async () => {
      await resetLockout();

      expect(deleteItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(deleteItemAsyncMock).toHaveBeenCalledWith(LOCKOUT_STORAGE_KEY);
    });
  });
});
