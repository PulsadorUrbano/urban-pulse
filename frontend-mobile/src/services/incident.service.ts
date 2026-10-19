import { API_BASE_URL } from '@/constants/config';
import { type CreateIncidentInput, type IncidentPayload } from '@/types/incident';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// TEMPORAL: id del ciudadano `sofia13` (role civic) tomado del mock de
// feature/token. Se sustituirá cuando exista una sesión real.
const TEMPORARY_CIVIC_ID = 'a62718e8563';

// Crea una incidencia con los 8 campos que envía el front y la persiste en el
// servidor mock.
export async function createIncident(
  input: CreateIncidentInput,
): Promise<IncidentPayload & { id: string }> {
  const trimmedCustomCategory = input.category?.trim();

  const payload: IncidentPayload = {
    title: input.title.trim(),
    description: input.description.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy: input.accuracy ?? null,
    civicId: TEMPORARY_CIVIC_ID,
    categoryId: input.categoryId ?? null,
    category: trimmedCustomCategory ? trimmedCustomCategory : null,
  };

  let response: Response;

  try {
    response = await fetchWithTimeout(INCIDENTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.');
  }

  const incident = (await response.json()) as IncidentPayload & { id: string };
  return incident;
}
