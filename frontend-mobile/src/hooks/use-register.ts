import { useCallback, useRef, useState } from 'react';

import { register, UsernameOrEmailTakenError } from '@/services/auth.service';
import { createCivic } from '@/services/civic.service';
import { requestToken } from '@/services/token.service';
import type { AuthToken } from '@/types/token';
import type { RegisterUserInput, User } from '@/types/user';

export interface RegisterSuccess {
  user: User;
  token: AuthToken | null;
}

export interface UseRegisterResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  submitRegister: (input: RegisterUserInput) => Promise<RegisterSuccess | null>;
}

// Orquesta el registro de un ciudadano nuevo: crea el usuario, opcionalmente su
// registro de ciudadano (teléfono) y solicita el token de sesión. El consumidor
// se encarga de signIn y navegación, igual que con useLogin.
export function useRegister(): UseRegisterResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const submitRegister = useCallback(
    async (input: RegisterUserInput): Promise<RegisterSuccess | null> => {
      if (isSubmittingRef.current) {
        return null;
      }

      isSubmittingRef.current = true;
      setErrorMessage(null);
      setIsSubmitting(true);

      let user: User;

      try {
        user = await register(input);
      } catch (error) {
        if (error instanceof UsernameOrEmailTakenError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : 'Ocurrió un error inesperado al crear la cuenta.',
          );
        }
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return null;
      }

      // El teléfono es opcional; si falla su creación no debe bloquear el registro
      // (el usuario ya existe), solo se avisa en consola durante desarrollo.
      if (input.phone && input.phone.trim().length > 0) {
        try {
          await createCivic({ userId: user.id, phone: input.phone });
        } catch (error) {
          if (__DEV__) {
            console.warn('[use-register] No se pudo guardar el teléfono del ciudadano:', error);
          }
        }
      }

      // Fuera del try/catch de registro: un fallo de token nunca debe bloquear el registro.
      try {
        const token = await requestToken(user.id);
        return { user, token };
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { isSubmitting, errorMessage, submitRegister };
}
