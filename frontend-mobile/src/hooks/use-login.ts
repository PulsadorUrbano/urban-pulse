import { useCallback, useEffect, useRef, useState } from 'react';

import { InvalidCredentialsError, login } from '@/services/auth.service';
import {
  isLocked as isLockoutActive,
  loadLockoutState,
  lockMessageFor,
  registerFailure,
  remainingLockMs,
  resetLockout,
  saveLockoutState,
} from '@/services/lockout.service';
import { requestToken } from '@/services/token.service';
import { EMPTY_LOCKOUT_STATE, type LockoutState } from '@/types/auth';
import type { AuthToken } from '@/types/token';
import type { LoginUserInput, User } from '@/types/user';

export interface LoginSuccess {
  user: User;
  token: AuthToken | null;
}

export interface UseLoginResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  isLocked: boolean;
  lockMessage: string;
  remainingMs: number;
  submitLogin: (input: LoginUserInput) => Promise<LoginSuccess | null>;
}

// Intervalo con el que se refresca el "now" mientras dure el bloqueo.
const LOCK_TICK_MS = 1000;

// Orquesta el servicio de auth y el de bloqueo por intentos fallidos.
// Devuelve el usuario en éxito; el consumidor se encarga de signIn y navegación.
export function useLogin(): UseLoginResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutState, setLockoutState] = useState<LockoutState>({
    ...EMPTY_LOCKOUT_STATE,
    recentFailures: [],
  });
  const [now, setNow] = useState(() => Date.now());

  // Refs para evitar lecturas obsoletas y envíos duplicados entre renders.
  const lockoutStateRef = useRef<LockoutState>(lockoutState);
  const isSubmittingRef = useRef(false);

  const applyLockoutState = useCallback((nextState: LockoutState) => {
    lockoutStateRef.current = nextState;
    setLockoutState(nextState);
  }, []);

  // Carga el bloqueo persistido al montar.
  useEffect(() => {
    let isActive = true;

    loadLockoutState().then((storedState) => {
      if (!isActive) {
        return;
      }
      applyLockoutState(storedState);
      setNow(Date.now());
    });

    return () => {
      isActive = false;
    };
  }, [applyLockoutState]);

  const lockUntil = lockoutState.lockUntil;

  // Mientras haya bloqueo vigente, refresca "now" cada segundo y se detiene al expirar.
  useEffect(() => {
    if (lockUntil == null || Date.now() >= lockUntil) {
      return;
    }

    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= lockUntil) {
        clearInterval(intervalId);
      }
    }, LOCK_TICK_MS);

    return () => clearInterval(intervalId);
  }, [lockUntil]);

  const isLocked = isLockoutActive(lockoutState, now);
  const remainingMs = remainingLockMs(lockoutState, now);
  const lockMessage = isLocked ? lockMessageFor(lockoutState.level) : '';

  const submitLogin = useCallback(
    async (input: LoginUserInput): Promise<LoginSuccess | null> => {
      if (isSubmittingRef.current || isLockoutActive(lockoutStateRef.current, Date.now())) {
        return null;
      }

      isSubmittingRef.current = true;
      setErrorMessage(null);
      setIsSubmitting(true);

      let user: User;

      try {
        user = await login(input);

        // Éxito: limpia el bloqueo persistido, tolerando fallos de SecureStore.
        try {
          await resetLockout();
        } catch {
          // Un fallo al limpiar el almacenamiento no debe romper el login.
        }
        applyLockoutState({ ...EMPTY_LOCKOUT_STATE, recentFailures: [] });
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          const failureTime = Date.now();
          const nextState = registerFailure(lockoutStateRef.current, failureTime);

          try {
            await saveLockoutState(nextState);
          } catch {
            // Si no se puede persistir, se mantiene el estado en memoria.
          }
          applyLockoutState(nextState);
          setNow(failureTime);

          // El mensaje de bloqueo tiene prioridad sobre el de credenciales.
          if (!isLockoutActive(nextState, failureTime)) {
            setErrorMessage(error.message);
          }
        } else {
          // Errores de red/timeout: no cuentan como intento fallido.
          setErrorMessage(
            error instanceof Error ? error.message : 'Ocurrió un error inesperado al iniciar sesión.',
          );
        }
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return null;
      }

      // Fuera del try/catch de credenciales: un fallo de token nunca cuenta como intento fallido.
      try {
        const token = await requestToken(user.id);
        return { user, token };
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [applyLockoutState],
  );

  return { isSubmitting, errorMessage, isLocked, lockMessage, remainingMs, submitLogin };
}
