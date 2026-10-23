/// <reference types="jest" />
import { File } from 'expo-file-system';

import { API_BASE_URL, BACKEND_API_URL } from '@/constants/config';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import { createImage } from '@/services/image.service';
import {
  INCIDENTS_ENDPOINT,
  MAX_INCIDENT_IMAGES,
  createIncident,
} from '@/services/incident.service';
import type {
  CreateIncidentInput,
  CreatedIncident,
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
jest.mock('@/services/image.service', () => ({
  createImage: jest.fn(),
}));

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);
const mockedCreateImage = jest.mocked(createImage);

// Endpoint del mock (json-server) al que cae el servicio sin conexión con el backend.
const MOCK_INCIDENTS_ENDPOINT = `${API_BASE_URL}/incidents`;

// Identificador temporal del ciudadano que el servicio envía en todos los casos.
const TEMPORARY_CIVIC_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Instante fijo para verificar los `createdAt` que el servicio genera en el mock.
const FIXED_NOW_ISO = '2026-10-19T12:00:00.000Z';

// Id que json-server asigna a la incidencia creada en el mock.
const MOCK_CREATED_INCIDENT_ID = '99';

const MESSAGE_TIMEOUT_ERROR =
  'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.';
const MESSAGE_CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const MESSAGE_REGISTER_ERROR = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';

// ---------------------------------------------------------------------------
// FormData espía. El FormData de React Native solo expone `getAll` (no `get`)
// y guarda sus partes en un campo interno; en lugar de depender de esa
// implementación, se sustituye por una versión mínima que registra cada
// `append` tal cual llega, y así las aserciones son explícitas.
// ---------------------------------------------------------------------------
class RecordingFormData {
  readonly entries: [string, unknown][] = [];

  append(name: string, value: unknown): void {
    this.entries.push([name, value]);
  }

  getAll(name: string): unknown[] {
    return this.entries.filter(([key]) => key === name).map(([, value]) => value);
  }

  get(name: string): unknown {
    return this.getAll(name)[0] ?? null;
  }

  has(name: string): boolean {
    return this.entries.some(([key]) => key === name);
  }

  fieldNames(): string[] {
    return this.entries.map(([key]) => key);
  }
}

// Forma de la parte de fichero: instancia de `File` de expo-file-system (el
// fetch de Expo ya no admite el antiguo `{ uri, name, type }` de React Native).
type ImageFilePart = File;

const OriginalFormData = globalThis.FormData;

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
  civicId: TEMPORARY_CIVIC_ID,
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

// Devuelve el FormData enviado en una llamada concreta de fetchWithTimeout.
function readSentFormData(callIndex = 0): RecordingFormData {
  const sentBody = readSentInit(callIndex).body;
  if (!(sentBody instanceof RecordingFormData)) {
    throw new Error('El body enviado no es un FormData.');
  }
  return sentBody;
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
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
    // Por defecto el backend responde correctamente; el mock queda sano por si se usara.
    routeFetchByEndpoint({
      backend: jsonResponse(serverCreatedIncident, 201),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
    jest.useRealTimers();
  });

  describe('camino backend: petición multipart', () => {
    it('hace POST a `${BACKEND_API_URL}/incidents`', async () => {
      await createIncident(fullInput);

      expect(INCIDENTS_ENDPOINT).toBe(`${BACKEND_API_URL}/incidents`);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt()).toBe(`${BACKEND_API_URL}/incidents`);
      expect(readSentInit().method).toBe('POST');
    });

    it('envía el body como FormData', async () => {
      await createIncident(fullInput);

      expect(readSentInit().body).toBeInstanceOf(RecordingFormData);
    });

    it('no pasa cabecera Content-Type (fetch añade el boundary multipart)', async () => {
      await createIncident(fullInput);

      const requestHeaders = readSentInit().headers as Record<string, string> | undefined;
      expect(requestHeaders?.['Content-Type']).toBeUndefined();
      expect(requestHeaders?.['content-type']).toBeUndefined();
    });
  });

  describe('camino backend: campos del formulario', () => {
    it('con input completo envía title con trim, civicId UUID temporal y description con trim', async () => {
      await createIncident(fullInput);

      const sentFormData = readSentFormData();
      expect(sentFormData.get('title')).toBe('Bache en la avenida principal');
      expect(sentFormData.get('description')).toBe(
        'Hay un bache profundo que pone en riesgo a los vehículos.',
      );
      expect(sentFormData.get('civicId')).toBe(TEMPORARY_CIVIC_ID);
      expect(UUID_PATTERN.test(String(sentFormData.get('civicId')))).toBe(true);
    });

    it('con input completo envía categoryId y category (con trim)', async () => {
      await createIncident(fullInput);

      const sentFormData = readSentFormData();
      expect(sentFormData.get('categoryId')).toBe('2');
      expect(sentFormData.get('category')).toBe('Vallado');
    });

    it('con input completo envía latitude, longitude y accuracy como string', async () => {
      await createIncident(fullInput);

      const sentFormData = readSentFormData();
      expect(sentFormData.get('latitude')).toBe('40.4168');
      expect(sentFormData.get('longitude')).toBe('-3.7038');
      expect(sentFormData.get('accuracy')).toBe('10');
    });

    it('con input completo envía exactamente los 8 campos de texto y ninguno más', async () => {
      await createIncident(fullInput);

      expect(readSentFormData().fieldNames().sort()).toEqual(
        [
          'accuracy',
          'category',
          'categoryId',
          'civicId',
          'description',
          'latitude',
          'longitude',
          'title',
        ].sort(),
      );
    });

    it('no envía campos de gestión (status, priority, createdAt) ni relaciones', async () => {
      await createIncident(fullInput);

      const sentFieldNames = readSentFormData().fieldNames();
      for (const managedField of [
        'status',
        'priority',
        'createdAt',
        'locationId',
        'urbanAssetId',
        'departmentId',
        'teamId',
        'technicianId',
      ]) {
        expect(sentFieldNames).not.toContain(managedField);
      }
    });

    it('con input mínimo omite description, categoryId, category, latitude, longitude y accuracy', async () => {
      await createIncident(minimalInput);

      const sentFormData = readSentFormData();
      expect(sentFormData.fieldNames().sort()).toEqual(['civicId', 'title']);
      expect(sentFormData.has('description')).toBe(false);
      expect(sentFormData.has('categoryId')).toBe(false);
      expect(sentFormData.has('category')).toBe(false);
      expect(sentFormData.has('latitude')).toBe(false);
      expect(sentFormData.has('longitude')).toBe(false);
      expect(sentFormData.has('accuracy')).toBe(false);
    });

    it('omite description cuando solo tiene espacios en blanco', async () => {
      await createIncident({ ...fullInput, description: '   \n\t  ' });

      expect(readSentFormData().has('description')).toBe(false);
    });

    it('omite categoryId cuando es undefined', async () => {
      const inputWithoutCategoryId: CreateIncidentInput = {
        title: fullInput.title,
        description: fullInput.description,
      };

      await createIncident(inputWithoutCategoryId);

      expect(readSentFormData().has('categoryId')).toBe(false);
    });

    it('omite category cuando es null', async () => {
      await createIncident({ ...fullInput, category: null });

      expect(readSentFormData().has('category')).toBe(false);
    });

    it('omite category cuando es cadena vacía o solo espacios', async () => {
      await createIncident({ ...fullInput, category: '   ' });

      expect(readSentFormData().has('category')).toBe(false);
    });

    it('envía categoryId aunque sea cadena vacía, porque solo filtra null y undefined', async () => {
      await createIncident({ ...fullInput, categoryId: '' });

      expect(readSentFormData().get('categoryId')).toBe('');
    });

    it('omite latitude, longitude y accuracy cuando son null, sin afectar a los demás', async () => {
      await createIncident({ ...fullInput, latitude: null, longitude: null, accuracy: null });

      const sentFormData = readSentFormData();
      expect(sentFormData.has('latitude')).toBe(false);
      expect(sentFormData.has('longitude')).toBe(false);
      expect(sentFormData.has('accuracy')).toBe(false);
      expect(sentFormData.get('title')).toBe('Bache en la avenida principal');
    });

    it('omite solo accuracy cuando hay coordenadas pero la precisión es null', async () => {
      await createIncident({ ...fullInput, accuracy: null });

      const sentFormData = readSentFormData();
      expect(sentFormData.get('latitude')).toBe('40.4168');
      expect(sentFormData.get('longitude')).toBe('-3.7038');
      expect(sentFormData.has('accuracy')).toBe(false);
    });

    it('envía latitude 0 como "0" (el cero no es un valor ausente)', async () => {
      await createIncident({ ...fullInput, latitude: 0 });

      expect(readSentFormData().get('latitude')).toBe('0');
    });

    it('envía longitude 0 y accuracy 0 como "0"', async () => {
      await createIncident({ ...fullInput, longitude: 0, accuracy: 0 });

      const sentFormData = readSentFormData();
      expect(sentFormData.get('longitude')).toBe('0');
      expect(sentFormData.get('accuracy')).toBe('0');
    });
  });

  describe('camino backend: imágenes', () => {
    it('sin imageUris no añade ninguna parte images', async () => {
      await createIncident(fullInput);

      expect(readSentFormData().has('images')).toBe(false);
    });

    it('con un array vacío no añade ninguna parte images', async () => {
      await createIncident(fullInput, []);

      expect(readSentFormData().has('images')).toBe(false);
    });

    it('con 6 URIs envía solo las 5 primeras como partes images', async () => {
      const sixImageUris = [
        'file:///photos/a.jpg',
        'file:///photos/b.jpg',
        'file:///photos/c.jpg',
        'file:///photos/d.jpg',
        'file:///photos/e.jpg',
        'file:///photos/f.jpg',
      ];

      await createIncident(fullInput, sixImageUris);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(MAX_INCIDENT_IMAGES).toBe(5);
      expect(imageParts).toHaveLength(5);
      expect(imageParts.map((part) => part.uri)).toEqual(sixImageUris.slice(0, 5));
    });

    it('con 5 URIs exactas envía las 5 sin recortar', async () => {
      const fiveImageUris = [
        'file:///photos/1.jpg',
        'file:///photos/2.jpg',
        'file:///photos/3.jpg',
        'file:///photos/4.jpg',
        'file:///photos/5.jpg',
      ];

      await createIncident(fullInput, fiveImageUris);

      expect(readSentFormData().getAll('images')).toHaveLength(5);
    });

    it('envía cada parte images como una instancia de File con la URI original', async () => {
      await createIncident(fullInput, ['file:///photos/a.png', 'file:///photos/b.webp', 'file:///photos/c.jpg']);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imageParts.every((part) => part instanceof File)).toBe(true);
      expect(imageParts.map((part) => part.uri)).toEqual([
        'file:///photos/a.png',
        'file:///photos/b.webp',
        'file:///photos/c.jpg',
      ]);
    });

    it('usa el nombre de fichero real derivado de la URI, no uno generado', async () => {
      await createIncident(fullInput, ['file:///photos/foto.png']);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart.name).toBe('foto.png');
    });

    it('conserva la URI completa (con query string) aunque el nombre derivado la ignore', async () => {
      const uriWithQuery = 'file:///photos/foto.png?timestamp=1700000000';

      await createIncident(fullInput, [uriWithQuery]);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart.uri).toBe(uriWithQuery);
      expect(imagePart.name).toBe('foto.png');
    });

    it('mantiene el orden de las URIs en las partes images', async () => {
      const orderedUris = ['file:///photos/z.webp', 'file:///photos/a.png', 'file:///photos/m.jpg'];

      await createIncident(fullInput, orderedUris);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imageParts.map((part) => part.uri)).toEqual(orderedUris);
    });

    it('en el camino backend no persiste imágenes por separado (createImage no se llama)', async () => {
      await createIncident(fullInput, ['file:///photos/a.jpg', 'file:///photos/b.png']);

      expect(mockedCreateImage).not.toHaveBeenCalled();
    });
  });

  describe('camino backend: éxito y rechazo', () => {
    it('con backend OK devuelve { incident, source: "backend" } con la respuesta parseada', async () => {
      const result = await createIncident(fullInput);

      expect(result).toEqual({ incident: serverCreatedIncident, source: 'backend' });
    });

    it('con backend OK no contacta con el mock ni persiste imágenes', async () => {
      await createIncident(fullInput, ['file:///photos/a.jpg']);

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

      await createIncident(minimalInput);

      expect(jsonSpy).toHaveBeenCalledTimes(1);
    });

    it('con backend !ok (500) lanza el mensaje de registro fallido', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'boom' }, 500),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });

    it('con backend !ok (400) lanza el mensaje de registro fallido', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({}, 400),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
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

      await expect(createIncident(fullInput)).rejects.toThrow(
        `${MESSAGE_REGISTER_ERROR} (title must contain 4 to 35 characters)`,
      );
    });

    it('con backend !ok NO usa el mock: no hay segunda petición ni persistencia de imágenes', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse({ message: 'boom' }, 500),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
      });

      await expect(createIncident(fullInput, ['file:///photos/a.jpg'])).rejects.toThrow(
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

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
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

        const result = await createIncident(minimalInput);

        expect(result.source).toBe('mock');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      });

      it('con error de red del backend (TypeError) cae al mock y devuelve source "mock"', async () => {
        routeFetchByEndpoint({
          backend: new TypeError('Network request failed'),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident(minimalInput);

        expect(result.source).toBe('mock');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      });

      it('primero intenta el backend (multipart) y después el mock (JSON)', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput);

        expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents`);
        expect(readSentInit(0).body).toBeInstanceOf(RecordingFormData);
        expect(readRequestUrlAt(1)).toBe(MOCK_INCIDENTS_ENDPOINT);
      });
    });

    describe('petición JSON al mock', () => {
      it('hace POST a `${API_BASE_URL}/incidents` con Content-Type application/json', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput);

        expect(readRequestUrlAt(1)).toBe(`${API_BASE_URL}/incidents`);
        expect(readSentInit(1).method).toBe('POST');
        expect(readSentInit(1).headers).toEqual({ 'Content-Type': 'application/json' });
      });

      it('envía el payload JSON con title/description con trim, civicId y ubicación del input', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput);

        expect(readSentJsonBody(1)).toEqual({
          title: 'Bache en la avenida principal',
          description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
          latitude: 40.4168,
          longitude: -3.7038,
          accuracy: 10,
          civicId: TEMPORARY_CIVIC_ID,
          categoryId: '2',
          category: 'Vallado',
        });
      });

      it('con input mínimo envía null en description, category, categoryId y coordenadas', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(minimalInput);

        expect(readSentJsonBody(1)).toEqual({
          title: 'Farola fundida',
          description: '',
          latitude: null,
          longitude: null,
          accuracy: null,
          civicId: TEMPORARY_CIVIC_ID,
          categoryId: null,
          category: null,
        });
      });

      it('el payload del mock no es multipart: el body es una cadena JSON', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput);

        expect(typeof readSentInit(1).body).toBe('string');
      });
    });

    describe('incidencia ensamblada', () => {
      it('description vacía o solo espacios se devuelve como null', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident({ ...fullInput, description: '   ' });

        expect(result.incident.description).toBeNull();
      });

      it('category vacía o solo espacios se devuelve como null', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident({ ...fullInput, category: '   ' });

        expect(result.incident.category).toBeNull();
      });

      it('con input completo ensambla la incidencia con id del mock, coords del input y status "reported"', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        const result = await createIncident(fullInput);

        const expectedIncident: CreatedIncident = {
          id: MOCK_CREATED_INCIDENT_ID,
          title: 'Bache en la avenida principal',
          description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
          civicId: TEMPORARY_CIVIC_ID,
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

        const { incident } = await createIncident(minimalInput);

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
        });

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

        const { incident } = await createIncident(minimalInput);

        expect(mockedCreateImage).not.toHaveBeenCalled();
        expect(incident.images).toEqual([]);
      });

      it('llama a createImage una vez por cada uri con la url y el id de la incidencia del mock', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });

        await createIncident(fullInput, ['file:///photos/a.jpg', 'file:///photos/b.png']);

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

        const { incident } = await createIncident(fullInput, [
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

      it('recorta a las 5 primeras imágenes: con 6 uris solo llama a createImage 5 veces', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }),
        });
        const sixImageUris = [
          'file:///photos/1.jpg',
          'file:///photos/2.jpg',
          'file:///photos/3.jpg',
          'file:///photos/4.jpg',
          'file:///photos/5.jpg',
          'file:///photos/6.jpg',
        ];

        const { incident } = await createIncident(fullInput, sixImageUris);

        expect(mockedCreateImage).toHaveBeenCalledTimes(MAX_INCIDENT_IMAGES);
        expect(mockedCreateImage.mock.calls.map(([input]) => input.url)).toEqual(
          sixImageUris.slice(0, 5),
        );
        expect(incident.images).toHaveLength(5);
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

        const result = await createIncident(fullInput, [
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

        const result = await createIncident(fullInput, ['file:///photos/a.jpg']);

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

        await expect(createIncident(fullInput, ['file:///photos/a.jpg'])).rejects.toThrow(
          MESSAGE_TIMEOUT_ERROR,
        );
        expect(mockedCreateImage).not.toHaveBeenCalled();
      });

      it('con error de red del mock lanza el mensaje de conexión', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: new TypeError('Network request failed'),
        });

        await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_CONNECTION_ERROR);
      });

      it('con backend caído y mock !ok (500) lanza el mensaje de registro fallido', async () => {
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: jsonResponse({ message: 'boom' }, 500),
        });

        await expect(createIncident(fullInput, ['file:///photos/a.jpg'])).rejects.toThrow(
          MESSAGE_REGISTER_ERROR,
        );
        expect(mockedCreateImage).not.toHaveBeenCalled();
      });

      it('con backend caído y mock !ok (400) lanza el mensaje de registro fallido', async () => {
        routeFetchByEndpoint({
          backend: new TypeError('Network request failed'),
          mock: jsonResponse({}, 400),
        });

        await expect(createIncident(minimalInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
      });

      it('con backend caído y mock !ok no intenta parsear el cuerpo del mock', async () => {
        const mockJsonSpy = jest.fn();
        routeFetchByEndpoint({
          backend: new RequestTimeoutError(),
          mock: { ok: false, status: 500, json: mockJsonSpy } as unknown as Response,
        });

        await expect(createIncident(minimalInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
        expect(mockJsonSpy).not.toHaveBeenCalled();
      });
    });
  });
});
