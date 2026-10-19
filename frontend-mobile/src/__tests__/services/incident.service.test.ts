/// <reference types="jest" />
import { BACKEND_API_URL } from '@/constants/config';
import {
  INCIDENTS_ENDPOINT,
  MAX_INCIDENT_IMAGES,
  createIncident,
} from '@/services/incident.service';
import { RequestTimeoutError, fetchWithTimeout } from '@/services/http';
import type { CreateIncidentInput, CreatedIncident } from '@/types/incident';

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

const fetchWithTimeoutMock = jest.mocked(fetchWithTimeout);

// Identificador temporal del ciudadano que el servicio envía en todos los casos.
const TEMPORARY_CIVIC_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// Forma de la parte de fichero que React Native acepta dentro de FormData.
interface ImageFilePart {
  uri: string;
  name: string;
  type: string;
}

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
    createdAt: '2026-10-19T10:00:00.000Z',
  },
  images: [
    {
      id: 'img-1',
      url: 'https://picsum.photos/seed/bache/800/600',
      mimeType: 'image/jpeg',
      createdAt: '2026-10-19T10:00:00.000Z',
    },
  ],
  status: 'reported',
  priority: 'low',
  createdAt: '2026-10-19T10:00:00.000Z',
};

// Respuesta mínima compatible con lo que usa el servicio (ok + json).
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 201 : 500, json: async () => body } as unknown as Response;
}

// Devuelve el FormData enviado en una llamada concreta de fetchWithTimeout.
function readSentFormData(callIndex = 0): RecordingFormData {
  const [, requestInit] = fetchWithTimeoutMock.mock.calls[callIndex];
  const sentBody = requestInit?.body;
  if (!(sentBody instanceof RecordingFormData)) {
    throw new Error('El body enviado no es un FormData.');
  }
  return sentBody;
}

// Devuelve el init (método, body, cabeceras) de una llamada concreta.
function readSentInit(callIndex = 0): RequestInit {
  const [, requestInit] = fetchWithTimeoutMock.mock.calls[callIndex];
  return requestInit ?? {};
}

describe('createIncident', () => {
  beforeEach(() => {
    fetchWithTimeoutMock.mockReset();
    globalThis.FormData = RecordingFormData as unknown as typeof FormData;
    fetchWithTimeoutMock.mockResolvedValue(jsonResponse(serverCreatedIncident, true));
  });

  afterEach(() => {
    globalThis.FormData = OriginalFormData;
  });

  describe('petición multipart', () => {
    it('hace POST a `${BACKEND_API_URL}/incidents`', async () => {
      await createIncident(fullInput);

      expect(INCIDENTS_ENDPOINT).toBe(`${BACKEND_API_URL}/incidents`);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      const [requestUrl] = fetchWithTimeoutMock.mock.calls[0];
      expect(requestUrl).toBe(`${BACKEND_API_URL}/incidents`);
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

  describe('campos del formulario', () => {
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

  describe('imágenes', () => {
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

    it('nombra cada parte como image_<índice>.<extensión> según su posición', async () => {
      await createIncident(fullInput, ['file:///photos/a.png', 'file:///photos/b.webp', 'file:///photos/c.jpg']);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imageParts.map((part) => part.name)).toEqual([
        'image_0.png',
        'image_1.webp',
        'image_2.jpg',
      ]);
    });

    it('asigna image/png a URIs .png', async () => {
      await createIncident(fullInput, ['file:///photos/foto.png']);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart).toEqual({
        uri: 'file:///photos/foto.png',
        name: 'image_0.png',
        type: 'image/png',
      });
    });

    it('asigna image/webp a URIs .webp', async () => {
      await createIncident(fullInput, ['file:///photos/foto.webp']);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart).toEqual({
        uri: 'file:///photos/foto.webp',
        name: 'image_0.webp',
        type: 'image/webp',
      });
    });

    it('asigna image/jpeg y extensión jpg a URIs .jpg', async () => {
      await createIncident(fullInput, ['file:///photos/foto.jpg']);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart).toEqual({
        uri: 'file:///photos/foto.jpg',
        name: 'image_0.jpg',
        type: 'image/jpeg',
      });
    });

    it('usa JPEG por defecto para extensiones no reconocidas (.heic o .jpeg)', async () => {
      await createIncident(fullInput, ['file:///photos/foto.heic', 'file:///photos/foto.jpeg']);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imageParts.map((part) => [part.name, part.type])).toEqual([
        ['image_0.jpg', 'image/jpeg'],
        ['image_1.jpg', 'image/jpeg'],
      ]);
    });

    it('detecta la extensión ignorando el query string y conserva la URI completa', async () => {
      const uriWithQuery = 'file:///photos/foto.png?timestamp=1700000000';

      await createIncident(fullInput, [uriWithQuery]);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart.uri).toBe(uriWithQuery);
      expect(imagePart.name).toBe('image_0.png');
      expect(imagePart.type).toBe('image/png');
    });

    it('detecta la extensión sin distinguir mayúsculas', async () => {
      await createIncident(fullInput, ['file:///photos/FOTO.PNG']);

      const [imagePart] = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imagePart.name).toBe('image_0.png');
      expect(imagePart.type).toBe('image/png');
    });

    it('mantiene el orden de las URIs en las partes images', async () => {
      const orderedUris = ['file:///photos/z.webp', 'file:///photos/a.png', 'file:///photos/m.jpg'];

      await createIncident(fullInput, orderedUris);

      const imageParts = readSentFormData().getAll('images') as ImageFilePart[];
      expect(imageParts.map((part) => part.uri)).toEqual(orderedUris);
    });
  });

  describe('errores', () => {
    it('convierte RequestTimeoutError en el mensaje de timeout que menciona el backend', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new RequestTimeoutError());

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_TIMEOUT_ERROR);
    });

    it('convierte un fallo de red genérico en el mensaje de conexión', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_CONNECTION_ERROR);
    });

    it('si la respuesta no es ok lanza el mensaje de registro fallido', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse({ message: 'boom' }, false));

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });

    it('con un estado 4xx también lanza el mensaje de registro fallido', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      } as unknown as Response);

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
    });

    it('con respuesta no ok no intenta parsear el cuerpo como incidencia', async () => {
      const jsonSpy = jest.fn();
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jsonSpy,
      } as unknown as Response);

      await expect(createIncident(fullInput)).rejects.toThrow(MESSAGE_REGISTER_ERROR);
      expect(jsonSpy).not.toHaveBeenCalled();
    });
  });

  describe('éxito', () => {
    it('devuelve la CreatedIncident parseada de la respuesta del backend', async () => {
      const created = await createIncident(fullInput);

      expect(created).toEqual(serverCreatedIncident);
    });

    it('lee el cuerpo de la respuesta una sola vez como JSON', async () => {
      const jsonSpy = jest.fn(async () => serverCreatedIncident);
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: jsonSpy,
      } as unknown as Response);

      await createIncident(minimalInput);

      expect(jsonSpy).toHaveBeenCalledTimes(1);
    });
  });
});
