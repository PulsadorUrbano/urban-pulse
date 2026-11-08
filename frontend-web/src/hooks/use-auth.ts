import { useCallback, useEffect, useState } from 'react';

import { MOCK_USERS } from '../mocks/auth-mock';
import {
  canUseWebPanel,
  getCurrentSession,
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
  verifyTokenWithBackend,
} from '../services/auth.service';
import type { CurrentSession, TokenVerification } from '../types/auth';
import type { LoginUserInput } from '../types/user';

// Cuentas de prueba del personal municipal (la de ciudadanía no tiene acceso a la web).
export const DEMO_USERS = MOCK_USERS.filter((user) => canUseWebPanel(user.role));

export interface LoginAttempt {
  ok: boolean;
  notice: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<CurrentSession | null>(() => getCurrentSession());
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(false);
  const [validationResult, setValidationResult] = useState<TokenVerification | null>(null);

  // Revalida la sesión guardada contra el backend al montar.
  useEffect(() => {
    let active = true;
    restoreSession()
      .then((restored) => {
        if (active) setSession(restored);
      })
      .finally(() => {
        if (active) setIsRestoringSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginUserInput): Promise<LoginAttempt> => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await loginRequest(input);
      setSession({ user: result.user, token: result.token, session: result.session });
      setNotice(result.notice);
      return { ok: true, notice: result.notice };
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Error desconocido al iniciar sesión.');
      return { ok: false, notice: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setSession(null);
    setNotice(null);
    setValidationResult(null);
  }, []);

  const validateTokenWithBackend = useCallback(async () => {
    if (!session) return;
    setValidatingToken(true);
    try {
      setValidationResult(await verifyTokenWithBackend(session.token.accessToken));
    } finally {
      setValidatingToken(false);
    }
  }, [session]);

  const resetError = useCallback(() => setError(null), []);

  return {
    session,
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: session !== null,
    isRestoringSession,
    loading,
    error,
    notice,
    validatingToken,
    validationResult,
    login,
    logout,
    validateTokenWithBackend,
    resetError,
  };
}
