import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';

import { clearToken, saveToken } from '@/services/token-storage.service';
import type { AuthToken } from '@/types/token';
import type { User } from '@/types/user';

export interface SessionContextValue {
  user: User | null;
  token: AuthToken | null;
  signIn: (user: User, token: AuthToken | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// El usuario vive únicamente en memoria: se pierde al cerrar la app.
// El token, en cambio, SÍ se persiste en SecureStore (token-storage.service).
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<AuthToken | null>(null);

  const signIn = useCallback(async (signedInUser: User, authToken: AuthToken | null) => {
    setUser(signedInUser);
    setToken(authToken);

    if (authToken != null) {
      try {
        await saveToken(authToken);
      } catch {
        // Un fallo al persistir el token no debe romper el inicio de sesión.
      }
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
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ user, token, signIn, signOut }),
    [user, token, signIn, signOut],
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
