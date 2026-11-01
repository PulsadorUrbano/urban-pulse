import { File } from 'expo-file-system';

import { BACKEND_API_URL } from '@/constants/config';
import {
  type CreateIncidentInput,
  type CreateIncidentResult,
  type CreatedIncident,
  type FetchIncidentDetailResult,
  type FetchMyIncidentsResult,
  type IncidentDetail,
  type IncidentSummary,
} from '@/types/incident';

import { RequestTimeoutError, fetchWithTimeout } from './http';

const BACKEND_INCIDENTS_ENDPOINT = `${BACKEND_API_URL}/incidents`;

// Alias del endpoint del backend para no romper imports existentes.
export const INCIDENTS_ENDPOINT = BACKEND_INCIDENTS_ENDPOINT;

// El backend limita a 5 los ficheros por incidencia (FilesInterceptor).
export const MAX_INCIDENT_IMAGES = 5;

// Subir varias fotos por wifi puede tardar más que una petición JSON normal;
// se amplía el timeout solo para esta llamada en vez de tocar el valor por
// defecto que usan el resto de peticiones.
const INCIDENT_WITH_IMAGES_TIMEOUT_MS = 30000;

// Error específico para un 404: la incidencia no existe.
export class IncidentNotFoundError extends Error {}

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
// responde pero rechaza la petición: incluye el motivo real cuando el
// cuerpo de la respuesta lo trae, y conserva un log en consola para depurar
// casos en los que no. Se reutiliza tanto para crear una incidencia como
// para consultar "Mis incidencias", por lo que el mensaje genérico de cada
// caso se recibe por parámetro.
async function buildBackendRejectionMessage(response: Response, genericMessage: string): Promise<string> {
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    if (__DEV__) {
      console.warn(`[incident.service] El backend rechazó la petición (${response.status}).`);
    }
    return genericMessage;
  }

  if (__DEV__) {
    console.warn(`[incident.service] El backend rechazó la petición (${response.status}):`, rawBody);
  }

  const backendMessage = extractBackendErrorMessage(rawBody);
  return backendMessage ? `${genericMessage} (${backendMessage})` : genericMessage;
}

// Crea una incidencia en el backend mediante multipart/form-data.
export async function createIncident(
  input: CreateIncidentInput,
  civicId: string,
  imageUris: string[] = [],
): Promise<CreateIncidentResult> {
  const formData = new FormData();

  formData.append('title', input.title.trim());

  const trimmedDescription = input.description.trim();
  if (trimmedDescription) {
    formData.append('description', trimmedDescription);
  }

  formData.append('civicId', civicId);

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
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error(
      await buildBackendRejectionMessage(response, 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );
  }

  const incident = (await response.json()) as CreatedIncident;
  return { incident, source: 'backend' };
}

// Obtiene las incidencias propias del ciudadano desde el backend.
export async function fetchMyIncidents(civicId: string): Promise<FetchMyIncidentsResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${BACKEND_INCIDENTS_ENDPOINT}?civicId=${civicId}`, {
      method: 'GET',
    });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error(
      await buildBackendRejectionMessage(
        response,
        'No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.',
      ),
    );
  }

  const incidents = (await response.json()) as IncidentSummary[];
  return { incidents, source: 'backend' };
}

// Obtiene el detalle de una incidencia por `id` desde el backend.
export async function fetchIncidentById(id: string): Promise<FetchIncidentDetailResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${BACKEND_INCIDENTS_ENDPOINT}/${id}`, {
      method: 'GET',
    });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (response.status === 404) {
    throw new IncidentNotFoundError('La incidencia solicitada no existe.');
  }

  if (!response.ok) {
    throw new Error('No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.');
  }

  const incident = (await response.json()) as IncidentDetail;
  return { incident, source: 'backend' };
}
