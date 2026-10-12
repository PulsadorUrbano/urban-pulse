import { API_BASE_URL } from '@/constants/config';
import {
  DEFAULT_INCIDENT_STATUS,
  type CreateIncidentInput,
  type Incident,
} from '@/types/incident';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// Crea una incidencia rellenando los campos automáticos (estado inicial, fecha
// de creación y relaciones sin asignar) y la persiste en el servidor mock.
export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const trimmedCustomCategory = input.category?.trim();

  const payload: Omit<Incident, 'id'> = {
    title: input.title.trim(),
    description: input.description.trim(),
    status: DEFAULT_INCIDENT_STATUS,
    priority: null,
    createdAt: new Date().toISOString(),
    civicId: null,
    locationId: input.locationId ?? null,
    urbanAssetId: null,
    categoryId: input.categoryId ?? null,
    category: trimmedCustomCategory ? trimmedCustomCategory : null,
    departmentId: null,
    teamId: null,
    technicianId: null,
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

  const incident = (await response.json()) as Incident;
  return incident;
}
