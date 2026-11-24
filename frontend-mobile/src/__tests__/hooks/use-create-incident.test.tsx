/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useCreateIncident } from '@/hooks/use-create-incident';
import { createIncident, uploadIncidentImages } from '@/services/incident.service';
import type {
  CreateIncidentInput,
  CreateIncidentResult,
  CreatedIncident,
} from '@/types/incident';
import type { AuthToken } from '@/types/token';

jest.mock('@/services/incident.service', () => ({
  IMAGES_UPLOAD_ERROR_MESSAGE: 'La incidencia se registró, pero no se pudieron subir las fotos.',
  createIncident: jest.fn(),
  uploadIncidentImages: jest.fn(),
}));

const mockedCreateIncident = jest.mocked(createIncident);
const mockedUploadIncidentImages = jest.mocked(uploadIncidentImages);

// Token de sesión de fixture (origen backend).
const TEST_TOKEN: AuthToken = { accessToken: 'jwt-de-prueba', source: 'backend' };

// Civic ID de fixture que representa la sesión activa en los casos felices.
const TEST_CIVIC_ID = 'civic-123';

// Mensaje que expone el hook cuando no hay `civicId` (sesión no identificable).
const MISSING_SESSION_MESSAGE = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.';

const validInput: CreateIncidentInput = {
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  categoryId: 'b7c1e1c2-0b6a-4b2f-9b1a-1f2d3e4c5a6b',
  latitude: 36.72,
  longitude: -4.42,
  accuracy: 12,
};

const selectedImageUris = ['file:///photos/bache-1.jpg', 'file:///photos/bache-2.png'];

// Respuesta del backend real (POST /incidents) con el shape de CreatedIncident.
const createdIncident: CreatedIncident = {
  id: '42',
  title: validInput.title,
  description: validInput.description,
  civicId: '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5',
  categoryId: validInput.categoryId,
  category: 'Transporte',
  urbanAssetId: null,
  location: {
    latitude: 36.72,
    longitude: -4.42,
    accuracy: 12,
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
  pendingImageUris: [],
  imagesUploadErrorMessage: null,
};

// Resultado del servicio cuando el backend no respondió y se usó el mock.
const mockCreateResult: CreateIncidentResult = {
  incident: { ...createdIncident, id: '99' },
  source: 'mock',
  pendingImageUris: [],
  imagesUploadErrorMessage: null,
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
    mockedUploadIncidentImages.mockReset();
  });

  it('reenvía un token null tal cual (el servicio decide cómo tratarlo)', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, null));

    await act(async () => {
      await result.current.submitIncident(validInput, []);
    });

    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, { civicId: TEST_CIVIC_ID, token: null }, []);
  });

  describe('uploadPendingImages (reintento de la subida de fotos)', () => {
    const failedUploadResult: CreateIncidentResult = {
      ...backendCreateResult,
      pendingImageUris: selectedImageUris,
      imagesUploadErrorMessage: 'La incidencia se registró, pero no se pudieron subir las fotos.',
    };

    it('reintenta solo la subida con el id, las fotos pendientes, el origen y el token, sin crear otra incidencia', async () => {
      const uploadedImage = {
        id: 'img-1',
        url: 'https://s3/img-1.jpg',
        mimeType: 'image/jpeg',
        createdAt: '2026-10-19T10:01:00.000Z',
      };
      mockedUploadIncidentImages.mockResolvedValueOnce({
        images: [uploadedImage],
        pendingImageUris: [],
        errorMessage: null,
      });
      const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

      let updated: CreateIncidentResult | undefined;
      await act(async () => {
        updated = await result.current.uploadPendingImages(failedUploadResult);
      });

      expect(mockedUploadIncidentImages).toHaveBeenCalledWith('42', selectedImageUris, 'backend', TEST_TOKEN);
      expect(mockedCreateIncident).not.toHaveBeenCalled();
      expect(updated?.pendingImageUris).toEqual([]);
      expect(updated?.imagesUploadErrorMessage).toBeNull();
      expect(updated?.incident.images).toEqual([uploadedImage]);
    });

    it('si el reintento vuelve a fallar conserva las fotos pendientes y el mensaje', async () => {
      mockedUploadIncidentImages.mockResolvedValueOnce({
        images: [],
        pendingImageUris: selectedImageUris,
        errorMessage: 'La incidencia se registró, pero no se pudieron subir las fotos.',
      });
      const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

      let updated: CreateIncidentResult | undefined;
      await act(async () => {
        updated = await result.current.uploadPendingImages(failedUploadResult);
      });

      expect(updated?.pendingImageUris).toEqual(selectedImageUris);
      expect(updated?.imagesUploadErrorMessage).toBe(
        'La incidencia se registró, pero no se pudieron subir las fotos.',
      );
    });

    it('si el servicio lanza de forma inesperada no propaga el error y conserva lo pendiente', async () => {
      mockedUploadIncidentImages.mockRejectedValueOnce(new Error('boom'));
      const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

      let updated: CreateIncidentResult | undefined;
      await act(async () => {
        updated = await result.current.uploadPendingImages(failedUploadResult);
      });

      expect(updated?.pendingImageUris).toEqual(selectedImageUris);
      expect(updated?.imagesUploadErrorMessage).toBe(
        'La incidencia se registró, pero no se pudieron subir las fotos.',
      );
    });
  });

  it('en éxito con origen backend devuelve { incident, source: "backend" } y deja isSubmitting en false', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

    let returned: CreateIncidentResult | null = null;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toEqual(mockCreateResult);
    expect(returned).toMatchObject({ source: 'mock' });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('reenvía input, autor (civicId + token) e imageUris a createIncident en ese orden exacto', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, { civicId: TEST_CIVIC_ID, token: TEST_TOKEN }, selectedImageUris);
  });

  it('reenvía un array vacío de imageUris sin transformarlo', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput, []);
    });

    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, { civicId: TEST_CIVIC_ID, token: TEST_TOKEN }, []);
  });

  it('si no se pasan imageUris reenvía undefined como tercer argumento y el civicId como segundo', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident.mock.calls[0][0]).toEqual(validInput);
    expect(mockedCreateIncident.mock.calls[0][1]).toEqual({ civicId: TEST_CIVIC_ID, token: TEST_TOKEN });
    expect(mockedCreateIncident.mock.calls[0][2]).toBeUndefined();
  });

  it('en error rellena errorMessage y devuelve null', async () => {
    mockedCreateIncident.mockRejectedValueOnce(
      new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });
    expect(result.current.errorMessage).toBe('Fallo previo.');

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(result.current.errorMessage).toBeNull();
  });

  describe('sin civicId (sesión no identificable)', () => {
    it('submitIncident devuelve null de inmediato y fija el mensaje de sesión no identificable', async () => {
      const { result } = await renderHook(() => useCreateIncident(null, TEST_TOKEN));

      let returned: CreateIncidentResult | null = backendCreateResult;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toBeNull();
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
    });

    it('no llama a createIncident', async () => {
      const { result } = await renderHook(() => useCreateIncident(null, TEST_TOKEN));

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(mockedCreateIncident).not.toHaveBeenCalled();
    });

    it('isSubmitting nunca pasa a true durante el intento', async () => {
      const observedIsSubmittingStates: boolean[] = [];
      const { result } = await renderHook(() => {
        const hookResult = useCreateIncident(null, TEST_TOKEN);
        observedIsSubmittingStates.push(hookResult.isSubmitting);
        return hookResult;
      });

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(observedIsSubmittingStates).not.toContain(true);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('un reintento sin civicId vuelve a fijar el mismo mensaje y sigue sin llamar al servicio', async () => {
      const { result } = await renderHook(() => useCreateIncident(null, TEST_TOKEN));

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
      expect(mockedCreateIncident).not.toHaveBeenCalled();
    });

    it('reintentar tras un error previo con civicId limpia el error anterior y muestra el mensaje de sesión', async () => {
      mockedCreateIncident.mockRejectedValueOnce(new Error('Fallo previo.'));
      const { result, rerender } = await renderHook(
        ({ civicId }: { civicId: string | null }) => useCreateIncident(civicId, TEST_TOKEN),
        { initialProps: { civicId: TEST_CIVIC_ID } },
      );

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      expect(result.current.errorMessage).toBe('Fallo previo.');

      await rerender({ civicId: null });
      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
      expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    });

    it('reintentar con civicId tras el mensaje de sesión limpia el error y envía con el civicId', async () => {
      mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
      const { result, rerender } = await renderHook(
        ({ civicId }: { civicId: string | null }) => useCreateIncident(civicId, TEST_TOKEN),
        { initialProps: { civicId: null as string | null } },
      );

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);

      await rerender({ civicId: TEST_CIVIC_ID });
      let returned: CreateIncidentResult | null = null;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toEqual(backendCreateResult);
      expect(result.current.errorMessage).toBeNull();
      expect(mockedCreateIncident).toHaveBeenCalledWith(validInput, { civicId: TEST_CIVIC_ID, token: TEST_TOKEN }, selectedImageUris);
    });
  });
});
