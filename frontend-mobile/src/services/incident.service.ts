import { File } from 'expo-file-system';

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

// Subir varias fotos por wifi puede tardar más que una petición JSON normal;
// se amplía el timeout solo para esta llamada en vez de tocar el valor por
// defecto que usan el resto de peticiones.
const INCIDENT_WITH_IMAGES_TIMEOUT_MS = 30000;

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

// El fetch de Expo (runtime "winter") ya no admite el formato propio de React
// Native `{ uri, name, type }` como parte de un FormData: solo acepta un Blob
// o algo con `.bytes()`, que es justo lo que implementa `File`.
function buildImagePart(uri: string): File {
  return new File(uri);
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

// Extrae el `message` del cuerpo de error de NestJS (string o array de
// strings de class-validator). Devuelve null si el cuerpo no tiene esa forma.
function extractBackendErrorMessage(rawBody: string): string | null {
  try {
    const body = JSON.parse(rawBody) as { message?: string | string[] };
    if (typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return body.message.join('; ');
    }
  } catch {
    // Cuerpo no-JSON: se ignora y se usa el mensaje genérico.
  }
  return null;
}

// Construye el mensaje de error a mostrar en la UI cuando el backend
// responde pero rechaza la incidencia: incluye el motivo real cuando el
// cuerpo de la respuesta lo trae, y conserva un log en consola para depurar
// casos en los que no.
async function buildBackendRejectionMessage(response: Response): Promise<string> {
  const genericMessage = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    if (__DEV__) {
      console.warn(`[incident.service] El backend rechazó la incidencia (${response.status}).`);
    }
    return genericMessage;
  }

  if (__DEV__) {
    console.warn(`[incident.service] El backend rechazó la incidencia (${response.status}):`, rawBody);
  }

  const backendMessage = extractBackendErrorMessage(rawBody);
  return backendMessage ? `${genericMessage} (${backendMessage})` : genericMessage;
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

  imageUris.slice(0, MAX_INCIDENT_IMAGES).forEach((uri) => {
    formData.append('images', buildImagePart(uri));
  });

  let response: Response;

  try {
    // Sin cabecera Content-Type: fetch añade el boundary multipart solo.
    response = await fetchWithTimeout(
      BACKEND_INCIDENTS_ENDPOINT,
      {
        method: 'POST',
        body: formData,
      },
      INCIDENT_WITH_IMAGES_TIMEOUT_MS,
    );
  } catch (error) {
    // Sin conexión con el backend: simulación en el mock. Se deja constancia
    // del motivo real en consola porque el aviso en pantalla es genérico.
    if (__DEV__) {
      console.warn('[incident.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return createIncidentOnMock(input, imageUris);
  }

  if (!response.ok) {
    throw new Error(await buildBackendRejectionMessage(response));
  }

  const incident = (await response.json()) as CreatedIncident;
  return { incident, source: 'backend' };
}
