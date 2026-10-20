import { API_BASE_URL } from '@/constants/config';
import type { Location, LocationCoordinates } from '@/types/location';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const LOCATIONS_ENDPOINT = `${API_BASE_URL}/locations`;

// Persiste las coordenadas capturadas del dispositivo en el servidor mock y
// devuelve la ubicación creada con su id y su fecha de registro.
export async function createLocation(coordinates: LocationCoordinates): Promise<Location> {
  const payload: Omit<Location, 'id'> = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: coordinates.accuracy,
    createdAt: new Date().toISOString(),
  };

  let response: Response;

  try {
    response = await fetchWithTimeout(LOCATIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder al guardar la ubicación. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error('No se pudo guardar la ubicación. Revisa tu conexión e inténtalo de nuevo.');
  }

  if (!response.ok) {
    throw new Error('No se pudo guardar la ubicación. Inténtalo de nuevo más tarde.');
  }

  const location = (await response.json()) as Location;
  return location;
}
