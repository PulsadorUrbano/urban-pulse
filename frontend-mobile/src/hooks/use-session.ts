import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { validateBackendSession } from '@/services/auth.service';
import { clearSessionUser, loadSessionUser, saveSessionUser } from '@/services/session-user-storage.service';
import { clearToken, loadToken, saveToken } from '@/services/token-storage.service';
import type { AuthToken } from '@/types/token';
import type { SessionUser, User } from '@/types/user';

export interface SessionContextValue {
  user: SessionUser | null;
  token: AuthToken | null;
  isRestoringSession: boolean;
  signIn: (user: User, token: AuthToken | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Quita `password` del usuario de mock antes de guardarlo en sesión; el
// usuario de backend ya no la tiene (nunca viaja desde el backend).
function toSessionUser(signedInUser: User): SessionUser {
  if (signedInUser.source === 'mock') {
    const { password, ...sessionUser } = signedInUser;
    return sessionUser;
  }
  return signedInUser;
}

// El usuario de sesión (sin password) y el token se persisten en SecureStore
// (session-user-storage.service y token-storage.service) para poder
// restaurar la sesión al reabrir la app.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<AuthToken | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Intenta restaurar la sesión persistida al montar. Solo se restaura si
  // hay un usuario válido guardado; el token puede faltar (estado ya
  // soportado por signIn(user, null)). Si el token restaurado es de origen
  // backend, se valida contra /auth/me antes de confiar en él: sin conexión
  // se sigue confiando en lo local (igual que hoy); si el backend dice que es
  // inválido/expirado de forma definitiva, se cierra la sesión.
  useEffect(() => {
    let isActive = true;

    Promise.all([loadSessionUser(), loadToken()])
      .then(async ([restoredUser, restoredToken]) => {
        if (!isActive || restoredUser == null) {
          return;
        }

        if (restoredToken?.source === 'backend') {
          const validation = await validateBackendSession(restoredToken.accessToken);
          if (!isActive) return;

          if (validation === 'invalid') {
            await Promise.allSettled([clearToken(), clearSessionUser()]);
            return;
          }
        }

        setUser(restoredUser);
        setToken(restoredToken);
      })
      .finally(() => {
        if (isActive) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const signIn = useCallback(async (signedInUser: User, authToken: AuthToken | null) => {
    const sessionUser = toSessionUser(signedInUser);
    setUser(sessionUser);
    setToken(authToken);

    if (authToken != null) {
      try {
        await saveToken(authToken);
      } catch {
        // Un fallo al persistir el token no debe romper el inicio de sesión.
      }
    }

    try {
      await saveSessionUser(sessionUser);
    } catch {
      // Un fallo al persistir el usuario no debe romper el inicio de sesión.
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);

    try {
      await clearToken();
    } catch {
      // Un fallo al limpiar el almacenamiento no debe impedir cerrar sesión.
    }

    try {
      await clearSessionUser();
    } catch {
      // Un fallo al limpiar el almacenamiento no debe impedir cerrar sesión.
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ user, token, isRestoringSession, signIn, signOut }),
    [user, token, isRestoringSession, signIn, signOut],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionContextValue {
  const sessionContext = useContext(SessionContext);

  if (sessionContext == null) {
    throw new Error('useSession debe usarse dentro de un <SessionProvider>.');
  }

  return sessionContext;
}
