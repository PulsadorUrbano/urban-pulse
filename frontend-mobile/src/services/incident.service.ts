import { BACKEND_API_URL } from '@/constants/config';
import { type CreateIncidentInput, type CreatedIncident } from '@/types/incident';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const INCIDENTS_ENDPOINT = `${BACKEND_API_URL}/incidents`;

// El backend limita a 5 los ficheros por incidencia (FilesInterceptor).
export const MAX_INCIDENT_IMAGES = 5;

// TEMPORAL: id del ciudadano `sofia13` (role civic) tomado del mock de
// feature/token. Se sustituirá cuando exista una sesión real.
const TEMPORARY_CIVIC_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';

// Infiere extensión y mimeType a partir de la URI local; por defecto JPEG.
function inferImageFormat(uri: string): { extension: string; mimeType: string } {
  const cleanUri = uri.split('?')[0].toLowerCase();

  if (cleanUri.endsWith('.png')) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (cleanUri.endsWith('.webp')) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }
  return { extension: 'jpg', mimeType: 'image/jpeg' };
}

// React Native acepta `{ uri, name, type }` como parte de un FormData, pero el
// tipo DOM no lo modela; se encapsula aquí con un cast mínimo a Blob.
function buildImagePart(uri: string, index: number): Blob {
  const { extension, mimeType } = inferImageFormat(uri);
  const filePart = { uri, name: `image_${index}.${extension}`, type: mimeType };
  return filePart as unknown as Blob;
}

// Crea una incidencia en el backend real mediante multipart/form-data. Las
// imágenes viajan dentro del mismo POST y solo se envían los campos presentes.
export async function createIncident(
  input: CreateIncidentInput,
  imageUris: string[] = [],
): Promise<CreatedIncident> {
  const formData = new FormData();

  formData.append('title', input.title.trim());

  const trimmedDescription = input.description.trim();
  if (trimmedDescription) {
    formData.append('description', trimmedDescription);
  }

  formData.append('civicId', TEMPORARY_CIVIC_ID);

  if (input.categoryId != null) {
    formData.append('categoryId', input.categoryId);
  }

  const trimmedCustomCategory = input.category?.trim();
  if (trimmedCustomCategory) {
    formData.append('category', trimmedCustomCategory);
  }

  if (input.latitude != null) {
    formData.append('latitude', String(input.latitude));
  }
  if (input.longitude != null) {
    formData.append('longitude', String(input.longitude));
  }
  if (input.accuracy != null) {
    formData.append('accuracy', String(input.accuracy));
  }

  imageUris.slice(0, MAX_INCIDENT_IMAGES).forEach((uri, index) => {
    formData.append('images', buildImagePart(uri, index));
  });

  let response: Response;

  try {
    // Sin cabecera Content-Type: fetch añade el boundary multipart solo.
    response = await fetchWithTimeout(INCIDENTS_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.');
  }

  const incident = (await response.json()) as CreatedIncident;
  return incident;
}
