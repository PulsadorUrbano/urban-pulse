import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import {
  type CreateIncidentInput,
  type CreateIncidentResult,
  type CreatedIncident,
  type CreatedIncidentImage,
  type IncidentPayload,
} from '@/types/incident';

import { RequestTimeoutError, fetchWithTimeout } from './http';
import { createImage } from './image.service';

const BACKEND_INCIDENTS_ENDPOINT = `${BACKEND_API_URL}/incidents`;
const MOCK_INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// Alias del endpoint del backend para no romper imports existentes.
export const INCIDENTS_ENDPOINT = BACKEND_INCIDENTS_ENDPOINT;

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

// Traduce un fallo de conexión (timeout o red) a un Error con mensaje amigable.
function toConnectionError(error: unknown): Error {
  if (error instanceof RequestTimeoutError) {
    return new Error(
      'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.',
    );
  }

  return new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
}

// Fallback: registra la incidencia en el mock (json-server) con JSON y persiste
// las imágenes por separado. Es el último recurso: si falla, se propaga el error.
async function createIncidentOnMock(
  input: CreateIncidentInput,
  imageUris: string[],
): Promise<CreateIncidentResult> {
  const payload: IncidentPayload = {
    title: input.title.trim(),
    description: input.description.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy: input.accuracy ?? null,
    civicId: TEMPORARY_CIVIC_ID,
    categoryId: input.categoryId ?? null,
    category: input.category?.trim() || null,
  };

  let response: Response;

  try {
    response = await fetchWithTimeout(MOCK_INCIDENTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.');
  }

  const { id } = (await response.json()) as { id: string };

  // Las imágenes no son bloqueantes: se conservan solo las que se guardan bien.
  const uris = imageUris.slice(0, MAX_INCIDENT_IMAGES);
  const imageResults = await Promise.allSettled(
    uris.map((uri) => createImage({ url: uri, incidentId: id })),
  );

  const images: CreatedIncidentImage[] = [];
  imageResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      images.push({
        id: result.value.id,
        url: result.value.url,
        mimeType: inferImageFormat(uris[index]).mimeType,
        createdAt: new Date().toISOString(),
      });
    }
  });

  const createdAt = new Date().toISOString();
  const incident: CreatedIncident = {
    id,
    title: payload.title,
    description: payload.description || null,
    civicId: payload.civicId,
    categoryId: payload.categoryId,
    category: payload.category,
    urbanAssetId: null,
    location: {
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      accuracy: input.accuracy ?? null,
      createdAt,
    },
    images,
    status: 'reported',
    priority: 'low',
    createdAt,
  };

  return { incident, source: 'mock' };
}

// Crea una incidencia intentando primero el backend real (multipart/form-data)
// y cayendo al mock solo si no hay conexión (timeout o red). Si el backend
// responde con rechazo (!ok) se lanza el error sin usar el mock.
export async function createIncident(
  input: CreateIncidentInput,
  imageUris: string[] = [],
): Promise<CreateIncidentResult> {
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
    response = await fetchWithTimeout(BACKEND_INCIDENTS_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
  } catch {
    // Sin conexión con el backend: simulación en el mock.
    return createIncidentOnMock(input, imageUris);
  }

  if (!response.ok) {
    throw new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.');
  }

  const incident = (await response.json()) as CreatedIncident;
  return { incident, source: 'backend' };
}
