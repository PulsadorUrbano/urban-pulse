/// <reference types="jest" />
import { File } from 'expo-file-system';

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
  QUERY_MISSING_TOKEN_MESSAGE,
  fetchMyIncidents,
  fetchMyMapIncidents,
  uploadIncidentImages,
} from '@/services/incident.service';
import {
  DEFAULT_INCIDENT_STATUS,
  type CreateIncidentInput,
  type CreatedIncident,
  type CreatedIncidentImage,
  type IncidentAuthor,
  type IncidentDetail,
  type IncidentSummary,
} from '@/types/incident';
import type { IncidentImage } from '@/types/incident-image';
import type { AuthToken } from '@/types/token';

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

// Tokens de sesión: el del backend es un JWT; el del mock no sirve contra el backend.
const BACKEND_TOKEN: AuthToken = { accessToken: 'jwt-backend-de-prueba', source: 'backend' };
const MOCK_TOKEN: AuthToken = { accessToken: 'token-mock-de-prueba', source: 'mock' };
const BACKEND_AUTHOR: IncidentAuthor = { civicId: TEST_CIVIC_ID, token: BACKEND_TOKEN };
const MOCK_AUTHOR: IncidentAuthor = { civicId: TEST_CIVIC_ID, token: MOCK_TOKEN };

// Categoría activa del catálogo del backend (UUID).
const CATALOG_CATEGORY_ID = 'b7c1e1c2-0b6a-4b2f-9b1a-1f2d3e4c5a6b';

// Instante fijo para verificar los `createdAt` que el servicio genera en el mock.
const FIXED_NOW_ISO = '2026-10-19T12:00:00.000Z';

// Id que json-server asigna a la incidencia creada en el mock.
const MOCK_CREATED_INCIDENT_ID = '99';

const MESSAGE_TIMEOUT_ERROR =
  'El servidor tardó demasiado en responder. Comprueba que el backend esté activo y sea accesible desde tu dispositivo.';
const MESSAGE_CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const MESSAGE_REGISTER_ERROR = 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.';
const MESSAGE_SESSION_EXPIRED =
  'Tu sesión ha caducado. Vuelve a iniciar sesión para registrar la incidencia.';
const MESSAGE_MISSING_TOKEN =
  'No se pudo verificar tu sesión. Vuelve a iniciar sesión para registrar la incidencia.';
const MESSAGE_IMAGES_UPLOAD_ERROR = 'La incidencia se registró, pero no se pudieron subir las fotos.';

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
  categoryId: CATALOG_CATEGORY_ID,
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

// Input mínimo: sin descripción y sin precisión (categoría y coordenadas son obligatorias).
const minimalInput: CreateIncidentInput = {
  title: 'Farola fundida',
  description: '',
  categoryId: CATALOG_CATEGORY_ID,
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: null,
};

// Respuesta del backend real (POST /incidents) con el shape de CreatedIncident.
const serverCreatedIncident: CreatedIncident = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  civicId: TEST_CIVIC_ID,
  categoryId: CATALOG_CATEGORY_ID,
  category: 'Transporte',
  urbanAssetId: null,
  location: {
    latitude: 40.4168,
    longitude: -3.7038,
    accuracy: 10,
    createdAt: FIXED_NOW_ISO,
  },
  // El backend crea la incidencia sin fotos; se añaden después por separado.
  images: [],
  status: 'reported',
  priority: 'low',
  createdAt: FIXED_NOW_ISO,
};

// Endpoint de subida de fotos de la incidencia creada por el backend.
const BACKEND_IMAGES_ENDPOINT = `${BACKEND_API_URL}/incidents/${serverCreatedIncident.id}/images`;

// Foto tal como la devuelve POST /incidents/:id/images.
const uploadedBackendImage: CreatedIncidentImage = {
  id: 'img-1',
  url: 'https://s3.example/incidents/42/img-1.jpg',
  mimeType: 'image/jpeg',
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
  // Subida de fotos al backend; por defecto responde 201 con lista vacía.
  backendImages?: EndpointOutcome;
}

// Enruta cada llamada de fetchWithTimeout según la URL: creación en backend,
// subida de fotos al backend o mock. Así el mismo test puede simular un
// backend caído y un mock sano (o al revés).
function routeFetchByEndpoint(outcomes: EndpointOutcomes): void {
  fetchWithTimeoutMock.mockImplementation(async (requestUrl: string) => {
    let outcome: EndpointOutcome;
    if (requestUrl === INCIDENTS_ENDPOINT) {
      outcome = outcomes.backend;
    } else if (requestUrl.startsWith(`${INCIDENTS_ENDPOINT}/`) && requestUrl.endsWith('/images')) {
      outcome = outcomes.backendImages ?? jsonResponse([], 201);
    } else {
      outcome = outcomes.mock;
    }
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

  describe('camino backend: petición JSON autenticada', () => {
    it('hace POST a `${BACKEND_API_URL}/incidents`', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR);

      expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents`);
      expect(readSentInit(0).method).toBe('POST');
    });

    it('envía Content-Type application/json y Authorization Bearer con el JWT de la sesión', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR);

      expect(readSentInit(0).headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BACKEND_TOKEN.accessToken}`,
      });
    });

    it('el body es una cadena JSON, no un FormData', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR);

      expect(typeof readSentInit(0).body).toBe('string');
    });

    it('con input completo envía exactamente title/description con trim, categoryId y coordenadas', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR);

      expect(readSentJsonBody(0)).toEqual({
        title: 'Bache en la avenida principal',
        description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
        categoryId: CATALOG_CATEGORY_ID,
        latitude: 40.4168,
        longitude: -3.7038,
        accuracy: 10,
      });
    });

    it('no envía civicId (sale del JWT), ni category de texto libre, ni imágenes, ni campos de gestión', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg']);

      const sentBody = readSentJsonBody(0);
      ['civicId', 'category', 'images', 'status', 'priority', 'createdAt'].forEach((field) => {
        expect(sentBody).not.toHaveProperty(field);
      });
    });

    it('con input mínimo omite description y accuracy', async () => {
      await createIncident(minimalInput, BACKEND_AUTHOR);

      expect(readSentJsonBody(0)).toEqual({
        title: 'Farola fundida',
        categoryId: CATALOG_CATEGORY_ID,
        latitude: 40.4168,
        longitude: -3.7038,
      });
    });

    it('omite description cuando solo tiene espacios en blanco', async () => {
      await createIncident({ ...fullInput, description: '   ' }, BACKEND_AUTHOR);

      expect(readSentJsonBody(0)).not.toHaveProperty('description');
    });

    it('envía latitude, longitude y accuracy 0 como números (el cero no es un valor ausente)', async () => {
      await createIncident({ ...fullInput, latitude: 0, longitude: 0, accuracy: 0 }, BACKEND_AUTHOR);

      expect(readSentJsonBody(0)).toMatchObject({ latitude: 0, longitude: 0, accuracy: 0 });
    });
  });

  describe('camino backend: éxito y rechazo', () => {
    it('sin fotos devuelve la incidencia con source "backend" y sin fotos pendientes, en una sola petición', async () => {
      const result = await createIncident(fullInput, BACKEND_AUTHOR);

      expect(result).toEqual({
        incident: serverCreatedIncident,
        source: 'backend',
        pendingImageUris: [],
        imagesUploadErrorMessage: null,
      });
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('con 401 lanza el mensaje de sesión caducada y no usa el mock', async () => {
      routeFetchByEndpoint({
        backend: rawBodyResponse(401, JSON.stringify({ message: 'Unauthorized' })),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      await expect(createIncident(fullInput, BACKEND_AUTHOR)).rejects.toThrow(MESSAGE_SESSION_EXPIRED);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('con 400 por categoría fuera del catálogo incluye el motivo del backend y no usa el mock', async () => {
      routeFetchByEndpoint({
        backend: rawBodyResponse(400, JSON.stringify({ message: 'La categoría no pertenece al catálogo activo' })),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      await expect(createIncident(fullInput, BACKEND_AUTHOR)).rejects.toThrow(
        `${MESSAGE_REGISTER_ERROR} (La categoría no pertenece al catálogo activo)`,
      );
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('si la creación es rechazada no intenta subir las fotos', async () => {
      routeFetchByEndpoint({
        backend: rawBodyResponse(500, 'boom'),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      await expect(createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg'])).rejects.toThrow(
        MESSAGE_REGISTER_ERROR,
      );
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('token de la sesión', () => {
    it('sin token lanza el mensaje de sesión no verificable sin hacer ninguna petición', async () => {
      await expect(createIncident(fullInput, { civicId: TEST_CIVIC_ID, token: null })).rejects.toThrow(
        MESSAGE_MISSING_TOKEN,
      );
      expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
    });

    it('con token del mock registra directamente en el mock (sin tocar el backend) y devuelve source "mock"', async () => {
      const result = await createIncident(fullInput, MOCK_AUTHOR);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(MOCK_INCIDENTS_ENDPOINT);
      expect(result.source).toBe('mock');
    });
  });

  describe('camino backend: subida de fotos por separado', () => {
    it('tras crear la incidencia sube las fotos a POST /incidents/:id/images con Bearer y sin Content-Type', async () => {
      await createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg']);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(readRequestUrlAt(1)).toBe(BACKEND_IMAGES_ENDPOINT);
      expect(readSentInit(1).method).toBe('POST');
      expect(readSentInit(1).headers).toEqual({ Authorization: `Bearer ${BACKEND_TOKEN.accessToken}` });
    });

    it('envía cada foto como parte `images` (File con la URI original) y en el mismo orden', async () => {
      const orderedUris = ['file:///photos/z.webp', 'file:///photos/a.png', 'file:///photos/m.jpg'];

      await createIncident(fullInput, BACKEND_AUTHOR, orderedUris);

      const formData = readSentFormData(1);
      const imageParts = formData.getAll('images') as ImageFilePart[];
      expect(formData.fieldNames().every((name) => name === 'images')).toBe(true);
      expect(imageParts.every((part) => part instanceof File)).toBe(true);
      expect(imageParts.map((part) => part.uri)).toEqual(orderedUris);
    });

    it('con 9 URIs sube solo las 8 primeras', async () => {
      const nineImageUris = Array.from({ length: 9 }, (_, index) => `file:///photos/${index}.jpg`);

      await createIncident(fullInput, BACKEND_AUTHOR, nineImageUris);

      expect(MAX_INCIDENT_IMAGES).toBe(8);
      expect(readSentFormData(1).getAll('images')).toHaveLength(8);
    });

    it('añade a la incidencia las fotos devueltas por el backend', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse(serverCreatedIncident, 201),
        backendImages: jsonResponse([uploadedBackendImage], 201),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const result = await createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg']);

      expect(result.incident.images).toEqual([uploadedBackendImage]);
      expect(result.pendingImageUris).toEqual([]);
      expect(result.imagesUploadErrorMessage).toBeNull();
    });

    it('si la subida falla por red devuelve la incidencia creada con las fotos pendientes, sin duplicarla ni usar el mock', async () => {
      const imageUris = ['file:///photos/a.jpg', 'file:///photos/b.png'];
      routeFetchByEndpoint({
        backend: jsonResponse(serverCreatedIncident, 201),
        backendImages: new TypeError('Network request failed'),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const result = await createIncident(fullInput, BACKEND_AUTHOR, imageUris);

      expect(result.source).toBe('backend');
      expect(result.incident.id).toBe(serverCreatedIncident.id);
      expect(result.pendingImageUris).toEqual(imageUris);
      expect(result.imagesUploadErrorMessage).toBe(MESSAGE_IMAGES_UPLOAD_ERROR);
      const incidentCreations = fetchWithTimeoutMock.mock.calls.filter(([url]) => url === INCIDENTS_ENDPOINT);
      expect(incidentCreations).toHaveLength(1);
      expect(fetchWithTimeoutMock.mock.calls.some(([url]) => url === MOCK_INCIDENTS_ENDPOINT)).toBe(false);
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('si el backend rechaza la subida (409) incluye el motivo en el mensaje de fotos', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse(serverCreatedIncident, 201),
        backendImages: rawBodyResponse(409, JSON.stringify({ message: 'La incidencia ya tiene el máximo de fotos.' })),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const result = await createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg']);

      expect(result.imagesUploadErrorMessage).toBe(
        `${MESSAGE_IMAGES_UPLOAD_ERROR} (La incidencia ya tiene el máximo de fotos.)`,
      );
      expect(result.pendingImageUris).toEqual(['file:///photos/a.jpg']);
    });

    it('si la respuesta de la subida no se puede leer, la da por subida sin fotos pendientes', async () => {
      routeFetchByEndpoint({
        backend: jsonResponse(serverCreatedIncident, 201),
        backendImages: {
          ok: true,
          status: 201,
          json: async () => {
            throw new SyntaxError('Unexpected end of JSON input');
          },
        } as unknown as Response,
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const result = await createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg']);

      expect(result.pendingImageUris).toEqual([]);
      expect(result.imagesUploadErrorMessage).toBeNull();
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(FIXED_NOW_ISO), doNotFake: ['nextTick', 'setImmediate'] });
    });

    it.each([
      ['RequestTimeoutError', new RequestTimeoutError()],
      ['error de red (TypeError)', new TypeError('Network request failed')],
    ])('con %s del backend cae al mock y devuelve source "mock"', async (_label, backendError) => {
      routeFetchByEndpoint({
        backend: backendError,
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const result = await createIncident(fullInput, BACKEND_AUTHOR);

      expect(result.source).toBe('mock');
      expect(readRequestUrlAt(0)).toBe(INCIDENTS_ENDPOINT);
      expect(readRequestUrlAt(1)).toBe(MOCK_INCIDENTS_ENDPOINT);
    });

    it('envía al mock JSON con civicId, categoryId, coordenadas, category null y status "reported"', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      await createIncident(fullInput, BACKEND_AUTHOR);

      expect(readSentInit(1).headers).toEqual({ 'Content-Type': 'application/json' });
      expect(readSentJsonBody(1)).toEqual({
        title: 'Bache en la avenida principal',
        description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
        latitude: 40.4168,
        longitude: -3.7038,
        accuracy: 10,
        civicId: TEST_CIVIC_ID,
        categoryId: CATALOG_CATEGORY_ID,
        category: null,
        status: DEFAULT_INCIDENT_STATUS,
        createdAt: FIXED_NOW_ISO,
      });
    });

    it('ensambla la incidencia con el id del mock, las coordenadas del input y description vacía como null', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
      });

      const { incident } = await createIncident(minimalInput, BACKEND_AUTHOR);

      expect(incident).toEqual({
        id: MOCK_CREATED_INCIDENT_ID,
        title: 'Farola fundida',
        description: null,
        civicId: TEST_CIVIC_ID,
        categoryId: CATALOG_CATEGORY_ID,
        category: null,
        urbanAssetId: null,
        location: { latitude: 40.4168, longitude: -3.7038, accuracy: null, createdAt: FIXED_NOW_ISO },
        images: [],
        status: 'reported',
        priority: 'low',
        createdAt: FIXED_NOW_ISO,
      });
    });

    it('con timeout del mock lanza el mensaje de timeout y no persiste imágenes', async () => {
      routeFetchByEndpoint({ backend: new RequestTimeoutError(), mock: new RequestTimeoutError() });

      await expect(createIncident(fullInput, BACKEND_AUTHOR, ['file:///photos/a.jpg'])).rejects.toThrow(
        MESSAGE_TIMEOUT_ERROR,
      );
      expect(mockedCreateImage).not.toHaveBeenCalled();
    });

    it('con error de red del mock lanza el mensaje de conexión', async () => {
      routeFetchByEndpoint({
        backend: new RequestTimeoutError(),
        mock: new TypeError('Network request failed'),
      });

      await expect(createIncident(fullInput, BACKEND_AUTHOR)).rejects.toThrow(MESSAGE_CONNECTION_ERROR);
    });

    it('con mock !ok lanza el mensaje de registro fallido', async () => {
      routeFetchByEndpoint({ backend: new RequestTimeoutError(), mock: jsonResponse({}, 500) });

      await expect(createIncident(fullInput, BACKEND_AUTHOR)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });
  });

  describe('persistencia de imágenes en el mock', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(FIXED_NOW_ISO), doNotFake: ['nextTick', 'setImmediate'] });
    });

    it('llama a createImage una vez por foto con la url y el id de la incidencia del mock', async () => {
      await createIncident(fullInput, MOCK_AUTHOR, ['file:///photos/a.jpg', 'file:///photos/b.png']);

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

    it('ensambla images con id, url, mimeType inferido y createdAt', async () => {
      const { incident, pendingImageUris, imagesUploadErrorMessage } = await createIncident(
        fullInput,
        MOCK_AUTHOR,
        ['file:///photos/a.jpg', 'file:///photos/b.png'],
      );

      expect(incident.images).toEqual([
        { id: 'img-a.jpg', url: 'file:///photos/a.jpg', mimeType: 'image/jpeg', createdAt: FIXED_NOW_ISO },
        { id: 'img-b.png', url: 'file:///photos/b.png', mimeType: 'image/png', createdAt: FIXED_NOW_ISO },
      ]);
      expect(pendingImageUris).toEqual([]);
      expect(imagesUploadErrorMessage).toBeNull();
    });

    it('recorta a las 8 primeras fotos', async () => {
      const nineImageUris = Array.from({ length: 9 }, (_, index) => `file:///photos/${index}.jpg`);

      await createIncident(fullInput, MOCK_AUTHOR, nineImageUris);

      expect(mockedCreateImage).toHaveBeenCalledTimes(8);
    });

    it('si una foto falla, la incidencia se crea igualmente y esa foto queda pendiente con el mensaje', async () => {
      mockedCreateImage.mockImplementation((input) =>
        input.url.endsWith('b.png')
          ? Promise.reject(new Error('fallo'))
          : fakeCreateImageImplementation(input),
      );

      const result = await createIncident(fullInput, MOCK_AUTHOR, ['file:///photos/a.jpg', 'file:///photos/b.png']);

      expect(result.incident.id).toBe(MOCK_CREATED_INCIDENT_ID);
      expect(result.incident.images.map((image) => image.url)).toEqual(['file:///photos/a.jpg']);
      expect(result.pendingImageUris).toEqual(['file:///photos/b.png']);
      expect(result.imagesUploadErrorMessage).toBe(MESSAGE_IMAGES_UPLOAD_ERROR);
    });
  });
});

describe('uploadIncidentImages (reintento de la subida de fotos)', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedCreateImage.mockReset();
    mockedCreateImage.mockImplementation(fakeCreateImageImplementation);
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
    routeFetchByEndpoint({
      backend: jsonResponse(serverCreatedIncident, 201),
      backendImages: jsonResponse([uploadedBackendImage], 201),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
  });

  it('sin fotos no hace ninguna petición ni devuelve error', async () => {
    const result = await uploadIncidentImages('42', [], 'backend', BACKEND_TOKEN);

    expect(result).toEqual({ images: [], pendingImageUris: [], errorMessage: null });
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('con origen backend sube solo a /incidents/:id/images, nunca a POST /incidents', async () => {
    const result = await uploadIncidentImages('42', ['file:///photos/a.jpg'], 'backend', BACKEND_TOKEN);

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readRequestUrlAt(0)).toBe(BACKEND_IMAGES_ENDPOINT);
    expect(result.images).toEqual([uploadedBackendImage]);
    expect(result.pendingImageUris).toEqual([]);
  });

  it.each([
    ['sin token', null],
    ['con token del mock', MOCK_TOKEN],
  ])('con origen backend y %s no hace peticiones y deja todo pendiente', async (_label, token) => {
    const result = await uploadIncidentImages('42', ['file:///photos/a.jpg'], 'backend', token);

    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
    expect(result.pendingImageUris).toEqual(['file:///photos/a.jpg']);
    expect(result.errorMessage).toBe(MESSAGE_MISSING_TOKEN);
  });

  it('con origen mock persiste las fotos en el mock con createImage', async () => {
    const result = await uploadIncidentImages(MOCK_CREATED_INCIDENT_ID, ['file:///photos/a.jpg'], 'mock', MOCK_TOKEN);

    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
    expect(mockedCreateImage).toHaveBeenCalledWith({ url: 'file:///photos/a.jpg', incidentId: MOCK_CREATED_INCIDENT_ID });
    expect(result.pendingImageUris).toEqual([]);
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
      await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_LIST_URL);
      expect(readSentInit(0).method).toBe('GET');
    });

    it('mapea la respuesta del backend 1:1 como IncidentSummary[] sin reordenarla', async () => {
      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result).toEqual({ incidents: backendIncidentSummaries, source: 'backend' });
    });

    it('con lista vacía del backend devuelve incidents vacío con source "backend"', async () => {
      routeMyIncidentsRequests(jsonResponse([], 200));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result).toEqual({ incidents: [], source: 'backend' });
    });

    it('con backend OK no consulta el mock', async () => {
      await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).not.toBe(MOCK_LIST_URL);
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    it('con RequestTimeoutError cae al mock, ordena desc por createdAt y devuelve source "mock"', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError());

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result).toEqual({ incidents: expectedOrderedSummaries, source: 'mock' });
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(readRequestUrlAt(1)).toBe(MOCK_LIST_URL);
    });

    it('con error de red (TypeError) cae al mock y devuelve source "mock" con el mismo orden', async () => {
      routeMyIncidentsRequests(new TypeError('Network request failed'));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incidents.map((incident) => incident.id)).toEqual(['1', '2', '3']);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    });

    it('desempata por id ascendente cuando dos incidencias tienen el mismo createdAt', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError());

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      const tiedIncidentIds = result.incidents
        .filter((incident) => incident.createdAt === LIST_OLDER_CREATED_AT)
        .map((incident) => incident.id);
      expect(tiedIncidentIds).toEqual(['2', '3']);
    });

    it('con mock sin incidencias devuelve incidents vacío con source "mock"', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), jsonResponse([], 200));

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

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

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

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

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

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

        await expect(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN)).rejects.toThrow(MESSAGE_MY_INCIDENTS_ERROR);

        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
        expect(readRequestUrlAt(0)).toBe(BACKEND_LIST_URL);
      },
    );

    it('con mock !ok tras caída del backend lanza error genérico', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), jsonResponse({}, 500));

      await expect(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN)).rejects.toThrow(MESSAGE_MY_INCIDENTS_ERROR);
    });

    it('con mock sin conexión tras caída del backend lanza el mensaje de conexión', async () => {
      routeMyIncidentsRequests(new RequestTimeoutError(), new TypeError('Network request failed'));

      await expect(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN)).rejects.toThrow(
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

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(`${MESSAGE_MY_INCIDENTS_ERROR} (civicId must be a UUID)`);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('con backend !ok y message como array une los motivos con "; " entre paréntesis', async () => {
    routeMyIncidentsRequests(
      rawBodyResponse(400, JSON.stringify({ message: ['status must be a string', 'civicId is required'] })),
    );

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(
      `${MESSAGE_MY_INCIDENTS_ERROR} (status must be a string; civicId is required)`,
    );
  });

  it('con backend !ok y cuerpo no JSON lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(rawBodyResponse(500, 'Internal Server Error'));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y JSON sin message lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(rawBodyResponse(500, JSON.stringify({ error: 'Internal', statusCode: 500 })));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y message vacío lanza solo el mensaje genérico, sin paréntesis vacíos', async () => {
    routeMyIncidentsRequests(rawBodyResponse(400, JSON.stringify({ message: '' })));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
  });

  it('con backend !ok y cuerpo ilegible lanza solo el mensaje genérico', async () => {
    routeMyIncidentsRequests(unreadableBodyResponse(500));

    const error = await captureRejection(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

    expect(error.message).toBe(MESSAGE_MY_INCIDENTS_ERROR);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });
});

describe('motivo del rechazo del backend en createIncident', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
  });

  it('con backend !ok y message como array une los motivos con "; " entre paréntesis', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(
        400,
        JSON.stringify({ message: ['title is required', 'description is too long'] }),
      ),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, BACKEND_AUTHOR));

    expect(error.message).toBe(`${MESSAGE_REGISTER_ERROR} (title is required; description is too long)`);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('con backend !ok y cuerpo no JSON lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(502, '<html>Bad Gateway</html>'),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, BACKEND_AUTHOR));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
  });

  it('con backend !ok y JSON sin message lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: rawBodyResponse(400, JSON.stringify({ statusCode: 400 })),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, BACKEND_AUTHOR));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
  });

  it('con backend !ok y cuerpo ilegible lanza solo el mensaje genérico de registro', async () => {
    routeFetchByEndpoint({
      backend: unreadableBodyResponse(500),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    const error = await captureRejection(createIncident(fullInput, BACKEND_AUTHOR));

    expect(error.message).toBe(MESSAGE_REGISTER_ERROR);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });
});

describe('mensajes genéricos independientes entre createIncident y fetchMyIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
  });

  it('con el mismo cuerpo de error ambos mensajes genéricos siguen siendo distintos', async () => {
    fetchWithTimeoutMock.mockImplementation(async () => rawBodyResponse(500, JSON.stringify({ message: 'boom' })));

    const registerError = await captureRejection(createIncident(fullInput, BACKEND_AUTHOR));
    const listError = await captureRejection(fetchMyIncidents(TEST_CIVIC_ID, BACKEND_TOKEN));

    expect(MESSAGE_REGISTER_ERROR).not.toBe(MESSAGE_MY_INCIDENTS_ERROR);
    expect(registerError.message).toBe(`${MESSAGE_REGISTER_ERROR} (boom)`);
    expect(listError.message).toBe(`${MESSAGE_MY_INCIDENTS_ERROR} (boom)`);
    expect(registerError.message).not.toBe(listError.message);
  });
});

describe('aislamiento del civicId entre llamadas sucesivas', () => {
  const FIRST_CIVIC_ID = '11111111-1111-4111-8111-111111111111';
  const SECOND_CIVIC_ID = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
  });

  it('dos sesiones distintas en createIncident por backend llevan cada una su propio JWT y ningún civicId', async () => {
    routeFetchByEndpoint({
      backend: jsonResponse(serverCreatedIncident, 201),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });
    const secondToken: AuthToken = { accessToken: 'jwt-segunda-sesion', source: 'backend' };

    await createIncident(fullInput, { civicId: FIRST_CIVIC_ID, token: BACKEND_TOKEN });
    await createIncident(fullInput, { civicId: SECOND_CIVIC_ID, token: secondToken });

    expect(readSentInit(0).headers).toMatchObject({ Authorization: `Bearer ${BACKEND_TOKEN.accessToken}` });
    expect(readSentInit(1).headers).toMatchObject({ Authorization: `Bearer ${secondToken.accessToken}` });
    expect(readSentJsonBody(0)).not.toHaveProperty('civicId');
    expect(readSentJsonBody(1)).not.toHaveProperty('civicId');
  });

  it('dos civicId distintos en createIncident con fallback al mock no se mezclan en el payload', async () => {
    routeFetchByEndpoint({
      backend: new RequestTimeoutError(),
      mock: jsonResponse({ id: MOCK_CREATED_INCIDENT_ID }, 201),
    });

    await createIncident(minimalInput, { civicId: FIRST_CIVIC_ID, token: BACKEND_TOKEN });
    await createIncident(minimalInput, { civicId: SECOND_CIVIC_ID, token: BACKEND_TOKEN });

    // Orden de llamadas: backend, mock, backend, mock.
    expect(readSentJsonBody(1).civicId).toBe(FIRST_CIVIC_ID);
    expect(readSentJsonBody(3).civicId).toBe(SECOND_CIVIC_ID);
  });

  it('dos civicId distintos en fetchMyIncidents consultan cada uno su propio listado', async () => {
    fetchWithTimeoutMock.mockImplementation(async () => jsonResponse([], 200));

    await fetchMyIncidents(FIRST_CIVIC_ID, BACKEND_TOKEN);
    await fetchMyIncidents(SECOND_CIVIC_ID, BACKEND_TOKEN);

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
    it('pide el detalle a `${BACKEND_API_URL}/incidents/:id` y devuelve source "backend"', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_DETAIL_URL);
      expect(readSentInit(0).method).toBe('GET');
      expect(result).toEqual({ incident: backendIncidentDetail, source: 'backend' });
    });

    it('con backend OK no consulta imágenes, categorías ni el mock', async () => {
      await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(mockedFetchCategories).not.toHaveBeenCalled();
    });
  });

  describe('404 del backend', () => {
    it('404 real lanza IncidentNotFoundError y no hace segunda petición al mock', async () => {
      routeIncidentDetailRequests({ backend: jsonResponse({ message: 'Not Found' }, 404) });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN)).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(readRequestUrlAt(0)).toBe(BACKEND_DETAIL_URL);
    });
  });

  describe('fallback al mock sin conexión con el backend', () => {
    it('con RequestTimeoutError cae al mock y devuelve source "mock"', async () => {
      routeIncidentDetailRequests({ backend: new RequestTimeoutError() });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incident.id).toBe(DETAIL_INCIDENT_ID);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(3);
      expect(readRequestUrlAt(1)).toBe(MOCK_DETAIL_URL);
    });

    it('con error de red (TypeError) cae al mock y devuelve source "mock"', async () => {
      routeIncidentDetailRequests({ backend: new TypeError('Network request failed') });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incident.title).toBe('Farola fundida');
    });

    it('404 del mock lanza IncidentNotFoundError', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ message: 'Not Found' }, 404),
      });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN)).rejects.toBeInstanceOf(
        IncidentNotFoundError,
      );
    });

    it('mock !ok distinto de 404 lanza error genérico, no IncidentNotFoundError', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({}, 500),
      });

      const error = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(IncidentNotFoundError);
      expect((error as Error).message).toBe(MESSAGE_INCIDENT_DETAIL_ERROR);
    });

    it('mock sin conexión lanza el mensaje de conexión', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: new TypeError('Network request failed'),
      });

      await expect(fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN)).rejects.toThrow(
        'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    });
  });

  describe('backend !ok distinto de 404', () => {
    it.each([400, 500])(
      'con backend !ok (%i) lanza error genérico, no IncidentNotFoundError, y no consulta el mock',
      async (status) => {
        routeIncidentDetailRequests({ backend: jsonResponse({ message: 'boom' }, status) });

        const error = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN).catch((caught: unknown) => caught);

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
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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
      await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      const requestedUrls = fetchWithTimeoutMock.mock.calls.map(([requestUrl]) => requestUrl);
      expect(requestedUrls).toContain(DETAIL_IMAGES_URL);
    });

    it('mapea imágenes con mimeType según la extensión y createdAt igual al de la incidencia', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.incident.category).toBe('Vallado');
      expect(mockedFetchCategories).not.toHaveBeenCalled();
    });

    it('con solo categoryId llama a fetchCategories y resuelve el nombre por id', async () => {
      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(mockedFetchCategories).toHaveBeenCalledTimes(1);
      expect(result.incident.category).toBe('Alumbrado público');
    });

    it('con category vacía y categoryId presente resuelve por catálogo', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, category: '' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(mockedFetchCategories).toHaveBeenCalledTimes(1);
      expect(result.incident.category).toBe('Alumbrado público');
    });

    it('con categoryId sin coincidencia en el catálogo devuelve category null', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, categoryId: '99' }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.incident.category).toBeNull();
    });

    it('si fetchCategories falla devuelve category null sin romper el detalle ni las imágenes', async () => {
      mockedFetchCategories.mockRejectedValue(new Error('No se pudieron cargar las categorías.'));

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.incident.category).toBeNull();
      expect(result.incident.title).toBe('Farola fundida');
      expect(result.incident.images).toEqual(expectedDetailImages);
    });

    it('sin categoryId ni category no llama a fetchCategories y devuelve null', async () => {
      routeIncidentDetailRequests({
        backend: new RequestTimeoutError(),
        mockDetail: jsonResponse({ ...mockDetailRecord, categoryId: null, category: null }, 200),
      });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

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

// ---------------------------------------------------------------------------
// Token de sesión en la consulta de incidencias (ST1 del bug 20-11-26).
// fetchMyIncidents y fetchIncidentById reciben `AuthToken | null`, igual que
// createIncident: backend con Bearer, mock directo con sesión mock, sin token
// no hay petición y el 401 es sesión caducada (nunca cae al mock).
// ---------------------------------------------------------------------------

const SESSION_ERROR_PATTERN = /sesión/i;

// Cabecera Authorization de una llamada concreta (undefined si no se envió).
function readSentAuthorizationHeader(callIndex = 0): unknown {
  const sentHeaders = readSentInit(callIndex).headers as Record<string, unknown> | undefined;
  return sentHeaders?.Authorization;
}

// Todas las URLs pedidas hasta ahora a fetchWithTimeout.
function readAllRequestedUrls(): string[] {
  return fetchWithTimeoutMock.mock.calls.map(([requestUrl]) => requestUrl);
}

describe('token de sesión en fetchMyIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    routeMyIncidentsRequests(jsonResponse(backendIncidentSummaries, 200));
  });

  it('con token del backend pide el listado con Authorization Bearer y el accessToken recibido', async () => {
    await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

    expect(readRequestUrlAt(0)).toBe(BACKEND_LIST_URL);
    expect(readSentInit(0).headers).toMatchObject({
      Authorization: `Bearer ${BACKEND_TOKEN.accessToken}`,
    });
  });

  it.each([
    ['timeout', () => new RequestTimeoutError()],
    ['error de red', () => new TypeError('Network request failed')],
  ])(
    'con backend caído (%s) el GET de respaldo al mock no lleva Authorization',
    async (_failureName, buildFailure) => {
      routeMyIncidentsRequests(buildFailure());

      const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(readRequestUrlAt(1)).toBe(MOCK_LIST_URL);
      expect(readSentAuthorizationHeader(1)).toBeUndefined();
    },
  );

  it('con sesión mock va directa al mock, no llama al backend y devuelve source "mock"', async () => {
    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, MOCK_TOKEN);

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readRequestUrlAt(0)).toBe(MOCK_LIST_URL);
    expect(readAllRequestedUrls()).not.toContain(BACKEND_LIST_URL);
    expect(result.source).toBe('mock');
    expect(result.incidents.map((incident) => incident.id)).toEqual(['1', '2', '3']);
  });

  it('sin token (null) no hace ninguna petición y rechaza con error de sesión', async () => {
    await expect(fetchMyIncidents(CITIZEN_CIVIC_ID, null)).rejects.toThrow(SESSION_ERROR_PATTERN);

    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('con 401 del backend lanza error de sesión caducada y no llama al mock', async () => {
    routeMyIncidentsRequests(jsonResponse({ message: 'Unauthorized', statusCode: 401 }, 401));

    await expect(fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN)).rejects.toThrow(
      SESSION_ERROR_PATTERN,
    );

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readAllRequestedUrls()).not.toContain(MOCK_LIST_URL);
  });
});

describe('token de sesión en fetchIncidentById', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedFetchCategories.mockReset();
    mockedFetchCategories.mockResolvedValue({
      categories: catalogCategories,
      source: 'backend',
      backendErrorMessage: null,
    });
    routeIncidentDetailRequests({ backend: jsonResponse(backendIncidentDetail, 200) });
  });

  it('con token del backend pide el detalle con Authorization Bearer y el accessToken recibido', async () => {
    await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

    expect(readRequestUrlAt(0)).toBe(BACKEND_DETAIL_URL);
    expect(readSentInit(0).headers).toMatchObject({
      Authorization: `Bearer ${BACKEND_TOKEN.accessToken}`,
    });
  });

  it.each([
    ['timeout', () => new RequestTimeoutError()],
    ['error de red', () => new TypeError('Network request failed')],
  ])(
    'con backend caído (%s) el GET de respaldo al mock no lleva Authorization',
    async (_failureName, buildFailure) => {
      routeIncidentDetailRequests({ backend: buildFailure() });

      const result = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(readRequestUrlAt(1)).toBe(MOCK_DETAIL_URL);
      expect(readSentAuthorizationHeader(1)).toBeUndefined();
    },
  );

  it('con sesión mock va directa al mock, no llama al backend y devuelve source "mock"', async () => {
    const result = await fetchIncidentById(DETAIL_INCIDENT_ID, MOCK_TOKEN);

    expect(readRequestUrlAt(0)).toBe(MOCK_DETAIL_URL);
    expect(readAllRequestedUrls()).not.toContain(BACKEND_DETAIL_URL);
    expect(result.source).toBe('mock');
  });

  it('sin token (null) no hace ninguna petición y rechaza con error de sesión', async () => {
    await expect(fetchIncidentById(DETAIL_INCIDENT_ID, null)).rejects.toThrow(SESSION_ERROR_PATTERN);

    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('con 401 del backend lanza error de sesión caducada, no IncidentNotFoundError, y no llama al mock', async () => {
    routeIncidentDetailRequests({ backend: jsonResponse({ message: 'Unauthorized', statusCode: 401 }, 401) });

    const error = await fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(IncidentNotFoundError);
    expect((error as Error).message).toMatch(SESSION_ERROR_PATTERN);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readAllRequestedUrls()).not.toContain(MOCK_DETAIL_URL);
  });

  it('con 404 del backend lanza IncidentNotFoundError y no llama al mock', async () => {
    routeIncidentDetailRequests({ backend: jsonResponse({ message: 'Not Found' }, 404) });

    await expect(fetchIncidentById(DETAIL_INCIDENT_ID, BACKEND_TOKEN)).rejects.toBeInstanceOf(
      IncidentNotFoundError,
    );

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readAllRequestedUrls()).not.toContain(MOCK_DETAIL_URL);
  });
});

// ---------------------------------------------------------------------------
// Paginación del listado (fetchAllPages) y mapa de incidencias propias
// (fetchMyMapIncidents). Reutiliza los helpers de arriba (jsonResponse,
// rawBodyResponse, routeFetchByUrl, buildMockIncidentRecord, captureRejection).
// ---------------------------------------------------------------------------

const MAP_QUERY_SESSION_EXPIRED_MESSAGE = 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
const MAP_BACKEND_DETAIL_PREFIX = `${BACKEND_API_URL}/incidents/`;
const MAP_MAX_IN_FLIGHT_DETAILS = 4;

// Respuesta de listado paginado: expone la cabecera X-Next-Cursor (null = última página).
function pagedJsonResponse(body: unknown, nextCursor: string | null): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: {
      get: (headerName: string) => (headerName === 'X-Next-Cursor' ? nextCursor : null),
    },
  } as unknown as Response;
}

// Primera página (cursor null) o página siguiente, con limit=100 como pide fetchAllPages.
function backendListPageUrl(cursor: string | null = null): string {
  const cursorParam = cursor == null ? '' : `&cursor=${cursor}`;
  return `${BACKEND_LIST_URL}&limit=100${cursorParam}`;
}

function backendDetailUrlFor(incidentId: string): string {
  return `${MAP_BACKEND_DETAIL_PREFIX}${incidentId}`;
}

function mockDetailUrlFor(incidentId: string): string {
  return `${MOCK_INCIDENTS_ENDPOINT}/${incidentId}`;
}

function mockImagesUrlFor(incidentId: string): string {
  return `${IMAGES_ENDPOINT}?incidentId=${incidentId}`;
}

function buildListSummary(incidentId: string, status: IncidentSummary['status']): IncidentSummary {
  return { id: incidentId, title: `Incidencia ${incidentId}`, status, createdAt: LIST_OLDER_CREATED_AT };
}

function buildBackendDetail(incidentId: string, overrides: Partial<IncidentDetail> = {}): IncidentDetail {
  return {
    id: incidentId,
    title: `Incidencia ${incidentId}`,
    description: null,
    civicId: CITIZEN_CIVIC_ID,
    categoryId: '2',
    category: 'Alumbrado público',
    urbanAssetId: null,
    location: { latitude: 40.4168, longitude: -3.7038, accuracy: null, createdAt: LIST_OLDER_CREATED_AT },
    images: [],
    status: 'reported',
    priority: 'low',
    createdAt: LIST_OLDER_CREATED_AT,
    ...overrides,
  };
}

function buildMockRecordForMap(
  incidentId: string,
  status: IncidentSummary['status'],
  latitude: number | null,
  longitude: number | null,
): Record<string, unknown> {
  return buildMockIncidentRecord({
    id: incidentId,
    title: `Incidencia ${incidentId}`,
    status,
    latitude,
    longitude,
    categoryId: '2',
    createdAt: LIST_OLDER_CREATED_AT,
  });
}

// Mapa url -> respuesta; una URL que no esté en la tabla devuelve un Error (fallo de red).
type OutcomesByUrl = Record<string, EndpointOutcome>;

function routeFetchByUrlTable(outcomesByUrl: OutcomesByUrl): void {
  routeFetchByUrl((requestUrl) => outcomesByUrl[requestUrl] ?? new Error(`URL no prevista: ${requestUrl}`));
}

// Respuesta que se resuelve desde fuera, para controlar el orden de finalización de los detalles.
interface ControlledResponse {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
}

function createControlledResponse(): ControlledResponse {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushPendingRequests(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('fetchMyIncidents con fetchAllPages (paginación del backend)', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('recorre varias páginas con limit=100 y concatena en orden hasta una cabecera X-Next-Cursor ausente', async () => {
    const firstPage = [buildListSummary('p1-a', 'reported'), buildListSummary('p1-b', 'validated')];
    const secondPage = [buildListSummary('p2-a', 'in_progress')];
    routeFetchByUrlTable({
      [backendListPageUrl()]: pagedJsonResponse(firstPage, 'cursor-2'),
      [backendListPageUrl('cursor-2')]: pagedJsonResponse(secondPage, null),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    expect(readRequestUrlAt(0)).toBe(backendListPageUrl());
    expect(readRequestUrlAt(1)).toBe(backendListPageUrl('cursor-2'));
    expect(result).toEqual({ incidents: [...firstPage, ...secondPage], source: 'backend' });
  });

  it('con tres páginas sigue el cursor de cada respuesta y no reordena', async () => {
    routeFetchByUrlTable({
      [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], 'cursor-2'),
      [backendListPageUrl('cursor-2')]: pagedJsonResponse([buildListSummary('b', 'reported')], 'cursor-3'),
      [backendListPageUrl('cursor-3')]: pagedJsonResponse([buildListSummary('c', 'reported')], null),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(readAllRequestedUrls()).toEqual([
      backendListPageUrl(),
      backendListPageUrl('cursor-2'),
      backendListPageUrl('cursor-3'),
    ]);
    expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'b', 'c']);
  });

  it('una cabecera X-Next-Cursor vacía detiene la paginación', async () => {
    routeFetchByUrlTable({
      [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], ''),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(result.incidents.map((incident) => incident.id)).toEqual(['a']);
  });

  it('un cursor repetido detiene la paginación sin bucle infinito', async () => {
    routeFetchByUrlTable({
      [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], 'cursor-2'),
      [backendListPageUrl('cursor-2')]: pagedJsonResponse([buildListSummary('b', 'reported')], 'cursor-2'),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'b']);
  });

  it('sin fetchAllPages la URL es exactamente ?civicId=X aunque la respuesta traiga X-Next-Cursor', async () => {
    routeFetchByUrlTable({
      [BACKEND_LIST_URL]: pagedJsonResponse([buildListSummary('a', 'reported')], 'cursor-2'),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    expect(readRequestUrlAt(0)).toBe(`${BACKEND_API_URL}/incidents?civicId=${CITIZEN_CIVIC_ID}`);
    expect(readRequestUrlAt(0)).not.toContain('limit=');
    expect(readRequestUrlAt(0)).not.toContain('cursor=');
    expect(result.incidents.map((incident) => incident.id)).toEqual(['a']);
  });

  it('si una página posterior falla por red cae al mock con todas las incidencias', async () => {
    routeFetchByUrlTable({
      [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], 'cursor-2'),
      [backendListPageUrl('cursor-2')]: new TypeError('Network request failed'),
      [MOCK_LIST_URL]: jsonResponse([buildMockRecordForMap('m-1', 'reported', 40.1, -3.6)], 200),
    });

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(result.source).toBe('mock');
    expect(result.incidents.map((incident) => incident.id)).toEqual(['m-1']);
    expect(readRequestUrlAt(2)).toBe(MOCK_LIST_URL);
  });
});

describe('fetchMyMapIncidents', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedFetchCategories.mockReset();
    mockedFetchCategories.mockResolvedValue({
      categories: catalogCategories,
      source: 'backend',
      backendErrorMessage: null,
    });
  });

  describe('selección de detalles por estado', () => {
    it('no pide detalle de resolved ni closed, sí de reported, in_progress y rejected', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          [
            buildListSummary('a', 'reported'),
            buildListSummary('b', 'resolved'),
            buildListSummary('c', 'closed'),
            buildListSummary('d', 'in_progress'),
            buildListSummary('e', 'rejected'),
          ],
          null,
        ),
        [backendDetailUrlFor('a')]: jsonResponse(buildBackendDetail('a'), 200),
        [backendDetailUrlFor('d')]: jsonResponse(buildBackendDetail('d', { status: 'in_progress' }), 200),
        [backendDetailUrlFor('e')]: jsonResponse(buildBackendDetail('e', { status: 'rejected' }), 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(readAllRequestedUrls()).toEqual([
        backendListPageUrl(),
        backendDetailUrlFor('a'),
        backendDetailUrlFor('d'),
        backendDetailUrlFor('e'),
      ]);
      expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'd', 'e']);
    });

    it('con todas las incidencias resueltas o cerradas no pide ningún detalle', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          [buildListSummary('a', 'resolved'), buildListSummary('b', 'closed')],
          null,
        ),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ incidents: [], source: 'backend' });
    });
  });

  describe('concurrencia de detalles', () => {
    it('nunca tiene más de 4 detalles en vuelo y devuelve las incidencias en el orden del listado', async () => {
      const unresolvedIds = Array.from({ length: 10 }, (_unused, index) => `inc-${index}`);
      const listSummaries = unresolvedIds.map((incidentId) => buildListSummary(incidentId, 'reported'));
      const detailResponses = unresolvedIds.map(() => createControlledResponse());
      const startedIndexes: number[] = [];

      fetchWithTimeoutMock.mockImplementation((requestUrl: string) => {
        if (requestUrl === backendListPageUrl()) {
          return Promise.resolve(pagedJsonResponse(listSummaries, null));
        }
        const indexOfRequestedDetail = requestUrl.startsWith(MAP_BACKEND_DETAIL_PREFIX)
          ? unresolvedIds.indexOf(requestUrl.slice(MAP_BACKEND_DETAIL_PREFIX.length))
          : -1;
        if (indexOfRequestedDetail >= 0) {
          startedIndexes.push(indexOfRequestedDetail);
          return detailResponses[indexOfRequestedDetail].promise;
        }
        return Promise.reject(new Error(`URL no prevista: ${requestUrl}`));
      });

      const resultPromise = fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);
      const finishedIndexes = new Set<number>();
      let maxObservedInFlight = 0;

      while (finishedIndexes.size < unresolvedIds.length) {
        await flushPendingRequests();
        const inFlightIndexes = startedIndexes.filter((index) => !finishedIndexes.has(index));
        maxObservedInFlight = Math.max(maxObservedInFlight, inFlightIndexes.length);
        expect(inFlightIndexes.length).toBe(
          Math.min(MAP_MAX_IN_FLIGHT_DETAILS, unresolvedIds.length - finishedIndexes.size),
        );

        // Se termina la más reciente para forzar finalización fuera de orden.
        const indexToFinish = inFlightIndexes[inFlightIndexes.length - 1];
        detailResponses[indexToFinish].resolve(
          jsonResponse(buildBackendDetail(unresolvedIds[indexToFinish]), 200),
        );
        finishedIndexes.add(indexToFinish);
      }

      const result = await resultPromise;

      expect(maxObservedInFlight).toBe(MAP_MAX_IN_FLIGHT_DETAILS);
      expect(result.incidents.map((incident) => incident.id)).toEqual(unresolvedIds);
    });
  });

  describe('errores de detalle', () => {
    it('un detalle 404 se omite y el resto de incidencias se mantiene', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          [buildListSummary('a', 'reported'), buildListSummary('b', 'reported'), buildListSummary('c', 'reported')],
          null,
        ),
        [backendDetailUrlFor('a')]: jsonResponse(buildBackendDetail('a'), 200),
        [backendDetailUrlFor('b')]: jsonResponse({ message: 'Not Found' }, 404),
        [backendDetailUrlFor('c')]: jsonResponse(buildBackendDetail('c'), 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'c']);
      expect(result.source).toBe('backend');
    });

    it('un 401 en el listado rechaza con sesión caducada sin pedir detalles', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: jsonResponse({ message: 'Unauthorized' }, 401),
      });

      const error = await captureRejection(fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

      expect(error.message).toBe(MAP_QUERY_SESSION_EXPIRED_MESSAGE);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('un 401 en un detalle rechaza todo el mapa', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          [buildListSummary('a', 'reported'), buildListSummary('b', 'reported')],
          null,
        ),
        [backendDetailUrlFor('a')]: jsonResponse({ message: 'Unauthorized' }, 401),
        [backendDetailUrlFor('b')]: jsonResponse(buildBackendDetail('b'), 200),
      });

      const error = await captureRejection(fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN));

      expect(error.message).toBe(MAP_QUERY_SESSION_EXPIRED_MESSAGE);
    });

    it('un error genérico del backend en un detalle rechaza todo el mapa', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], null),
        [backendDetailUrlFor('a')]: jsonResponse({ message: 'boom' }, 500),
      });

      await expect(fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN)).rejects.toThrow(
        MESSAGE_INCIDENT_DETAIL_ERROR,
      );
    });
  });

  describe('descarte por ubicación', () => {
    it('descarta location null y lat/lng null, pero conserva coordenadas 0', async () => {
      const detailWithoutLocation = {
        ...buildBackendDetail('sin-ubicacion'),
        location: null,
      } as unknown as IncidentDetail;
      const detailWithNullLatitude = buildBackendDetail('lat-nula', {
        location: { latitude: null, longitude: -3.7, accuracy: null, createdAt: LIST_OLDER_CREATED_AT } as unknown as IncidentDetail['location'],
      });
      const detailWithNullLongitude = buildBackendDetail('lng-nula', {
        location: { latitude: 40.4, longitude: null, accuracy: null, createdAt: LIST_OLDER_CREATED_AT } as unknown as IncidentDetail['location'],
      });
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          ['ok', 'sin-ubicacion', 'lat-nula', 'lng-nula', 'cero'].map((incidentId) =>
            buildListSummary(incidentId, 'reported'),
          ),
          null,
        ),
        [backendDetailUrlFor('ok')]: jsonResponse(buildBackendDetail('ok'), 200),
        [backendDetailUrlFor('sin-ubicacion')]: jsonResponse(detailWithoutLocation, 200),
        [backendDetailUrlFor('lat-nula')]: jsonResponse(detailWithNullLatitude, 200),
        [backendDetailUrlFor('lng-nula')]: jsonResponse(detailWithNullLongitude, 200),
        [backendDetailUrlFor('cero')]: jsonResponse(
          buildBackendDetail('cero', {
            location: { latitude: 0, longitude: 0, accuracy: null, createdAt: LIST_OLDER_CREATED_AT },
          }),
          200,
        ),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.incidents.map((incident) => incident.id)).toEqual(['ok', 'cero']);
      expect(result.incidents[1]).toMatchObject({ latitude: 0, longitude: 0 });
    });

    it('mapea cada incidencia a MapIncident con los campos del detalle', async () => {
      const image = {
        id: 'img-1',
        url: 'file:///photos/farola.jpg',
        mimeType: 'image/jpeg',
        createdAt: LIST_OLDER_CREATED_AT,
      };
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'in_progress')], null),
        [backendDetailUrlFor('a')]: jsonResponse(
          buildBackendDetail('a', { status: 'in_progress', images: [image] }),
          200,
        ),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result).toEqual({
        incidents: [
          {
            id: 'a',
            title: 'Incidencia a',
            status: 'in_progress',
            category: 'Alumbrado público',
            categoryId: '2',
            latitude: 40.4168,
            longitude: -3.7038,
            createdAt: LIST_OLDER_CREATED_AT,
            images: [image],
          },
        ],
        source: 'backend',
      });
    });
  });

  describe('sesión y origen de los datos', () => {
    it('sin token lanza el mensaje de sesión sin hacer ninguna petición', async () => {
      await expect(fetchMyMapIncidents(CITIZEN_CIVIC_ID, null)).rejects.toThrow(QUERY_MISSING_TOKEN_MESSAGE);

      expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
    });

    it('con sesión mock usa el mock para listado y detalles y devuelve source "mock"', async () => {
      routeFetchByUrlTable({
        [MOCK_LIST_URL]: jsonResponse(
          [
            buildMockRecordForMap('a', 'reported', 40.1, -3.6),
            buildMockRecordForMap('b', 'resolved', 40.2, -3.5),
            buildMockRecordForMap('c', 'validated', 40.3, -3.4),
          ],
          200,
        ),
        [mockDetailUrlFor('a')]: jsonResponse(buildMockRecordForMap('a', 'reported', 40.1, -3.6), 200),
        [mockImagesUrlFor('a')]: jsonResponse([], 200),
        [mockDetailUrlFor('c')]: jsonResponse(buildMockRecordForMap('c', 'validated', 40.3, -3.4), 200),
        [mockImagesUrlFor('c')]: jsonResponse([], 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, MOCK_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'c']);
      expect(readAllRequestedUrls().some((requestUrl) => requestUrl.startsWith(BACKEND_API_URL))).toBe(false);
    });

    it('con backend y todo correcto devuelve source "backend"', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse([buildListSummary('a', 'reported')], null),
        [backendDetailUrlFor('a')]: jsonResponse(buildBackendDetail('a'), 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.source).toBe('backend');
    });

    it('si el listado cae a la red devuelve source "mock" y los detalles van directo al mock sin tocar el backend', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: new RequestTimeoutError(),
        [MOCK_LIST_URL]: jsonResponse(
          [buildMockRecordForMap('a', 'reported', 40.1, -3.6), buildMockRecordForMap('b', 'resolved', 40.2, -3.5)],
          200,
        ),
        [mockDetailUrlFor('a')]: jsonResponse(buildMockRecordForMap('a', 'reported', 40.1, -3.6), 200),
        [mockImagesUrlFor('a')]: jsonResponse([], 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incidents.map((incident) => incident.id)).toEqual(['a']);
      // El listado cayó al mock: el detalle no intenta el backend (evita un timeout por detalle).
      expect(readAllRequestedUrls()).toEqual([
        backendListPageUrl(),
        MOCK_LIST_URL,
        mockDetailUrlFor('a'),
        mockImagesUrlFor('a'),
      ]);
    });

    it('si un detalle cae a la red usa el mock para ese detalle y el resultado es source "mock"', async () => {
      routeFetchByUrlTable({
        [backendListPageUrl()]: pagedJsonResponse(
          [buildListSummary('a', 'reported'), buildListSummary('b', 'reported')],
          null,
        ),
        [backendDetailUrlFor('a')]: jsonResponse(buildBackendDetail('a'), 200),
        [backendDetailUrlFor('b')]: new RequestTimeoutError(),
        [mockDetailUrlFor('b')]: jsonResponse(buildMockRecordForMap('b', 'reported', 40.2, -3.5), 200),
        [mockImagesUrlFor('b')]: jsonResponse([], 200),
      });

      const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

      expect(result.source).toBe('mock');
      expect(result.incidents.map((incident) => incident.id)).toEqual(['a', 'b']);
      expect(readAllRequestedUrls()).not.toContain(mockDetailUrlFor('a'));
    });
  });
});

describe('fetchMyMapIncidents con listado mock y detalle 404', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    mockedFetchCategories.mockReset();
    mockedFetchCategories.mockResolvedValue({
      categories: catalogCategories,
      source: 'backend',
      backendErrorMessage: null,
    });
  });

  it('con listado en mock, un detalle mock 404 se omite y no hay ninguna petición al backend de detalle', async () => {
    routeFetchByUrlTable({
      [backendListPageUrl()]: new RequestTimeoutError(),
      [MOCK_LIST_URL]: jsonResponse(
        [buildMockRecordForMap('a', 'reported', 40.1, -3.6), buildMockRecordForMap('b', 'reported', 40.2, -3.5)],
        200,
      ),
      [mockDetailUrlFor('a')]: jsonResponse(buildMockRecordForMap('a', 'reported', 40.1, -3.6), 200),
      [mockImagesUrlFor('a')]: jsonResponse([], 200),
      [mockDetailUrlFor('b')]: jsonResponse({ message: 'Not Found' }, 404),
    });

    const result = await fetchMyMapIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN);

    expect(result.source).toBe('mock');
    expect(result.incidents.map((incident) => incident.id)).toEqual(['a']);
    expect(readAllRequestedUrls().filter((requestUrl) => requestUrl.startsWith(MAP_BACKEND_DETAIL_PREFIX))).toEqual([]);
    expect(readAllRequestedUrls()).toHaveLength(5);
    expect(readAllRequestedUrls()).toEqual(
      expect.arrayContaining([
        backendListPageUrl(),
        MOCK_LIST_URL,
        mockDetailUrlFor('a'),
        mockImagesUrlFor('a'),
        mockDetailUrlFor('b'),
      ]),
    );
  });
});

describe('fetchMyIncidents con tope de páginas (MAX_INCIDENT_PAGES = 50)', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
  });

  it('una cadena de más de 50 cursores distintos se detiene en exactamente 50 peticiones', async () => {
    const distinctCursorCount = 60;
    const outcomesByUrl: OutcomesByUrl = {
      [backendListPageUrl()]: pagedJsonResponse([buildListSummary('item-0', 'reported')], 'cursor-1'),
    };
    for (let cursorIndex = 1; cursorIndex <= distinctCursorCount; cursorIndex += 1) {
      outcomesByUrl[backendListPageUrl(`cursor-${cursorIndex}`)] = pagedJsonResponse(
        [buildListSummary(`item-${cursorIndex}`, 'reported')],
        `cursor-${cursorIndex + 1}`,
      );
    }
    routeFetchByUrlTable(outcomesByUrl);

    const result = await fetchMyIncidents(CITIZEN_CIVIC_ID, BACKEND_TOKEN, { fetchAllPages: true });

    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(50);
    expect(readRequestUrlAt(49)).toBe(backendListPageUrl('cursor-49'));
    expect(result.source).toBe('backend');
    expect(result.incidents).toHaveLength(50);
    expect(result.incidents[49].id).toBe('item-49');
  });
});
