/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useCreateIncident } from '@/hooks/use-create-incident';
import { createIncident } from '@/services/incident.service';
import type {
  CreateIncidentInput,
  CreateIncidentResult,
  CreatedIncident,
} from '@/types/incident';

jest.mock('@/services/incident.service', () => ({
  createIncident: jest.fn(),
}));

const mockedCreateIncident = createIncident as jest.MockedFunction<typeof createIncident>;

// Civic ID de fixture que representa la sesión activa en los casos felices.
const TEST_CIVIC_ID = 'civic-123';

// Mensaje que expone el hook cuando no hay `civicId` (sesión no identificable).
const MISSING_SESSION_MESSAGE = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.';

const validInput: CreateIncidentInput = {
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  latitude: null,
  longitude: null,
  accuracy: null,
};

const selectedImageUris = ['file:///photos/bache-1.jpg', 'file:///photos/bache-2.png'];

// Respuesta del backend real (POST /incidents) con el shape de CreatedIncident.
const createdIncident: CreatedIncident = {
  id: '42',
  title: validInput.title,
  description: validInput.description,
  civicId: '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5',
  categoryId: null,
  category: null,
  urbanAssetId: null,
  location: {
    latitude: null,
    longitude: null,
    accuracy: null,
    createdAt: '2026-10-19T10:00:00.000Z',
  },
  images: [],
  status: 'reported',
  priority: 'low',
  createdAt: '2026-10-19T10:00:00.000Z',
};

// Resultado del servicio cuando la incidencia se creó en el backend real.
const backendCreateResult: CreateIncidentResult = {
  incident: createdIncident,
  source: 'backend',
};

// Resultado del servicio cuando el backend no respondió y se usó el mock.
const mockCreateResult: CreateIncidentResult = {
  incident: { ...createdIncident, id: '99' },
  source: 'mock',
};

// Promesa controlada desde fuera para observar el estado mientras la petición vuela.
function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

describe('useCreateIncident', () => {
  beforeEach(() => {
    mockedCreateIncident.mockReset();
  });

  it('en éxito con origen backend devuelve { incident, source: "backend" } y deja isSubmitting en false', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    let returned: CreateIncidentResult | null = null;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toEqual(backendCreateResult);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('en éxito con origen mock devuelve { incident, source: "mock" } sin tratarlo como error', async () => {
    mockedCreateIncident.mockResolvedValueOnce(mockCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    let returned: CreateIncidentResult | null = null;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toEqual(mockCreateResult);
    expect(returned).toMatchObject({ source: 'mock' });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('reenvía input e imageUris a createIncident como argumentos separados', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, selectedImageUris);
  });

  it('reenvía un array vacío de imageUris sin transformarlo', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    await act(async () => {
      await result.current.submitIncident(validInput, []);
    });

    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, []);
  });

  it('si no se pasan imageUris reenvía undefined como segundo argumento', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    await act(async () => {
      await result.current.submitIncident(validInput);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident.mock.calls[0][0]).toEqual(validInput);
    expect(mockedCreateIncident.mock.calls[0][1]).toBeUndefined();
  });

  it('en error rellena errorMessage y devuelve null', async () => {
    mockedCreateIncident.mockRejectedValueOnce(
      new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );
    const { result } = await renderHook(() => useCreateIncident());

    let returned: CreateIncidentResult | null = backendCreateResult;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBe(
      'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.',
    );
  });

  it('si el error no es una instancia de Error usa el mensaje genérico en español', async () => {
    mockedCreateIncident.mockRejectedValueOnce('boom');
    const { result } = await renderHook(() => useCreateIncident());

    let returned: CreateIncidentResult | null = backendCreateResult;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toBeNull();
    expect(result.current.errorMessage).toBe(
      'Ocurrió un error inesperado al registrar la incidencia.',
    );
  });

  it('mientras la petición está en curso isSubmitting es true y se libera al resolver', async () => {
    const pendingRequest = createDeferred<CreateIncidentResult>();
    mockedCreateIncident.mockReturnValueOnce(pendingRequest.promise);
    const { result } = await renderHook(() => useCreateIncident());

    let submission: Promise<CreateIncidentResult | null> | undefined;
    await act(async () => {
      submission = result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      pendingRequest.resolve(mockCreateResult);
      await submission;
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('libera isSubmitting tras un fallo aunque la petición esté en curso', async () => {
    const pendingRequest = createDeferred<CreateIncidentResult>();
    mockedCreateIncident.mockReturnValueOnce(pendingRequest.promise);
    const { result } = await renderHook(() => useCreateIncident());

    let submission: Promise<CreateIncidentResult | null> | undefined;
    await act(async () => {
      submission = result.current.submitIncident(validInput, selectedImageUris);
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      pendingRequest.reject(new Error('No se pudo conectar con el servidor.'));
      await submission;
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBe('No se pudo conectar con el servidor.');
  });

  it('un nuevo envío limpia el errorMessage anterior', async () => {
    mockedCreateIncident.mockRejectedValueOnce(new Error('Fallo previo.'));
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident());

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });
    expect(result.current.errorMessage).toBe('Fallo previo.');

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(result.current.errorMessage).toBeNull();
  });
});
