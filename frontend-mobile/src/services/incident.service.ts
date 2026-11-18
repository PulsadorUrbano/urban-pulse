import { File } from 'expo-file-system';

import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import {
  DEFAULT_INCIDENT_STATUS,
  type BackendCreateIncidentPayload,
  type CreateIncidentInput,
  type CreateIncidentResult,
  type CreatedIncident,
  type CreatedIncidentImage,
  type FetchIncidentDetailResult,
  type FetchMyIncidentsResult,
  type IncidentAuthor,
  type IncidentDetail,
  type IncidentPayload,
  type IncidentSource,
  type IncidentStatus,
  type IncidentSummary,
  type UploadIncidentImagesResult,
} from '@/types/incident';
import type { IncidentImage } from '@/types/incident-image';
import type { AuthToken } from '@/types/token';

import { fetchCategories } from './category.service';
import { buildBackendRejectionMessage, fetchWithTimeout, toConnectionErrorMessage } from './http';
import { IMAGES_ENDPOINT, createImage } from './image.service';

const BACKEND_INCIDENTS_ENDPOINT = `${BACKEND_API_URL}/incidents`;
const MOCK_INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// Mensajes compartidos entre el camino backend y el camino mock.
const CREATE_INCIDENT_ERROR_MESSAGE = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';
const FETCH_INCIDENTS_ERROR_MESSAGE = 'No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.';
const FETCH_INCIDENT_DETAIL_ERROR_MESSAGE = 'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.';
const INCIDENT_NOT_FOUND_MESSAGE = 'La incidencia solicitada no existe.';
const SESSION_EXPIRED_MESSAGE =
  'Tu sesión ha caducado. Vuelve a iniciar sesión para registrar la incidencia.';
const MISSING_BACKEND_TOKEN_MESSAGE =
  'No se pudo verificar tu sesión. Vuelve a iniciar sesión para registrar la incidencia.';
export const IMAGES_UPLOAD_ERROR_MESSAGE =
  'La incidencia se registró, pero no se pudieron subir las fotos.';

// Alias del endpoint del backend para no romper imports existentes.
export const INCIDENTS_ENDPOINT = BACKEND_INCIDENTS_ENDPOINT;

// El backend acepta hasta 8 ficheros por incidencia (FilesInterceptor).
export const MAX_INCIDENT_IMAGES = 8;

// Subir varias fotos por wifi puede tardar más que una petición JSON normal;
// se amplía el timeout solo para esta llamada en vez de tocar el valor por
// defecto que usan el resto de peticiones.
const INCIDENT_IMAGES_UPLOAD_TIMEOUT_MS = 30000;

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
  return new Error(
    toConnectionErrorMessage(
      error,
      'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.',
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    ),
  );
}

// Sube al mock las fotos indicadas como registros de `images`. Cada foto se
// guarda por separado: las que fallan quedan pendientes para reintentar.
async function uploadIncidentImagesToMock(
  incidentId: string,
  imageUris: string[],
): Promise<UploadIncidentImagesResult> {
  const createdAt = new Date().toISOString();
  const imageResults = await Promise.allSettled(
    imageUris.map((uri) => createImage({ url: uri, incidentId })),
  );

  const images: CreatedIncidentImage[] = [];
  const pendingImageUris: string[] = [];
  imageResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      images.push({
        id: result.value.id,
        url: result.value.url,
        mimeType: inferImageFormat(imageUris[index]).mimeType,
        createdAt,
      });
    } else {
      pendingImageUris.push(imageUris[index]);
    }
  });

  return {
    images,
    pendingImageUris,
    errorMessage: pendingImageUris.length > 0 ? IMAGES_UPLOAD_ERROR_MESSAGE : null,
  };
}

// Sube las fotos al backend real en una única petición multipart a
// POST /incidents/:id/images. Es todo o nada: si falla, todas quedan pendientes.
// Nunca cae al mock, porque la incidencia ya existe en el backend.
async function uploadIncidentImagesToBackend(
  incidentId: string,
  imageUris: string[],
  accessToken: string,
): Promise<UploadIncidentImagesResult> {
  const failedUpload = (errorMessage: string): UploadIncidentImagesResult => ({
    images: [],
    pendingImageUris: imageUris,
    errorMessage,
  });

  let response: Response;
  try {
    const formData = new FormData();
    imageUris.forEach((uri) => {
      formData.append('images', buildImagePart(uri));
    });

    // Sin cabecera Content-Type: fetch añade el boundary multipart solo.
    response = await fetchWithTimeout(
      `${BACKEND_INCIDENTS_ENDPOINT}/${incidentId}/images`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      },
      INCIDENT_IMAGES_UPLOAD_TIMEOUT_MS,
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[incident.service] Fallo al subir las fotos al backend:', error);
    }
    return failedUpload(IMAGES_UPLOAD_ERROR_MESSAGE);
  }

  if (!response.ok) {
    return failedUpload(
      await buildBackendRejectionMessage(response, IMAGES_UPLOAD_ERROR_MESSAGE),
    );
  }

  try {
    const images = (await response.json()) as CreatedIncidentImage[];
    return { images, pendingImageUris: [], errorMessage: null };
  } catch {
    // La subida se aceptó aunque la respuesta no se pueda leer: no hay pendientes.
    return { images: [], pendingImageUris: [], errorMessage: null };
  }
}

// Sube las fotos de una incidencia ya creada al mismo origen donde se creó
// (backend o mock). Se usa tras crear la incidencia y para reintentar solo la
// subida si falló, sin volver a crear la incidencia.
export async function uploadIncidentImages(
  incidentId: string,
  imageUris: string[],
  source: IncidentSource,
  token: AuthToken | null,
): Promise<UploadIncidentImagesResult> {
  const uris = imageUris.slice(0, MAX_INCIDENT_IMAGES);

  if (uris.length === 0) {
    return { images: [], pendingImageUris: [], errorMessage: null };
  }

  if (source === 'mock') {
    return uploadIncidentImagesToMock(incidentId, uris);
  }

  if (token?.source !== 'backend') {
    return { images: [], pendingImageUris: uris, errorMessage: MISSING_BACKEND_TOKEN_MESSAGE };
  }

  return uploadIncidentImagesToBackend(incidentId, uris, token.accessToken);
}

// Añade a la incidencia creada el resultado de la subida de sus fotos.
async function attachImagesToCreatedIncident(
  incident: CreatedIncident,
  source: IncidentSource,
  imageUris: string[],
  token: AuthToken | null,
): Promise<CreateIncidentResult> {
  // La incidencia ya existe: ningún fallo de la subida debe propagarse, porque
  // la UI lo trataría como un registro fallido y la usuaria la duplicaría.
  let upload: UploadIncidentImagesResult;
  try {
    upload = await uploadIncidentImages(incident.id, imageUris, source, token);
  } catch {
    upload = {
      images: [],
      pendingImageUris: imageUris.slice(0, MAX_INCIDENT_IMAGES),
      errorMessage: IMAGES_UPLOAD_ERROR_MESSAGE,
    };
  }

  return {
    incident: { ...incident, images: [...incident.images, ...upload.images] },
    source,
    pendingImageUris: upload.pendingImageUris,
    imagesUploadErrorMessage: upload.errorMessage,
  };
}

// Fallback: registra la incidencia en el mock (json-server) con JSON, con las
// mismas reglas que el backend (categoría del catálogo y coordenadas
// obligatorias). Las fotos se persisten después, igual que en el backend.
async function createIncidentOnMock(
  input: CreateIncidentInput,
  civicId: string,
): Promise<CreatedIncident> {
  // Se calcula una sola vez y se reutiliza en payload y location para que
  // todos los campos de fecha de la incidencia queden en el mismo instante.
  const createdAt = new Date().toISOString();

  const payload: IncidentPayload = {
    title: input.title.trim(),
    description: input.description.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    civicId,
    categoryId: input.categoryId,
    // El nombre se resuelve por `categoryId` al consultar el detalle.
    category: null,
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
    throw new Error(CREATE_INCIDENT_ERROR_MESSAGE);
  }

  const { id } = (await response.json()) as { id: string };

  return {
    id,
    title: payload.title,
    description: payload.description || null,
    civicId: payload.civicId,
    categoryId: payload.categoryId,
    category: payload.category,
    urbanAssetId: null,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      createdAt,
    },
    images: [],
    status: 'reported',
    priority: 'low',
    createdAt,
  };
}

// Construye el cuerpo JSON de POST /incidents: sin `civicId` (sale del JWT)
// y omitiendo los campos opcionales vacíos.
function buildBackendIncidentPayload(input: CreateIncidentInput): BackendCreateIncidentPayload {
  const trimmedDescription = input.description.trim();

  return {
    title: input.title.trim(),
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    categoryId: input.categoryId,
    latitude: input.latitude,
    longitude: input.longitude,
    ...(input.accuracy != null ? { accuracy: input.accuracy } : {}),
  };
}

// Crea una incidencia intentando primero el backend real (JSON autenticado con
// el JWT de la sesión) y cayendo al mock solo si no hay conexión (timeout o
// red). Si la sesión es del mock, su token no es un JWT válido para el backend
// y se registra directamente en el mock. Un rechazo del backend (!ok) se lanza
// como error sin usar el mock. Tras crearla, sube las fotos por separado: un
// fallo de esa subida no repite la creación, se devuelve en el resultado.
export async function createIncident(
  input: CreateIncidentInput,
  author: IncidentAuthor,
  imageUris: string[] = [],
): Promise<CreateIncidentResult> {
  const { civicId, token } = author;

  if (token?.source === 'mock') {
    const incident = await createIncidentOnMock(input, civicId);
    return attachImagesToCreatedIncident(incident, 'mock', imageUris, token);
  }

  if (token == null) {
    throw new Error(MISSING_BACKEND_TOKEN_MESSAGE);
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(BACKEND_INCIDENTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify(buildBackendIncidentPayload(input)),
    });
  } catch (error) {
    // Sin conexión con el backend: simulación en el mock. Se deja constancia
    // del motivo real en consola porque el aviso en pantalla es genérico.
    if (__DEV__) {
      console.warn('[incident.service] Fallback a mock, fallo al conectar con el backend:', error);
    }
    const incident = await createIncidentOnMock(input, civicId);
    return attachImagesToCreatedIncident(incident, 'mock', imageUris, token);
  }

  if (response.status === 401) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(
      await buildBackendRejectionMessage(response, CREATE_INCIDENT_ERROR_MESSAGE),
    );
  }

  const incident = (await response.json()) as CreatedIncident;
  return attachImagesToCreatedIncident(incident, 'backend', imageUris, token);
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
    throw new Error(FETCH_INCIDENTS_ERROR_MESSAGE);
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
        FETCH_INCIDENTS_ERROR_MESSAGE,
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
    throw new IncidentNotFoundError(INCIDENT_NOT_FOUND_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(FETCH_INCIDENT_DETAIL_ERROR_MESSAGE);
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
    throw new IncidentNotFoundError(INCIDENT_NOT_FOUND_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(FETCH_INCIDENT_DETAIL_ERROR_MESSAGE);
  }

  const incident = (await response.json()) as IncidentDetail;
  return { incident, source: 'backend' };
}
