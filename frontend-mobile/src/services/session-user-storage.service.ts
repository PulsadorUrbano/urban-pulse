import * as SecureStore from 'expo-secure-store';

import type { SessionUser } from '@/types/user';

const SESSION_USER_STORAGE_KEY = 'urbanpulse.auth.user';

// Persiste el usuario de sesión (sin password) en el almacén seguro del dispositivo.
export async function saveSessionUser(sessionUser: SessionUser): Promise<void> {
  await SecureStore.setItemAsync(SESSION_USER_STORAGE_KEY, JSON.stringify(sessionUser));
}

// Lee el usuario de sesión persistido; si no existe, está corrupto, no cumple
// la forma esperada o SecureStore falla, devuelve null sin lanzar. Reconstruye
// el objeto campo a campo (nunca por spread) para que ningún campo inesperado
// -- incluida una password que hubiera acabado en el JSON por error -- se cuele.
export async function loadSessionUser(): Promise<SessionUser | null> {
  try {
    const storedValue = await SecureStore.getItemAsync(SESSION_USER_STORAGE_KEY);

    if (storedValue == null) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<SessionUser> | null;

    if (
      parsedValue == null ||
      typeof parsedValue.id !== 'string' ||
      typeof parsedValue.username !== 'string' ||
      typeof parsedValue.email !== 'string' ||
      typeof parsedValue.role !== 'string'
    ) {
      return null;
    }

    return {
      id: parsedValue.id,
      username: parsedValue.username,
      email: parsedValue.email,
      role: parsedValue.role,
    };
  } catch {
    return null;
  }
}

// Elimina el usuario de sesión persistido (p. ej. al cerrar sesión).
export async function clearSessionUser(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_USER_STORAGE_KEY);
}
