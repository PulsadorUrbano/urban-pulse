import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import type { Category, FetchCategoriesResult } from '@/types/category';

import { RequestTimeoutError, fetchWithTimeout } from './http';

const BACKEND_CATEGORIES_ENDPOINT = `${BACKEND_API_URL}/categories`;
const MOCK_CATEGORIES_ENDPOINT = `${API_BASE_URL}/categories`;

// Alias del endpoint del backend para no romper imports existentes.
export const CATEGORIES_ENDPOINT = BACKEND_CATEGORIES_ENDPOINT;

// Describe un fallo de conexión (timeout o red) con el backend. A diferencia
// de un Error que se lanza, aquí se devuelve como texto porque este fallo no
// es bloqueante: solo informa del motivo del fallback al mock.
function describeConnectionError(error: unknown): string {
  if (error instanceof RequestTimeoutError) {
    return 'El backend tardó demasiado en responder.';
  }

  return 'No se pudo conectar con el backend.';
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

// Describe el motivo por el que el backend rechazó la petición de categorías.
// Al igual que describeConnectionError, no lanza: solo informa del fallback.
async function describeBackendRejection(response: Response): Promise<string> {
  const genericMessage = `El backend respondió con un error (${response.status}).`;

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    return genericMessage;
  }

  const backendMessage = extractBackendErrorMessage(rawBody);
  return backendMessage
    ? `El backend respondió con un error (${response.status}): ${backendMessage}`
    : genericMessage;
}

// Fallback: obtiene el catálogo de categorías desde el servidor mock
// (json-server). Es el último recurso: si falla, se propaga el error.
async function fetchCategoriesFromMock(): Promise<Category[]> {
  let response: Response;

  try {
    response = await fetchWithTimeout(MOCK_CATEGORIES_ENDPOINT, { method: 'GET' });
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudieron cargar las categorías. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error(
      'No se pudieron cargar las categorías. Inténtalo de nuevo más tarde.',
    );
  }

  const categories = (await response.json()) as Category[];
  return categories;
}

// Obtiene el catálogo de categorías intentando primero el backend real y
// cayendo al mock si falla. A diferencia de createIncident (un POST, donde
// un !ok es un rechazo de negocio que no debe enmascararse), este es un GET
// de solo lectura sin semántica de rechazo: tanto un fallo de conexión como
// un !ok se tratan igual y caen al mock, dejando constancia del motivo en
// `backendErrorMessage` para que la UI pueda avisar de forma visible.
export async function fetchCategories(): Promise<FetchCategoriesResult> {
  let response: Response;

  try {
    response = await fetchWithTimeout(BACKEND_CATEGORIES_ENDPOINT, { method: 'GET' });
  } catch (error) {
    if (__DEV__) {
      console.warn('[category.service] Fallback a mock, fallo al conectar con el backend:', error);
    }

    const categories = await fetchCategoriesFromMock();
    return { categories, source: 'mock', backendErrorMessage: describeConnectionError(error) };
  }

  if (!response.ok) {
    const backendErrorMessage = await describeBackendRejection(response);

    if (__DEV__) {
      console.warn(`[category.service] Fallback a mock, el backend rechazó la petición: ${backendErrorMessage}`);
    }

    const categories = await fetchCategoriesFromMock();
    return { categories, source: 'mock', backendErrorMessage };
  }

  const categories = (await response.json()) as Category[];
  return { categories, source: 'backend', backendErrorMessage: null };
}
