import { API_BASE_URL } from '@/constants/config';
import type { Category } from '@/types/category';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const CATEGORIES_ENDPOINT = `${API_BASE_URL}/categories`;

// Obtiene el catálogo de categorías disponibles desde el servidor mock.
export async function fetchCategories(): Promise<Category[]> {
  let response: Response;

  try {
    response = await fetchWithTimeout(CATEGORIES_ENDPOINT, { method: 'GET' });
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
