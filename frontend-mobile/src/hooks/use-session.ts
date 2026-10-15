import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';

import type { User } from '@/types/user';

export interface SessionContextValue {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// Sesión únicamente en memoria: se pierde al cerrar la app (sin persistencia).
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback((signedInUser: User) => {
    setUser(signedInUser);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
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
