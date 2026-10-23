import { API_BASE_URL } from '@/constants/config';
import type { CreateIncidentImageInput, IncidentImage } from '@/types/incident-image';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const IMAGES_ENDPOINT = `${API_BASE_URL}/images`;

// Crea una imagen de incidencia en el servidor mock y devuelve el registro
// persistido con su `id` generado por json-server.
export async function createImage(input: CreateIncidentImageInput): Promise<IncidentImage> {
  const payload: CreateIncidentImageInput = {
    url: input.url.trim(),
    incidentId: input.incidentId,
  };

  let response: Response;

  try {
    response = await fetchWithTimeout(IMAGES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder al guardar la imagen. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor para guardar la imagen. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error('No se pudo guardar la imagen. Inténtalo de nuevo más tarde.');
  }

  const image = (await response.json()) as IncidentImage;
  return image;
}
