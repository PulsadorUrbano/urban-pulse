import { useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, CookieMetadata, TokenSource } from '../types/auth';
import { authService, MOCK_USERS } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenSource, setTokenSource] = useState<TokenSource>('mock');
  const [verifiedClaims, setVerifiedClaims] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<CookieMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [validatingToken, setValidatingToken] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; claims?: any; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // Initialize persistent session if it exists
  useEffect(() => {
    const session = authService.getCurrentSession();
    if (session.user && session.token) {
      setUser(session.user);
      setToken(session.token);
      setTokenSource(session.tokenSource);
      setVerifiedClaims(session.verifiedClaims);
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
      setTokenSource(response.tokenSource);
      setVerifiedClaims(response.verifiedClaims);
      setCookieInfo(response.cookie);
      setLastActionMessage(response.message || 'Session started successfully.');
      return true;
    } catch (err: any) {
      setError(err?.message || 'Unknown error occurred while logging in.');
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
      setVerifiedClaims(null);
      setValidationResult(null);
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
    } catch {
      setError('Error occurred while logging out.');
    } finally {
      setLoading(false);
    }
  }, [cookieInfo]);

  const validateTokenWithBackend = useCallback(async () => {
    if (!token) return;
    setValidatingToken(true);
    try {
      const res = await authService.verifyTokenWithBackend(token);
      setValidationResult(res);
      if (res.valid && res.claims) {
        setVerifiedClaims(res.claims);
      }
    } catch (e: any) {
      setValidationResult({ valid: false, error: e?.message || 'Error validating token' });
    } finally {
      setValidatingToken(false);
    }
  }, [token]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    token,
    tokenSource,
    verifiedClaims,
    cookieInfo,
    isAuthenticated: !!user && !!token,
    loading,
    validatingToken,
    validationResult,
    error,
    lastActionMessage,
    login,
    logout,
    validateTokenWithBackend,
    resetError,
    demoUsers: MOCK_USERS
  };
};
