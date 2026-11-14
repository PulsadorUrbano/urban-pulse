/// <reference types="jest" />

import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import { fetchCategories } from '@/services/category.service';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import { IMAGES_ENDPOINT, createImage } from '@/services/image.service';
import {
  INCIDENTS_ENDPOINT,
  IncidentNotFoundError,
  MAX_INCIDENT_IMAGES,
  createIncident,
  fetchIncidentById,
  fetchMyIncidents,
} from '@/services/incident.service';
import {
  DEFAULT_INCIDENT_STATUS,
  type CreateIncidentInput,
  type CreatedIncident,
  type IncidentDetail,
  type IncidentSummary,
} from '@/types/incident';
import type { IncidentImage } from '@/types/incident-image';

// Mock de la capa HTTP: se conserva RequestTimeoutError real para que el
// servicio distinga los errores exactamente como en producción.
jest.mock('@/services/http', () => {
  const actualHttpModule = jest.requireActual<typeof import('@/services/http')>(
    '@/services/http',
  );
  return {
    ...actualHttpModule,
    fetchWithTimeout: jest.fn(),
  };
});

// Persistencia de imágenes del fallback al mock: se controla por separado.
// Se conserva el módulo real (IMAGES_ENDPOINT lo usa el detalle de incidencia) y solo se simula createImage.
jest.mock('@/services/image.service', () => ({
  ...jest.requireActual<typeof import('@/services/image.service')>('@/services/image.service'),
  createImage: jest.fn(),
}));

// Catálogo de categorías: se simula para controlar la resolución de `category` por `categoryId`.
jest.mock('@/services/category.service', () => ({
  fetchCategories: jest.fn(),
}));

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);
const mockedCreateImage = jest.mocked(createImage);
const mockedFetchCategories = jest.mocked(fetchCategories);

// Endpoint del mock (json-server) al que cae el servicio sin conexión con el backend.
const MOCK_INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// Identificador del ciudadano que se pasa explícitamente a createIncident en cada llamada.
const TEST_CIVIC_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';
// Token de acceso de prueba que se pasa a createIncident y fetchIncidentById.
const TEST_ACCESS_TOKEN = 'test-access-token';

// Instante fijo para verificar los `createdAt` que el servicio genera en el mock.
const FIXED_NOW_ISO = '2026-10-19T12:00:00.000Z';

// Id que json-server asigna a la incidencia creada en el mock.
const MOCK_CREATED_INCIDENT_ID = '99';

const MESSAGE_TIMEOUT_ERROR =
  'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.';
const MESSAGE_CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const MESSAGE_REGISTER_ERROR = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';


// Input completo con espacios extra a propósito para verificar el trim().
const fullInput: CreateIncidentInput = {
  title: '  Bache en la avenida principal  ',
  description: '  Hay un bache profundo que pone en riesgo a los vehículos.  ',
  categoryId: '2',
  category: '  Vallado  ',
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

// Input mínimo: sin descripción, sin categoría y sin ubicación.
const minimalInput: CreateIncidentInput = {
  title: 'Farola fundida',
  description: '',
  categoryId: null,
  category: null,
  latitude: null,
  longitude: null,
  accuracy: null,
};

// Respuesta del backend real (POST /incidents) con el shape de CreatedIncident.
const serverCreatedIncident: CreatedIncident = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  civicId: TEST_CIVIC_ID,
  categoryId: '2',
  category: 'Vallado',
  urbanAssetId: null,
  location: {
    latitude: 40.4168,
    longitude: -3.7038,
    accuracy: 10,
    createdAt: FIXED_NOW_ISO,
  },
  images: [
    {
      id: 'img-1',
      url: 'https://picsum.photos/seed/bache/800/600',
      mimeType: 'image/jpeg',
      createdAt: FIXED_NOW_ISO,
    },
  ],
  status: 'reported',
  priority: 'low',
  createdAt: FIXED_NOW_ISO,
};

// Respuesta mínima compatible con lo que usa el servicio (ok + json).
// `status` decide `ok`: 2xx es correcto, cualquier otro código es rechazo.
function jsonResponse(body: unknown, status = 201): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

// Resultado que devuelve fetch para un endpoint concreto: respuesta o fallo de red/timeout.
type EndpointOutcome = Response | Error;

interface EndpointOutcomes {
  backend: EndpointOutcome;
  mock: EndpointOutcome;
}

// Enruta cada llamada de fetchWithTimeout según la URL: backend o mock.
// Así el mismo test puede simular un backend caído y un mock sano (o al revés).
function routeFetchByEndpoint(outcomes: EndpointOutcomes): void {
  fetchWithTimeoutMock.mockImplementation(async (requestUrl: string) => {
    const outcome = requestUrl === INCIDENTS_ENDPOINT ? outcomes.backend : outcomes.mock;
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  });
}

// Devuelve la URL de una llamada concreta de fetchWithTimeout.
function readRequestUrlAt(callIndex = 0): string {
  const [requestUrl] = fetchWithTimeoutMock.mock.calls[callIndex];
  return requestUrl;
}

// Devuelve el init (método, body, cabeceras) de una llamada concreta.
function readSentInit(callIndex = 0): RequestInit {
  const [, requestInit] = fetchWithTimeoutMock.mock.calls[callIndex];
  return requestInit ?? {};
}

// Devuelve las cabeceras de una llamada concreta de fetchWithTimeout.
function readSentHeaders(callIndex = 0): Record<string, string> {
  return (readSentInit(callIndex).headers ?? {}) as Record<string, string>;
}

// Devuelve el body JSON de una llamada concreta (camino del mock).
function readSentJsonBody(callIndex = 0): Record<string, unknown> {
  const sentBody = readSentInit(callIndex).body;
  if (typeof sentBody !== 'string') {
    throw new Error('El body enviado no es una cadena JSON.');
  }
  return JSON.parse(sentBody) as Record<string, unknown>;
}

// Persistencia simulada de una imagen: devuelve el registro con id derivado del nombre de fichero.
function fakeCreateImageImplementation(input: { url: string; incidentId: string }): Promise<IncidentImage> {
  const fileName = input.url.split('/').pop() ?? input.url;
  return Promise.resolve({
    id: `img-${fileName}`,
    url: input.url,
    incidentId: input.incidentId,
  });
}

describe('createIncident', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedCreateImage.mockReset();
    mockedCreateImage.mockImplementation(fakeCreateImageImplementation);
    // Por defecto el backend responde correctamente; el mock queda sano por si se usara.
    routeFetchByEndpoint({
      backend: jsonResponse(serverCreatedIncident, 201),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('camino backend: petición JSON autenticada', () => {
    it('hace POST a `${BACKEND_API_URL}/incidents`', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(INCIDENTS_ENDPOINT).toBe(`${BACKEND_API_URL}/incidents`);
      expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents`);
      expect(readSentInit(0).method).toBe('POST');
    });

    it('envía exactamente las cabeceras Authorization (Bearer) y Content-Type application/json', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentHeaders(0)).toEqual({
        Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      });
    });

    it('usa el accessToken recibido como argumento en la cabecera Authorization', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, 'otro-token-de-prueba');

      expect(readSentHeaders(0).Authorization).toBe('Bearer otro-token-de-prueba');
    });

    it('envía el body como cadena JSON (no como FormData)', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(typeof readSentInit(0).body).toBe('string');
    });

    it('usa el timeout ampliado de 30 s para la petición al backend', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(fetchWithTimeoutMock.mock.calls[0][2]).toBe(30000);
    });
  });

  describe('camino backend: campos del payload JSON', () => {
    it('con input completo envía title, description, categoryId, category y ubicación con trim aplicado', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).toEqual({
        title: 'Bache en la avenida principal',
        description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
        categoryId: '2',
        category: 'Vallado',
        latitude: 40.4168,
        longitude: -3.7038,
        accuracy: 10,
      });
    });

    it('envía latitude, longitude y accuracy como number, no como string', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      const sentBody = readSentJsonBody(0);
      expect(sentBody.latitude).toBe(40.4168);
      expect(sentBody.longitude).toBe(-3.7038);
      expect(sentBody.accuracy).toBe(10);
    });

    it('no envía civicId en el body (el backend lo deriva del JWT)', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('civicId');
    });

    it('no envía images en el body aunque se reciban imageUris', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg', 'file:///photos/b.png']);

      expect(readSentJsonBody(0)).not.toHaveProperty('images');
    });

    it('no envía campos de gestión (status, priority, createdAt) ni relaciones', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      const sentBody = readSentJsonBody(0);
      expect(sentBody).not.toHaveProperty('status');
      expect(sentBody).not.toHaveProperty('priority');
      expect(sentBody).not.toHaveProperty('createdAt');
      expect(sentBody).not.toHaveProperty('urbanAssetId');
    });

    it('con input mínimo envía solo title', async () => {
      await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).toEqual({ title: 'Farola fundida' });
    });

    it('omite description cuando solo tiene espacios en blanco', async () => {
      await createIncident({ ...fullInput, description: '   \n\t  ' }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('description');
    });

    it('omite categoryId cuando es undefined', async () => {
      const inputWithoutCategoryId: CreateIncidentInput = {
        title: fullInput.title,
        description: fullInput.description,
      };

      await createIncident(inputWithoutCategoryId, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('categoryId');
    });

    it('omite category cuando es null', async () => {
      await createIncident({ ...fullInput, category: null }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('category');
    });

    it('omite category cuando es cadena vacía o solo espacios', async () => {
      await createIncident({ ...fullInput, category: '   ' }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('category');
    });

    it('envía categoryId aunque sea cadena vacía, porque solo filtra null y undefined', async () => {
      await createIncident({ ...fullInput, categoryId: '' }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0).categoryId).toBe('');
    });

    it('omite latitude, longitude y accuracy cuando son null, sin afectar a los demás', async () => {
      await createIncident(
        { ...fullInput, latitude: null, longitude: null, accuracy: null },
        TEST_CIVIC_ID,
        TEST_ACCESS_TOKEN,
      );

      const sentBody = readSentJsonBody(0);
      expect(sentBody).not.toHaveProperty('latitude');
      expect(sentBody).not.toHaveProperty('longitude');
      expect(sentBody).not.toHaveProperty('accuracy');
      expect(sentBody.title).toBe('Bache en la avenida principal');
    });

    it('omite solo accuracy cuando hay coordenadas pero la precisión es null', async () => {
      await createIncident({ ...fullInput, accuracy: null }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      const sentBody = readSentJsonBody(0);
      expect(sentBody.latitude).toBe(40.4168);
      expect(sentBody.longitude).toBe(-3.7038);
      expect(sentBody).not.toHaveProperty('accuracy');
    });

    it('envía latitude 0 como 0 (el cero no es un valor ausente)', async () => {
      await createIncident({ ...fullInput, latitude: 0 }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0).latitude).toBe(0);
    });

    it('envía longitude 0 y accuracy 0 como 0', async () => {
      await createIncident({ ...fullInput, longitude: 0, accuracy: 0 }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      const sentBody = readSentJsonBody(0);
      expect(sentBody.longitude).toBe(0);
      expect(sentBody.accuracy).toBe(0);
    });
  });

  describe('camino backend: imágenes', () => {
    it('sin imageUris no crea registros de imagen ni añade images al body', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(readSentJsonBody(0)).not.toHaveProperty('images');
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('con un array vacío tampoco añade images al body', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, []);

      expect(readSentJsonBody(0)).not.toHaveProperty('images');
    });

    it('con 9 URIs no las envía al backend ni recorta el body (el backend aún no admite imágenes)', async () => {
      const nineUris = Array.from({ length: 9 }, (_, index) => `file:///photos/${index}.jpg`);

      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, nineUris);

      expect(readSentJsonBody(0)).not.toHaveProperty('images');
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('en el camino backend no persiste imágenes por separado (createImage no se llama)', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg']);

      expect(mockedCreateImage).not.toHaveBeenCalled();
    });
  });

  describe('camino backend: éxito y rechazo', () => {
    it('con backend OK devuelve { incident, source: "backend" } con la respuesta parseada', async () => {
      const result = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(result).toEqual({ incident: serverCreatedIncident, source: 'backend' });
    });

    it('con backend OK no contacta con el mock ni persiste imágenes', async () => {
      await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg']);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).not.toBe(MOCK_INCIDENTS_ENDPOINT);
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('lee el cuerpo de la respuesta del backend una sola vez como JSON', async () => {
      const jsonSpy = jest.fn(async () => serverCreatedIncident);
      routeFetchByEndpoint({
        backend: { ok: true, status: 201, json: jsonSpy } as unknown as Response,
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

      expect(jsonSpy).toHaveBeenCalledTimes(1);
    });

    it('con backend !ok (500) lanza el mensaje de registro fallido', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'boom' }, 500),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });

    it('con backend !ok (400) lanza el mensaje de registro fallido', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({}, 400),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });

    it('con backend !ok y cuerpo con `message`, incluye el motivo real del backend en el error', async () => {
      routeFetchByEndpoint({
        backend: {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ message: 'title must contain 4 to 35 characters' }),
        } as unknown as Response,
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(
        `${MESSAGE_REGISTER_ERROR} (title must contain 4 to 35 characters)`,
      );
    });

    it('con backend !ok NO usa el mock: no hay segunda petición ni persistencia de imágenes', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'boom' }, 500),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg'])).rejects.toThrow(
        MESSAGE_REGISTER_ERROR,
      );

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents`);
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('con backend !ok no intenta parsear el cuerpo como incidencia', async () => {
      const jsonSpy = jest.fn();
      routeFetchByEndpoint({
        backend: { ok: false, status: 500, json: jsonSpy } as unknown as Response,
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
      expect(jsonSpy).not.toHaveBeenCalled();
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(FIXED_NOW_ISO));
    });

    describe('disparo del fallback', () => {
      it('con RequestTimeoutError del backend cae al mock y devuelve source "mock"', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(result.source).toBe('mock');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      });

      it('con error de red del backend (TypeError) cae al mock y devuelve source "mock"', async () => {
        routeFetchByEndpoint({
          backend: new TypeError('Network request failed'),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(result.source).toBe('mock');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      });

      it('primero intenta el backend (JSON autenticado) y después el mock (JSON sin Authorization)', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents`);
        expect(readSentHeaders(0).Authorization).toBe(`Bearer ${TEST_ACCESS_TOKEN}`);
        expect(readRequestUrlAt(1)).toBe(MOCK_INCIDENTS_ENDPOINT);
      });
    });

    describe('petición JSON al mock', () => {
      it('hace POST a `${API_BASE_URL}/incidents` con Content-Type application/json', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(readRequestUrlAt(1)).toBe(`${API_BASE_URL}/incidents`);
        expect(readSentInit(1).method).toBe('POST');
        expect(readSentInit(1).headers).toEqual({ 'Content-Type': 'application/json' });
      });

      it('envía el payload JSON con title/description con trim, civicId y ubicación del input', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(readSentJsonBody(1)).toEqual({
          title: 'Bache en la avenida principal',
          description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
          latitude: 40.4168,
          longitude: -3.7038,
          accuracy: 10,
          civicId: TEST_CIVIC_ID,
          categoryId: '2',
          category: 'Vallado',
          status: 'reported',
          createdAt: FIXED_NOW_ISO,
        });
      });

      it('con input mínimo envía null en description, category, categoryId y coordenadas', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(readSentJsonBody(1)).toEqual({
          title: 'Farola fundida',
          description: '',
          latitude: null,
          longitude: null,
          accuracy: null,
          civicId: TEST_CIVIC_ID,
          categoryId: null,
          category: null,
          status: 'reported',
          createdAt: FIXED_NOW_ISO,
        });
      });

      it('el payload del mock no es multipart: el body es una cadena JSON', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(typeof readSentInit(1).body).toBe('string');
      });
    });

    describe('incidencia ensamblada', () => {
      it('description vacía o solo espacios se devuelve como null', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident({ ...fullInput, description: '   ' }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(result.incident.description).toBeNull();
      });

      it('category vacía o solo espacios se devuelve como null', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident({ ...fullInput, category: '   ' }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(result.incident.category).toBeNull();
      });

      it('con input completo ensambla la incidencia con id del mock, coords del input y status "reported"', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        const expectedIncident: CreatedIncident = {
          id: MOCK_CREATED_INCIDENT_ID,
          title: 'Bache en la avenida principal',
          description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
          civicId: TEST_CIVIC_ID,
          categoryId: '2',
          category: 'Vallado',
          urbanAssetId: null,
          location: {
            latitude: 40.4168,
            longitude: -3.7038,
            accuracy: 10,
            createdAt: FIXED_NOW_ISO,
          },
          images: [],
          status: 'reported',
          priority: 'low',
          createdAt: FIXED_NOW_ISO,
        };
        expect(result).toEqual({ incident: expectedIncident, source: 'mock' });
      });

      it('con input mínimo ensambla description, category, categoryId y location a null', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const { incident } = await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(incident.id).toBe(MOCK_CREATED_INCIDENT_ID);
        expect(incident.title).toBe('Farola fundida');
        expect(incident.description).toBeNull();
        expect(incident.categoryId).toBeNull();
        expect(incident.category).toBeNull();
        expect(incident.location).toEqual({
          latitude: null,
          longitude: null,
          accuracy: null,
          createdAt: FIXED_NOW_ISO,
        });
        expect(incident.status).toBe('reported');
        expect(incident.priority).toBe('low');
      });

      it('la ubicación ensamblada refleja las coordenadas del input, incluido el cero', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const { incident } = await createIncident({
          ...fullInput,
          latitude: 0,
          longitude: 0,
          accuracy: null,
        }, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(incident.location).toEqual({
          latitude: 0,
          longitude: 0,
          accuracy: null,
          createdAt: FIXED_NOW_ISO,
        });
      });
    });

    describe('persistencia de imágenes en el mock', () => {
      it('sin imageUris no llama a createImage y devuelve images vacío', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const { incident } = await createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN);

        expect(mockedCreateImage).not.toHaveBeenCalled();
        expect(incident.images).toEqual([]);
      });

      it('llama a createImage una vez por cada uri con la url y el id de la incidencia del mock', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg', 'file:///photos/b.png']);

        expect(mockedCreateImage).toHaveBeenCalledTimes(2);
        expect(mockedCreateImage).toHaveBeenNthCalledWith(1, {
          url: 'file:///photos/a.jpg',
          incidentId: MOCK_CREATED_INCIDENT_ID,
        });
        expect(mockedCreateImage).toHaveBeenNthCalledWith(2, {
          url: 'file:///photos/b.png',
          incidentId: MOCK_CREATED_INCIDENT_ID,
        });
      });

      it('ensambla images con id, url, mimeType inferido de la uri y createdAt', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const { incident } = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, [
          'file:///photos/a.png',
          'file:///photos/b.jpg',
        ]);

        expect(incident.images).toEqual([
          {
            id: 'img-a.png',
            url: 'file:///photos/a.png',
            mimeType: 'image/png',
            createdAt: FIXED_NOW_ISO,
          },
          {
            id: 'img-b.jpg',
            url: 'file:///photos/b.jpg',
            mimeType: 'image/jpeg',
            createdAt: FIXED_NOW_ISO,
          },
        ]);
      });

      it('recorta a las 8 primeras imágenes: con 9 uris solo llama a createImage 8 veces', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });
        const nineImageUris = [
          'file:///photos/1.jpg',
          'file:///photos/2.jpg',
          'file:///photos/3.jpg',
          'file:///photos/4.jpg',
          'file:///photos/5.jpg',
          'file:///photos/6.jpg',
          'file:///photos/7.jpg',
          'file:///photos/8.jpg',
          'file:///photos/9.jpg',
        ];

        const { incident } = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, nineImageUris);

        expect(mockedCreateImage).toHaveBeenCalledTimes(MAX_INCIDENT_IMAGES);
        expect(mockedCreateImage.mock.calls.map(([input]) => input.url)).toEqual(
          nineImageUris.slice(0, 8),
        );
        expect(incident.images).toHaveLength(8);
      });

      it('si createImage rechaza una imagen se omite del images sin romper la creación', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });
        mockedCreateImage.mockImplementation((input) => {
          if (input.url.endsWith('b.jpg')) {
            return Promise.reject(new Error('No se pudo guardar la imagen.'));
          }
          return fakeCreateImageImplementation(input);
        });

        const result = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, [
          'file:///photos/a.png',
          'file:///photos/b.jpg',
          'file:///photos/c.webp',
        ]);

        expect(result.source).toBe('mock');
        expect(result.incident.images.map((image) => image.url)).toEqual([
          'file:///photos/a.png',
          'file:///photos/c.webp',
        ]);
      });

      it('si todas las imágenes fallan la incidencia se devuelve igualmente con images vacío', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });
        mockedCreateImage.mockRejectedValue(new Error('No se pudo guardar la imagen.'));

        const result = await createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg']);

        expect(result.source).toBe('mock');
        expect(result.incident.id).toBe(MOCK_CREATED_INCIDENT_ID);
        expect(result.incident.images).toEqual([]);
      });
    });

    describe('fallos del mock', () => {
      it('con timeout del mock lanza el mensaje de timeout y no persiste imágenes', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: new RequestTimeoutError(),
        });

        await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg'])).rejects.toThrow(
          MESSAGE_TIMEOUT_ERROR,
        );
        expect(mockedCreateImage).not.toHaveBeenCalled();
      });

      it('con error de red del mock lanza el mensaje de conexión', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: new TypeError('Network request failed'),
        });

        await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_CONNECTION_ERROR);
      });

      it('con backend caído y mock !ok (500) lanza el mensaje de registro fallido', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ message: 'boom' }, 500),
        });

        await expect(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN, ['file:///photos/a.jpg'])).rejects.toThrow(
          MESSAGE_REGISTER_ERROR,
        );
        expect(mockedCreateImage).not.toHaveBeenCalled();
      });

      it('con backend caído y mock !ok (400) lanza el mensaje de registro fallido', async () => {
        routeFetchByEndpoint({
          backend: new TypeError('Network request failed'),
          mock: jsonResponse({}, 400),
        });

        await expect(createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
      });

      it('con backend caído y mock !ok no intenta parsear el cuerpo del mock', async () => {
        const mockJsonSpy = jest.fn();
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: { ok: false, status: 500, json: mockJsonSpy } as unknown as Response,
        });

        await expect(createIncident(minimalInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
        expect(mockJsonSpy).not.toHaveBeenCalled();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Consulta de incidencias: fetchMyIncidents y fetchIncidentById
// ---------------------------------------------------------------------------

// Ciudadano de la sesión que pide sus incidencias (distinto del temporal para no confundir fuentes).
const CITIZEN_CIVIC_ID = 'ciudadano-civic-id-01';
const DETAIL_INCIDENT_ID = 'inc-7';
const DETAIL_CREATED_AT = '2026-10-18T09:30:00.000Z';
const LIST_NEWEST_CREATED_AT = '2026-10-20T08:00:00.000Z';
const LIST_OLDER_CREATED_AT = '2026-10-10T10:00:00.000Z';

const BACKEND_LIST_URL = `${BACKEND_API_URL}/incidents?civicId=${CITIZEN_CIVIC_ID}`;
const MOCK_LIST_URL = `${MOCK_INCIDENTS_ENDPOINT}?civicId=${CITIZEN_CIVIC_ID}`;
const BACKEND_DETAIL_URL = `${BACKEND_API_URL}/incidents/${DETAIL_INCIDENT_ID}`;
const MOCK_DETAIL_URL = `${MOCK_INCIDENTS_ENDPOINT}/${DETAIL_INCIDENT_ID}`;
const DETAIL_IMAGES_URL = `${IMAGES_ENDPOINT}?incidentId=${DETAIL_INCIDENT_ID}`;

const MESSAGE_MY_INCIDENTS_ERROR =
  'No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.';
const MESSAGE_INCIDENT_DETAIL_ERROR =
  'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.';

// Resolución de cada URL pedida: una respuesta, o un fallo de red/timeout si devuelve un Error.
// Una URL no prevista devuelve un Error, que se propaga como fallo de conexión; las aserciones
// sobre número y URL de las llamadas detectan cualquier desviación.
type UrlOutcomeResolver = (requestUrl: string) => EndpointOutcome;

function routeFetchByUrl(resolveOutcome: UrlOutcomeResolver): void {
  fetchWithTimeoutMock.mockImplementation(async (requestUrl: string) => {
    const outcome = resolveOutcome(requestUrl);
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  });
}

// Registro plano de `incidents` tal como lo sirve json-server; los campos no indicados quedan vacíos.
function buildMockIncidentRecord(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    description: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    civicId: CITIZEN_CIVIC_ID,
    categoryId: null,
    category: null,
    ...overrides,
  };
}

// Registros del mock en un orden distinto al esperado (3, 2, 1). Los ids 2 y 3 empatan en createdAt.
const mockIncidentRecordsInReceivedOrder = [
  buildMockIncidentRecord({
    id: '3',
    title: 'Bache calle Mayor',
    categoryId: '1',
    status: 'resolved',
    createdAt: LIST_OLDER_CREATED_AT,
  }),
  buildMockIncidentRecord({
    id: '2',
    title: 'Contenedor desbordado',
    status: 'in_progress',
    createdAt: LIST_OLDER_CREATED_AT,
  }),
  buildMockIncidentRecord({
    id: '1',
    title: 'Farola fundida',
    status: 'reported',
    createdAt: LIST_NEWEST_CREATED_AT,
  }),
];

// Orden esperado: desc por createdAt, con desempate asc por id (2 antes que 3).
const expectedOrderedSummaries: IncidentSummary[] = [
  { id: '1', title: 'Farola fundida', status: 'reported', createdAt: LIST_NEWEST_CREATED_AT },
  { id: '2', title: 'Contenedor desbordado', status: 'in_progress', createdAt: LIST_OLDER_CREATED_AT },
  { id: '3', title: 'Bache calle Mayor', status: 'resolved', createdAt: LIST_OLDER_CREATED_AT },
];

// Respuesta del backend: el contrato ya viene ordenado, pero este fixture NO está ordenado a propósito
// para comprobar que el servicio no reordena lo que devuelve el backend.
const backendIncidentSummaries: IncidentSummary[] = [
  { id: '3', title: 'Bache calle Mayor', status: 'resolved', createdAt: LIST_OLDER_CREATED_AT },
  { id: '1', title: 'Farola fundida', status: 'reported', createdAt: LIST_NEWEST_CREATED_AT },
  { id: '2', title: 'Contenedor desbordado', status: 'in_progress', createdAt: LIST_OLDER_CREATED_AT },
];

// Enruta el listado: backend (exacto) y mock (exacto), con respuestas configurables.
function routeMyIncidentsRequests(
  backendOutcome: EndpointOutcome,
  mockOutcome: EndpointOutcome = jsonResponse(mockIncidentRecordsInReceivedOrder, 200),
): void {
  routeFetchByUrl((requestUrl) => {
    if (requestUrl === BACKEND_LIST_URL) {
      return backendOutcome;
    }
    if (requestUrl === MOCK_LIST_URL) {
      return mockOutcome;
    }
    return new Error(`URL no prevista: ${requestUrl}`);
  });
}

// Detalle del backend y del mock, con imágenes del mock configurables.
const mockDetailRecord = buildMockIncidentRecord({
  id: DETAIL_INCIDENT_ID,
  title: 'Farola fundida',
  description: 'Sin luz desde el lunes',
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 8,
  categoryId: '2',
  status: 'validated',
  createdAt: DETAIL_CREATED_AT,
});

// Imágenes tal como las sirve json-server (IncidentImage): extensiones distintas para cubrir mimeType.
const mockImageRecords: IncidentImage[] = [
  { id: 'img-1', url: 'file:///photos/farola-1.png', incidentId: DETAIL_INCIDENT_ID },
  { id: 'img-2', url: 'file:///photos/farola-2.webp', incidentId: DETAIL_INCIDENT_ID },
  { id: 'img-3', url: 'file:///photos/farola-3.jpg', incidentId: DETAIL_INCIDENT_ID },
];

const expectedDetailImages = [
  { id: 'img-1', url: 'file:///photos/farola-1.png', mimeType: 'image/png', createdAt: DETAIL_CREATED_AT },
  { id: 'img-2', url: 'file:///photos/farola-2.webp', mimeType: 'image/webp', createdAt: DETAIL_CREATED_AT },
  { id: 'img-3', url: 'file:///photos/farola-3.jpg', mimeType: 'image/jpeg', createdAt: DETAIL_CREATED_AT },
];

// Catálogo de categorías usado para resolver `category` cuando solo hay `categoryId`.
const catalogCategories = [
  { id: '1', name: 'Transporte' },
  { id: '2', name: 'Alumbrado público' },
];

const backendIncidentDetail: IncidentDetail = {
  id: DETAIL_INCIDENT_ID,
  title: 'Farola fundida',
  description: 'Sin luz desde el lunes',
  civicId: CITIZEN_CIVIC_ID,
  categoryId: '2',
  category: null,
  urbanAssetId: null,
  location: { latitude: 40.4168, longitude: -3.7038, accuracy: 8, createdAt: DETAIL_CREATED_AT },
  images: [
    {
      id: 'img-1',
      url: 'file:///photos/farola-1.png',
      mimeType: 'image/png',
      createdAt: DETAIL_CREATED_AT,
    },
  ],
  status: 'validated',
  priority: 'low',
  createdAt: DETAIL_CREATED_AT,
};

interface DetailRoutingOptions {
  backend: EndpointOutcome;
  mockDetail?: EndpointOutcome;
  mockImages?: EndpointOutcome;
}

function routeIncidentDetailRequests({
  backend,
  mockDetail = jsonResponse(mockDetailRecord, 200),
  mockImages = jsonResponse(mockImageRecords, 200),
}: DetailRoutingOptions): void {
  routeFetchByUrl((requestUrl) => {
    if (requestUrl === BACKEND_DETAIL_URL) {
      return backend;
    }
    if (requestUrl === MOCK_DETAIL_URL) {
      return mockDetail;
    }
    if (requestUrl === DETAIL_IMAGES_URL) {
      return mockImages;
    }
    return new Error(`URL no prevista: ${requestUrl}`);
  });
}

describe('fetchMyIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    routeMyIncidentsRequests(jsonResponse(backendIncidentSummaries, 200));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('camino backend', () => {
    it('pide las incidencias al backend con el civicId recibido y devuelve source "backend"', async () => {
      await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_LIST_URL);
      expect(readSentInit(0).method).toBe('GET');
    });

    it('mapea la respuesta del backend 1:1 como IncidentSummary[] sin reordenarla', async () => {
      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result).toEqual({ incidents: backendIncidentSummaries, source: 'backend' });
    });

    it('con lista vacía del backend devuelve incidents vacío con source "backend"', async () => {
      routeMyIncidentsRequests(jsonResponse([], 200));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result).toEqual({ incidents: [], source: 'backend' });
    });

    it('con backend OK no consulta el mock', async () => {
      await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).not.toBe(MOCK_LIST_URL);
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    it('con RequestTimeoutError cae al mock, ordena desc por createdAt y devuelve source "mock"', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError());

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result).toEqual({ incidents: expectedOrderedSummaries, source: 'mock' });
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(readRequestUrlAt(1)).toBe(MOCK_LIST_URL);
    });

    it('con error de red (TypeError) cae al mock y devuelve source "mock" con el mismo orden', async () => {
      routeMyIncidentsRequests(new TypeError('Network request failed'));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result.source).toBe('mock');
      expect(result.incidents.map((incident) => incident.id)).toEqual(['1', '2', '3']);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    });

    it('desempata por id ascendente cuando dos incidencias tienen el mismo createdAt', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError());

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      const tiedIncidentIds = result.incidents
        .filter((incident) => incident.createdAt === LIST_OLDER_CREATED_AT)
        .map((incident) => incident.id);
      expect(tiedIncidentIds).toEqual(['2', '3']);
    });

    it('con mock sin incidencias devuelve incidents vacío con source "mock"', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), jsonResponse([], 200));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result).toEqual({ incidents: [], source: 'mock' });
    });
  });

  describe('registros del mock sin status ni createdAt', () => {
    it('asigna DEFAULT_INCIDENT_STATUS cuando el registro no trae status', async () => {
      jest.useFakeTimers().setSystemTime(new Date(FIXED_NOW_ISO));
      routeMyIncidentsRequests(
        new RequestTimeoutError(),
        jsonResponse([buildMockIncidentRecord({ id: '4', title: 'Registro sin estado' })], 200),
      );

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result.incidents).toHaveLength(1);
      expect(result.incidents[0].status).toBe(DEFAULT_INCIDENT_STATUS);
    });

    it('sin createdAt usa el instante actual para el orden (comportamiento actual del servicio)', async () => {
      // Con el reloj fijado en FIXED_NOW_ISO (2026-10-19), el registro sin fecha se ordena como "ahora":
      // queda entre la incidencia del 10-20 y las del 10-10. Ver reporte: posible comportamiento a revisar.
      jest.useFakeTimers().setSystemTime(new Date(FIXED_NOW_ISO));
      routeMyIncidentsRequests(
        new RequestTimeoutError(),
        jsonResponse(
          [
            ...mockIncidentRecordsInReceivedOrder,
            buildMockIncidentRecord({ id: '4', title: 'Registro sin fecha ni estado' }),
          ],
          200,
        ),
      );

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID);

      expect(result.incidents.map((incident) => incident.id)).toEqual(['1', '4', '2', '3']);
      expect(result.incidents[1]).toEqual({
        id: '4',
        title: 'Registro sin fecha ni estado',
        status: DEFAULT_INCIDENT_STATUS,
        createdAt: FIXED_NOW_ISO,
      });
    });
  });

  describe('errores', () => {
    it.each([400, 500])(
      'con backend !ok (%i) lanza error genérico y no hace segunda petición al mock',
      async (status) => {
        routeMyIncidentsRequests(jsonResponse({ message: 'boom' }, status));

        await expect(fetchMyIncidents(CITIZEN_CIVIC_ID)).rejects.toThrow(MESSAGE_MY_INCIDENTS_ERROR);

        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
        expect(readRequestUrlAt(0)).toBe(BACKEND_LIST_URL);
      },
    );

    it('con mock !ok tras caída del backend lanza error genérico', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), jsonResponse({}, 500));

      await expect(fetchMyIncidents(CITIZEN_CIVIC_ID)).rejects.toThrow(MESSAGE_MY_INCIDENTS_ERROR);
    });

    it('con mock sin conexión tras caída del backend lanza el mensaje de conexión', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), new TypeError('Network request failed'));

      await expect(fetchMyIncidents(CITIZEN_CIVIC_ID)).rejects.toThrow(
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Motivo del rechazo del backend (buildBackendRejectionMessage). createIncident
// y fetchMyIncidents comparten esa función interna, pero cada uno conserva su
// mensaje genérico. Las respuestas aquí exponen solo `ok`, `status` y `text`,
// que es lo único que lee el servicio en la rama !ok.
// ---------------------------------------------------------------------------

// Respuesta !ok cuyo cuerpo llega como texto plano.
function rawBodyResponse(status: number, rawBody: string): Response {
  return {
    ok: false,
    status,
    text: async () => rawBody,
  } as unknown as Response;
}

// Respuesta !ok cuya lectura del cuerpo falla (p. ej. conexión cortada al leer).
function unreadableBodyResponse(status: number): Response {
  return {
    ok: false,
    status,
    text: async () => {
      throw new Error('Stream cortado');
    },
  } as unknown as Response;
}

// Devuelve el Error con el que rechaza una promesa; falla la prueba si se resuelve.
async function captureRejection(operation: Promise<unknown>): Promise<Error> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw error;
  }
  throw new Error('Se esperaba un rechazo y la promesa se resolvió.');
}

describe('motivo del rechazo del backend en fetchMyIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('con backend !ok y message como string añade el motivo entre paréntesis', async () => {
    routeMyIncidentsRequests(rawBodyResponse(400, JSON.stringify({ message: 'civicId must be a UUID' })));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(`${MESSAGE_MY_INCIDENTS_ERROR} (civicId must be a UUID)`);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('con backend !ok y message como array une los motivos con "; " entre paréntesis', async () => {
    routeMyIncidentsRequests(
      rawBodyResponse(400, JSON.stringify({ message: ['status must be a string', 'civicId is required'] })),
    );

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(
      `${MESSAGE_MY_INCIDENTS_ERROR} (status must be a string; civicId is required)`,
    );
  });

  it('con backend !ok y cuerpo no JSON lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(rawBodyResponse(500, 'Internal Server Error'));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y JSON sin message lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(rawBodyResponse(500, JSON.stringify({ error: 'Internal', statusCode: 500 })));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y message vacío lanza solo el mensaje genérico, sin paréntesis vacíos', async () => {
    routeMyIncidentsRequests(rawBodyResponse(400, JSON.stringify({ message: '' })));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y cuerpo ilegible lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(unreadableBodyResponse(500));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });
});

describe('motivo del rechazo del backend en createIncident', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('con backend !ok y message como array une los motivos con "; " entre paréntesis', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(
        400,
        JSON.stringify({ message: ['title is required', 'description is too long'] }),
      ),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    expect(error.message).toBe(`${MESSAGE_REGISTER_ERROR} (title is required; description is too long)`);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('con backend !ok y cuerpo no JSON lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(502, '<html>Bad Gateway</html>'),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
  });

  it('con backend !ok y JSON sin message lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(400, JSON.stringify({ statusCode: 400 })),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
  });

  it('con backend !ok y cuerpo ilegible lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: unreadableBodyResponse(500),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });
});

describe('mensajes genéricos independientes entre createIncident y fetchMyIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('con el mismo cuerpo de error ambos mensajes genéricos siguen siendo distintos', async () => {
    fetchWithTimeoutMock.mockImplementation(async () => rawBodyResponse(500, JSON.stringify({ message: 'boom' })));

    const registerError = await captureRejection(createIncident(fullInput, TEST_CIVIC_ID, TEST_ACCESS_TOKEN));
    const listError = await captureRejection(fetchMyIncidents(TEST_CIVIC_ID));

    expect(MESSAGE_REGISTER_ERROR).not.toBe(MESSAGE_MY_INCIDENTS_ERROR);
    expect(registerError.message).toBe(`${MESSAGE_REGISTER_ERROR} (boom)`);
    expect(listError.message).toBe(`${MESSAGE_MY_INCIDENTS_ERROR} (boom)`);
    expect(registerError.message).not.toBe(listError.message);
  });
});

describe('aislamiento del civicId entre llamadas sucesivas', () => {
  const FIRST_CIVIC_ID = '11111111-1111-4111-8111-111111111111';
  const SECOND_CIVIC_ID = '22222222-2222-4222-8222-222222222222';
  const FIRST_ACCESS_TOKEN = 'first-access-token';
  const SECOND_ACCESS_TOKEN = 'second-access-token';

  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('dos accessToken distintos en createIncident por backend llegan cada uno en su propia petición', async () => {
    routeFetchByEndpoint({
      backend: jsonResponse(serverCreatedIncident, 201),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    await createIncident(fullInput, FIRST_CIVIC_ID, FIRST_ACCESS_TOKEN);
    await createIncident(fullInput, SECOND_CIVIC_ID, SECOND_ACCESS_TOKEN);

    expect(readSentHeaders(0).Authorization).toBe(`Bearer ${FIRST_ACCESS_TOKEN}`);
    expect(readSentHeaders(1).Authorization).toBe(`Bearer ${SECOND_ACCESS_TOKEN}`);
    expect(readSentJsonBody(0)).not.toHaveProperty('civicId');
    expect(readSentJsonBody(1)).not.toHaveProperty('civicId');
  });

  it('dos civicId distintos en createIncident con fallback al mock no se mezclan en el payload', async () => {
    routeFetchByEndpoint({
      backend: new RequestTimeoutError(),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    await createIncident(minimalInput, FIRST_CIVIC_ID, TEST_ACCESS_TOKEN);
    await createIncident(minimalInput, SECOND_CIVIC_ID, TEST_ACCESS_TOKEN);

    // Orden de llamadas: backend, mock, backend, mock.
    expect(readSentJsonBody(1).civicId).toBe(FIRST_CIVIC_ID);
    expect(readSentJsonBody(3).civicId).toBe(SECOND_CIVIC_ID);
  });

  it('dos civicId distintos en fetchMyIncidents consultan cada uno su propio listado', async () => {
    fetchWithTimeoutMock.mockImplementation(async () => jsonResponse([], 200));

    await fetchMyIncidents(FIRST_CIVIC_ID);
    await fetchMyIncidents(SECOND_CIVIC_ID);

    expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents?civicId=${FIRST_CIVIC_ID}`);
    expect(readRequestUrlAt(1)).toBe(`${BACKEND_API_URL}/incidents?civicId=${SECOND_CIVIC_ID}`);
  });
});

describe('fetchIncidentById', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedFetchCategories.mockReset();
    mockedFetchCategories.mockResolvedValue({ categories: catalogCategories, source: 'backend', backendErrorMessage: null });
    routeIncidentDetailRequests({ backend: jsonResponse(backendIncidentDetail, 200) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('camino backend', () => {
    it('envía Authorization Bearer con el accessToken recibido en el GET al backend', async () => {
      await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(readSentHeaders(0)).toEqual({ Authorization: `Bearer ${TEST_ACCESS_TOKEN}` });
      expect(readSentInit(0).method).toBe('GET');
    });

    it('pide el detalle a `${BACKEND_API_URL}/incidents/:id` y devuelve source "backend"', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_DETAIL_URL);
      expect(readSentInit(0).method).toBe('GET');
      expect(result).toEqual({ incident: backendIncidentDetail, source: 'backend' });
    });

    it('con backend OK no consulta imágenes, categorías ni el mock', async () => {
      await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(mockedFetchCategories).not.toHaveBeenCalled();
    });
  });

  describe('404 del backend', () => {
    it('404 real lanza IncidentNotFoundError y no hace segunda petición al mock', async () => {
      routeIncidentDetailRequests({ backend: jsonResponse({ message: 'Not Found' }, 404) });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN)).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_DETAIL_URL);
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    it('con RequestTimeoutError cae al mock y devuelve source "mock"', async () => {
      routeIncidentDetailRequests({ backend: new RequestTimeoutError() });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incident.id).toBe(DETAIL_INCIDENT_ID);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(3);
      expect(readRequestUrlAt(1)).toBe(MOCK_DETAIL_URL);
    });

    it('el GET de respaldo al mock no lleva cabecera Authorization', async () => {
      routeIncidentDetailRequests({ backend: new RequestTimeoutError() });

      await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(readRequestUrlAt(1)).toBe(MOCK_DETAIL_URL);
      expect(readSentInit(1).headers).toBeUndefined();
    });

    it('con error de red (TypeError) cae al mock y devuelve source "mock"', async () => {
      routeIncidentDetailRequests({ backend: new TypeError('Network request failed') });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incident.title).toBe('Farola fundida');
    });

    it('404 del mock lanza IncidentNotFoundError', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ message: 'Not Found' }, 404),
      });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN)).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );
    });

    it('mock !ok distinto de 404 lanza error genérico, no IncidentNotFoundError', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({}, 500),
      });

      const error = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(IncidentNotFoundError);
      expect((error as Error).message).toBe(MESSAGE_INCIDENT_DETAIL_ERROR);
    });

    it('mock sin conexión lanza el mensaje de conexión', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: new TypeError('Network request failed'),
      });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN)).rejects.toThrow(
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    });
  });

  describe('backend !ok distinto de 404', () => {
    it.each([400, 500])(
      'con backend !ok (%i) lanza error genérico, no IncidentNotFoundError, y no consulta el mock',
      async (status) => {
        routeIncidentDetailRequests({ backend: jsonResponse({ message: 'boom' }, status) });

        const error = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(IncidentNotFoundError);
        expect((error as Error).message).toBe(MESSAGE_INCIDENT_DETAIL_ERROR);
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('ensamblado desde el mock', () => {
    beforeEach(() => {
      routeIncidentDetailRequests({ backend: new RequestTimeoutError() });
    });

    it('ensambla el detalle completo con categoría resuelta por categoryId', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result).toEqual({
        incident: {
          id: DETAIL_INCIDENT_ID,
          title: 'Farola fundida',
          description: 'Sin luz desde el lunes',
          civicId: CITIZEN_CIVIC_ID,
          categoryId: '2',
          category: 'Alumbrado público',
          urbanAssetId: null,
          location: {
            latitude: 40.4168,
            longitude: -3.7038,
            accuracy: 8,
            createdAt: DETAIL_CREATED_AT,
          },
          images: expectedDetailImages,
          status: 'validated',
          priority: 'low',
          createdAt: DETAIL_CREATED_AT,
        },
        source: 'mock',
      });
    });

    it('pide las imágenes a `${IMAGES_ENDPOINT}?incidentId=:id`', async () => {
      await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      const requestedUrls = fetchWithTimeoutMock.mock.calls.map(([requestUrl]) => requestUrl);
      expect(requestedUrls).toContain(DETAIL_IMAGES_URL);
    });

    it('mapea imágenes con mimeType según la extensión y createdAt igual al de la incidencia', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.images).toEqual(expectedDetailImages);
      result.incident.images.forEach((image) => {
        expect(image.createdAt).toBe(result.incident.createdAt);
      });
    });

    it('si la petición de imágenes falla por red devuelve images vacío y el resto del detalle se ensambla', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockImages: new TypeError('Network request failed'),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.images).toEqual([]);
      expect(result.incident.title).toBe('Farola fundida');
      expect(result.incident.category).toBe('Alumbrado público');
      expect(result.source).toBe('mock');
    });

    it('si la petición de imágenes responde !ok devuelve images vacío sin romper el detalle', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockImages: jsonResponse({}, 500),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.images).toEqual([]);
      expect(result.incident.id).toBe(DETAIL_INCIDENT_ID);
    });
  });

  describe('resolución de categoría', () => {
    beforeEach(() => {
      routeIncidentDetailRequests({ backend: new RequestTimeoutError() });
    });

    it('con category de texto libre la usa tal cual y no llama a fetchCategories', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, category: 'Vallado' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.category).toBe('Vallado');
      expect(mockedFetchCategories).not.toHaveBeenCalled();
    });

    it('con solo categoryId llama a fetchCategories y resuelve el nombre por id', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(mockedFetchCategories).toHaveBeenCalledTimes(1);
      expect(result.incident.category).toBe('Alumbrado público');
    });

    it('con category vacía y categoryId presente resuelve por catálogo', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, category: '' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(mockedFetchCategories).toHaveBeenCalledTimes(1);
      expect(result.incident.category).toBe('Alumbrado público');
    });

    it('con categoryId sin coincidencia en el catálogo devuelve category null', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, categoryId: '99' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.category).toBeNull();
    });

    it('si fetchCategories falla devuelve category null sin romper el detalle ni las imágenes', async () => {
      mockedFetchCategories.mockRejectedValue(new Error('No se pudieron cargar las categorías.'));

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.category).toBeNull();
      expect(result.incident.title).toBe('Farola fundida');
      expect(result.incident.images).toEqual(expectedDetailImages);
    });

    it('sin categoryId ni category no llama a fetchCategories y devuelve null', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, categoryId: null, category: null }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(mockedFetchCategories).not.toHaveBeenCalled();
      expect(result.incident.category).toBeNull();
    });
  });

  describe('campos null o vacíos', () => {
    it('description vacía se devuelve como null', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, description: '' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.description).toBeNull();
    });

    it('sin categoría, sin descripción, sin coordenadas y sin imágenes ensambla el detalle con null y []', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse(
          buildMockIncidentRecord({
            id: DETAIL_INCIDENT_ID,
            title: 'Incidencia mínima',
            createdAt: DETAIL_CREATED_AT,
            status: 'reported',
          }),
          200,
        ),
        mockImages: jsonResponse([], 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result).toEqual({
        incident: {
          id: DETAIL_INCIDENT_ID,
          title: 'Incidencia mínima',
          description: null,
          civicId: CITIZEN_CIVIC_ID,
          categoryId: null,
          category: null,
          urbanAssetId: null,
          location: { latitude: null, longitude: null, accuracy: null, createdAt: DETAIL_CREATED_AT },
          images: [],
          status: 'reported',
          priority: 'low',
          createdAt: DETAIL_CREATED_AT,
        },
        source: 'mock',
      });
      expect(mockedFetchCategories).not.toHaveBeenCalled();
    });

    it('sin createdAt ni status en el registro usa el instante actual y DEFAULT_INCIDENT_STATUS', async () => {
      jest.useFakeTimers().setSystemTime(new Date(FIXED_NOW_ISO));
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse(
          buildMockIncidentRecord({ id: DETAIL_INCIDENT_ID, title: 'Registro antiguo' }),
          200,
        ),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, TEST_ACCESS_TOKEN);

      expect(result.incident.status).toBe(DEFAULT_INCIDENT_STATUS);
      expect(result.incident.createdAt).toBe(FIXED_NOW_ISO);
      expect(result.incident.location.createdAt).toBe(FIXED_NOW_ISO);
      expect(result.incident.images.map((image) => image.createdAt)).toEqual([
        FIXED_NOW_ISO,
        FIXED_NOW_ISO,
        FIXED_NOW_ISO,
      ]);
    });
  });
});
