import { File } from 'expo-file-system';

import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import {
  DEFAULT_INCIDENT_STATUS,
  type CreateIncidentInput,
  type CreateIncidentResult,
  type CreatedIncident,
  type CreatedIncidentImage,
  type FetchIncidentDetailResult,
  type FetchMyIncidentsResult,
  type IncidentDetail,
  type IncidentPayload,
  type IncidentStatus,
  type IncidentSummary,
} from '@/types/incident';
import type { IncidentImage } from '@/types/incident-image';

import { fetchCategories } from './category.service';
import { RequestTimeoutError, fetchWithTimeout } from './http';
import { IMAGES_ENDPOINT, createImage } from './image.service';

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

// Error específico para un 404 (real o del mock): la incidencia no existe.
// Nunca debe caer al mock, a diferencia de un fallo de conexión.
export class IncidentNotFoundError extends Error {}

// Forma plana de un registro de `incidents` tal como lo devuelve json-server.
// `status`/`createdAt` son opcionales para tolerar registros antiguos sin
// backfillear (defensivo, no debería ocurrir tras el backfill de la Tarea 2).
interface MockIncidentRecord {
  id: string;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  civicId: string;
  categoryId: string | null;
  category: string | null;
  status?: IncidentStatus;
  createdAt?: string;
}

// Infiere extensión y mimeType a partir de la URI local; por defecto JPEG.
export function inferImageFormat(uri: string): { extension: string; mimeType: string } {
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

// Fallback: registra la incidencia en el mock (json-server) con JSON y persiste
// las imágenes por separado. Es el último recurso: si falla, se propaga el error.
async function createIncidentOnMock(
  input: CreateIncidentInput,
  civicId: string,
  imageUris: string[],
): Promise<CreateIncidentResult> {
  // Se calcula una sola vez y se reutiliza en payload, location e images para
  // que todos los campos de fecha de la incidencia queden en el mismo instante.
  const createdAt = new Date().toISOString();

  const payload: IncidentPayload = {
    title: input.title.trim(),
    description: input.description.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy: input.accuracy ?? null,
    civicId,
    categoryId: input.categoryId ?? null,
    category: input.category?.trim() || null,
    status: DEFAULT_INCIDENT_STATUS,
    createdAt,
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
        createdAt,
      });
    }
  });

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
    // Sin conexión con el backend: simulación en el mock. Se deja constancia
    // del motivo real en consola porque el aviso en pantalla es genérico.
    if (__DEV__) {
      console.warn('[incident.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return createIncidentOnMock(input, civicId, imageUris);
  }

  if (!response.ok) {
    throw new Error(
      await buildBackendRejectionMessage(response, 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );
  }

  const incident = (await response.json()) as CreatedIncident;
  return { incident, source: 'backend' };
}

// Fallback: obtiene las incidencias propias desde el mock (json-server) y las
// ordena explícitamente, porque json-server no garantiza el orden de la query
// `?civicId=...` igual que sí lo garantiza el contrato del backend real.
async function fetchMyIncidentsFromMock(civicId: string): Promise<FetchMyIncidentsResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${MOCK_INCIDENTS_ENDPOINT}?civicId=${civicId}`, {
      method: 'GET',
    });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (!response.ok) {
    throw new Error('No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.');
  }

  const records = (await response.json()) as MockIncidentRecord[];

  const incidents: IncidentSummary[] = records.map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status ?? DEFAULT_INCIDENT_STATUS,
    createdAt: record.createdAt ?? new Date().toISOString(),
  }));

  // Orden explícito: desc por `createdAt` (comparando el timestamp numérico
  // de `new Date(...).getTime()`), con desempate asc por `id`, igual que el
  // contrato documentado del backend real.
  incidents.sort((a, b) => {
    const createdAtDiffMs = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (createdAtDiffMs !== 0) {
      return createdAtDiffMs;
    }
    return a.id.localeCompare(b.id);
  });

  return { incidents, source: 'mock' };
}

// Obtiene las incidencias propias del ciudadano `civicId`, intentando primero
// el backend real y cayendo al mock solo si no hay conexión (timeout o red).
// Un `!ok` del backend (p. ej. 400/500) se trata como error genérico, sin mock.
export async function fetchMyIncidents(civicId: string): Promise<FetchMyIncidentsResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${BACKEND_INCIDENTS_ENDPOINT}?civicId=${civicId}`, {
      method: 'GET',
    });
  } catch (error) {
    // Sin conexión con el backend: se cae al mock. El motivo real se deja en
    // consola porque el aviso en pantalla es genérico.
    if (__DEV__) {
      console.warn('[incident.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return fetchMyIncidentsFromMock(civicId);
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

// Obtiene las imágenes asociadas a una incidencia del mock. No bloqueante: si
// falla (red, timeout o parseo), quien la invoque (vía `Promise.allSettled`)
// debe tratarlo como `images: []`, sin romper el ensamblado del detalle.
async function fetchIncidentImagesFromMock(
  incidentId: string,
  incidentCreatedAt: string,
): Promise<CreatedIncidentImage[]> {
  const response = await fetchWithTimeout(`${IMAGES_ENDPOINT}?incidentId=${incidentId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('No se pudieron obtener las imágenes de la incidencia.');
  }

  const images = (await response.json()) as IncidentImage[];

  return images.map((image) => ({
    id: image.id,
    url: image.url,
    mimeType: inferImageFormat(image.url).mimeType,
    createdAt: incidentCreatedAt,
  }));
}

// Resuelve el nombre de categoría a mostrar: prioriza el texto libre ya
// persistido (categoría "Otros"); si no existe, intenta resolver el nombre
// del catálogo por `categoryId`. No bloqueante: cualquier fallo o ausencia de
// coincidencia debe traducirse a `null` por quien la invoque.
async function resolveIncidentCategory(record: MockIncidentRecord): Promise<string | null> {
  if (record.category) {
    return record.category;
  }

  if (!record.categoryId) {
    return null;
  }

  const { categories } = await fetchCategories();
  const matchingCategory = categories.find((category) => category.id === record.categoryId);
  return matchingCategory?.name ?? null;
}

// Fallback: obtiene el detalle de una incidencia desde el mock y ensambla
// imágenes/categoría en paralelo y de forma no bloqueante.
async function fetchIncidentDetailFromMock(id: string): Promise<FetchIncidentDetailResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${MOCK_INCIDENTS_ENDPOINT}/${id}`, { method: 'GET' });
  } catch (error) {
    throw toConnectionError(error);
  }

  if (response.status === 404) {
    throw new IncidentNotFoundError('La incidencia solicitada no existe.');
  }

  if (!response.ok) {
    throw new Error('No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.');
  }

  const record = (await response.json()) as MockIncidentRecord;
  const createdAt = record.createdAt ?? new Date().toISOString();

  // Imágenes y categoría se resuelven en paralelo y sin bloquear: si fallan,
  // no deben romper el ensamblado del resto del detalle.
  const [imagesResult, categoryResult] = await Promise.allSettled([
    fetchIncidentImagesFromMock(id, createdAt),
    resolveIncidentCategory(record),
  ]);

  const images = imagesResult.status === 'fulfilled' ? imagesResult.value : [];
  const category = categoryResult.status === 'fulfilled' ? categoryResult.value : null;

  const incident: IncidentDetail = {
    id: record.id,
    title: record.title,
    description: record.description || null,
    civicId: record.civicId,
    categoryId: record.categoryId,
    category,
    urbanAssetId: null,
    location: {
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy: record.accuracy,
      createdAt,
    },
    images,
    status: record.status ?? DEFAULT_INCIDENT_STATUS,
    priority: 'low',
    createdAt,
  };

  return { incident, source: 'mock' };
}

// Obtiene el detalle de una incidencia por `id`, intentando primero el
// backend real y cayendo al mock solo si no hay conexión (timeout o red). Un
// 404 (la incidencia no existe) nunca cae al mock: es una respuesta
// definitiva. Un `!ok` por otro motivo (p. ej. 400/500) es error genérico.
export async function fetchIncidentById(id: string): Promise<FetchIncidentDetailResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(`${BACKEND_INCIDENTS_ENDPOINT}/${id}`, {
      method: 'GET',
    });
  } catch (error) {
    // Sin conexión con el backend: se cae al mock. El motivo real se deja en
    // consola porque el aviso en pantalla es genérico.
    if (__DEV__) {
      console.warn('[incident.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    return fetchIncidentDetailFromMock(id);
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
