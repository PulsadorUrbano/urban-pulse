import { API_BASE_URL } from '@/constants/config';
import type { Civic, CreateCivicInput } from '@/types/civic';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const CIVICS_ENDPOINT = `${API_BASE_URL}/civics`;

// Crea un ciudadano en el servidor mock y devuelve el registro persistido
// con su `id` generado por json-server.
export async function createCivic(input: CreateCivicInput): Promise<Civic> {
  const payload: CreateCivicInput = {
    userId: input.userId,
    phone: input.phone,
  };

  let response: Response;

  try {
    response = await fetchWithTimeout(CIVICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder al guardar el ciudadano. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor para guardar el ciudadano. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error('No se pudo guardar el ciudadano. Inténtalo de nuevo más tarde.');
  }

  const civic = (await response.json()) as Civic;
  return civic;
}
