import * as SecureStore from 'expo-secure-store';

import type { AuthToken } from '@/types/token';

const TOKEN_STORAGE_KEY = 'urbanpulse.auth.token';

// Persiste el token (serializado a JSON) en el almacén seguro del dispositivo.
export async function saveToken(token: AuthToken): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

// Lee el token persistido; si no existe, está corrupto, no cumple la forma
// esperada o SecureStore falla, devuelve null sin lanzar.
export async function loadToken(): Promise<AuthToken | null> {
  try {
    const storedValue = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);

    if (storedValue == null) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<AuthToken> | null;

    if (
      parsedValue == null ||
      typeof parsedValue.accessToken !== 'string' ||
      (parsedValue.source !== 'backend' && parsedValue.source !== 'mock')
    ) {
      return null;
    }

    return { accessToken: parsedValue.accessToken, source: parsedValue.source };
  } catch {
    return null;
  }
}

// Elimina el token persistido (p. ej. al cerrar sesión).
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}
