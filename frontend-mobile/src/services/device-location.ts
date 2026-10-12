import * as ExpoLocation from 'expo-location';

import type { LocationCoordinates } from '@/types/location';

// Tiempo máximo que se espera a que el dispositivo entregue la posición actual
// antes de caer al último punto conocido.
export const CURRENT_POSITION_TIMEOUT_MS = 10000;

// Resuelve la promesa con `null` si supera el tiempo límite; en caso contrario
// libera el temporizador y propaga el valor o el error original.
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => resolve(null), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

// Normaliza el objeto nativo de expo-location al contrato propio de la app.
function toLocationCoordinates(position: ExpoLocation.LocationObject): LocationCoordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
  };
}

// Solicita el permiso de ubicación en primer plano: reutiliza el permiso ya
// concedido y, si no lo está, lanza la petición nativa al usuario.
export async function requestLocationPermission(): Promise<boolean> {
  const currentPermission = await ExpoLocation.getForegroundPermissionsAsync();
  if (currentPermission.granted) {
    return true;
  }

  const requestedPermission = await ExpoLocation.requestForegroundPermissionsAsync();
  return requestedPermission.granted;
}

// Comprueba si los servicios de ubicación del dispositivo están activos. Si la
// consulta falla se asume `true` para no bloquear el registro de la incidencia.
export async function areLocationServicesEnabled(): Promise<boolean> {
  try {
    return await ExpoLocation.hasServicesEnabledAsync();
  } catch {
    return true;
  }
}

// Obtiene la posición actual con un timeout propio y degrada al último punto
// conocido. Nunca lanza: devuelve `null` si no hay ninguna ubicación disponible.
export async function getCurrentCoordinates(): Promise<LocationCoordinates | null> {
  try {
    const currentPosition = await withTimeout(
      ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }),
      CURRENT_POSITION_TIMEOUT_MS,
    );

    if (currentPosition) {
      return toLocationCoordinates(currentPosition);
    }
  } catch {
    // Sin posición actual; se intenta recuperar el último punto conocido.
  }

  try {
    const lastKnownPosition = await ExpoLocation.getLastKnownPositionAsync();
    if (lastKnownPosition) {
      return toLocationCoordinates(lastKnownPosition);
    }
  } catch {
    // Tampoco hay último punto conocido disponible.
  }

  return null;
}
