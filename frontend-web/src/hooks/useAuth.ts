import { useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, CookieMetadata } from '../types/auth';
import { authService, MOCK_USERS } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cookieInfo, setCookieInfo] = useState<CookieMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Inicializar sesión persistente si existiese
  useEffect(() => {
    const session = authService.getCurrentSession();
    if (session.user && session.token) {
      setUser(session.user);
      setToken(session.token);
      setCookieInfo(session.cookieInfo);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setLastActionMessage(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.token);
      setCookieInfo(response.cookie);
      setLastActionMessage(response.message || 'Sesión iniciada con éxito.');
      return true;
    } catch (err: any) {
      setError(err?.message || 'Error desconocido al iniciar sesión.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.logout();
      setUser(null);
      setToken(null);
      if (cookieInfo) {
        setCookieInfo({
          ...cookieInfo,
          isOpen: false,
          maxAgeSeconds: 0,
          value: 'REVOKED (Max-Age=0)'
        });
      } else {
        setCookieInfo(null);
      }
      setLastActionMessage(response.message);
    } catch (err: any) {
      setError('Error al procesar el cierre de sesión.');
    } finally {
      setLoading(false);
    }
  }, [cookieInfo]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    token,
    cookieInfo,
    isAuthenticated: !!user && !!token,
    loading,
    error,
    lastActionMessage,
    login,
    logout,
    resetError,
    demoUsers: MOCK_USERS
  };
};
