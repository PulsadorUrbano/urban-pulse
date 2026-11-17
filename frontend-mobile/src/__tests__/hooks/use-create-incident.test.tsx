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

// Token de acceso de fixture que representa la sesión activa en los casos felices.
const TEST_ACCESS_TOKEN = 'test-access-token';

// Mensaje que expone el hook cuando falta `civicId` o `accessToken` (sesión no identificable).
const MISSING_SESSION_MESSAGE = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.';

// Props de sesión usadas por los tests que re-renderizan el hook con otra sesión.
interface SessionProps {
  civicId: string | null;
  accessToken: string | null;
}

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    let returned: CreateIncidentResult | null = null;
    await act(async () => {
      returned = await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(returned).toEqual(mockCreateResult);
    expect(returned).toMatchObject({ source: 'mock' });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('reenvía input, civicId, accessToken e imageUris a createIncident en ese orden exacto', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput, selectedImageUris);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(
      validInput,
      TEST_CIVIC_ID,
      TEST_ACCESS_TOKEN,
      selectedImageUris,
    );
  });

  it('reenvía un array vacío de imageUris sin transformarlo', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput, []);
    });

    expect(mockedCreateIncident).toHaveBeenCalledWith(
      validInput,
      TEST_CIVIC_ID,
      TEST_ACCESS_TOKEN,
      [],
    );
  });

  it('si no se pasan imageUris reenvía undefined como cuarto argumento y civicId y accessToken en sus posiciones', async () => {
    mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

    await act(async () => {
      await result.current.submitIncident(validInput);
    });

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident.mock.calls[0][0]).toEqual(validInput);
    expect(mockedCreateIncident.mock.calls[0][1]).toBe(TEST_CIVIC_ID);
    expect(mockedCreateIncident.mock.calls[0][2]).toBe(TEST_ACCESS_TOKEN);
    expect(mockedCreateIncident.mock.calls[0][3]).toBeUndefined();
  });

  it('en error rellena errorMessage y devuelve null', async () => {
    mockedCreateIncident.mockRejectedValueOnce(
      new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
    const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, TEST_ACCESS_TOKEN));

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
      const { result } = await renderHook(() => useCreateIncident(null, TEST_ACCESS_TOKEN));

      let returned: CreateIncidentResult | null = backendCreateResult;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toBeNull();
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
    });

    it('no llama a createIncident', async () => {
      const { result } = await renderHook(() => useCreateIncident(null, TEST_ACCESS_TOKEN));

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(mockedCreateIncident).not.toHaveBeenCalled();
    });

    it('isSubmitting nunca pasa a true durante el intento', async () => {
      const observedIsSubmittingStates: boolean[] = [];
      const { result } = await renderHook(() => {
        const hookResult = useCreateIncident(null, TEST_ACCESS_TOKEN);
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
      const { result } = await renderHook(() => useCreateIncident(null, TEST_ACCESS_TOKEN));

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
        ({ civicId, accessToken }: SessionProps) => useCreateIncident(civicId, accessToken),
        { initialProps: { civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN } },
      );

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      expect(result.current.errorMessage).toBe('Fallo previo.');

      await rerender({ civicId: null, accessToken: TEST_ACCESS_TOKEN });
      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
      expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    });

    it('reintentar con civicId tras el mensaje de sesión limpia el error y envía con civicId y accessToken', async () => {
      mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
      const { result, rerender } = await renderHook(
        ({ civicId, accessToken }: SessionProps) => useCreateIncident(civicId, accessToken),
        { initialProps: { civicId: null, accessToken: TEST_ACCESS_TOKEN } },
      );

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);

      await rerender({ civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN });
      let returned: CreateIncidentResult | null = null;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toEqual(backendCreateResult);
      expect(result.current.errorMessage).toBeNull();
      expect(mockedCreateIncident).toHaveBeenCalledWith(
        validInput,
        TEST_CIVIC_ID,
        TEST_ACCESS_TOKEN,
        selectedImageUris,
      );
    });
  });

  describe('sin accessToken (sesión no identificable)', () => {
    it('submitIncident devuelve null de inmediato y fija el mensaje de sesión no identificable', async () => {
      const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, null));

      let returned: CreateIncidentResult | null = backendCreateResult;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toBeNull();
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
    });

    it('no llama a createIncident', async () => {
      const { result } = await renderHook(() => useCreateIncident(TEST_CIVIC_ID, null));

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(mockedCreateIncident).not.toHaveBeenCalled();
    });

    it('isSubmitting nunca pasa a true durante el intento', async () => {
      const observedIsSubmittingStates: boolean[] = [];
      const { result } = await renderHook(() => {
        const hookResult = useCreateIncident(TEST_CIVIC_ID, null);
        observedIsSubmittingStates.push(hookResult.isSubmitting);
        return hookResult;
      });

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(observedIsSubmittingStates).not.toContain(true);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('sin civicId ni accessToken también devuelve null, fija el mensaje de sesión y no llama al servicio', async () => {
      const { result } = await renderHook(() => useCreateIncident(null, null));

      let returned: CreateIncidentResult | null = backendCreateResult;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toBeNull();
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
      expect(mockedCreateIncident).not.toHaveBeenCalled();
    });

    it('reintentar con accessToken tras el mensaje de sesión limpia el error y envía con el accessToken', async () => {
      mockedCreateIncident.mockResolvedValueOnce(backendCreateResult);
      const { result, rerender } = await renderHook(
        ({ civicId, accessToken }: SessionProps) => useCreateIncident(civicId, accessToken),
        { initialProps: { civicId: TEST_CIVIC_ID, accessToken: null as string | null } },
      );

      await act(async () => {
        await result.current.submitIncident(validInput, selectedImageUris);
      });
      expect(result.current.errorMessage).toBe(MISSING_SESSION_MESSAGE);
      expect(mockedCreateIncident).not.toHaveBeenCalled();

      await rerender({ civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN });
      let returned: CreateIncidentResult | null = null;
      await act(async () => {
        returned = await result.current.submitIncident(validInput, selectedImageUris);
      });

      expect(returned).toEqual(backendCreateResult);
      expect(result.current.errorMessage).toBeNull();
      expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
      expect(mockedCreateIncident).toHaveBeenCalledWith(
        validInput,
        TEST_CIVIC_ID,
        TEST_ACCESS_TOKEN,
        selectedImageUris,
      );
    });
  });

  describe('referencia memoizada de submitIncident', () => {
    it('se mantiene estable entre renders si civicId y accessToken no cambian', async () => {
      const { result, rerender } = await renderHook(
        ({ civicId, accessToken }: SessionProps) => useCreateIncident(civicId, accessToken),
        { initialProps: { civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN } },
      );
      const firstSubmitIncident = result.current.submitIncident;

      await rerender({ civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN });

      expect(result.current.submitIncident).toBe(firstSubmitIncident);
    });

    it('cambia la referencia cuando cambia accessToken', async () => {
      const { result, rerender } = await renderHook(
        ({ civicId, accessToken }: SessionProps) => useCreateIncident(civicId, accessToken),
        { initialProps: { civicId: TEST_CIVIC_ID, accessToken: TEST_ACCESS_TOKEN } },
      );
      const firstSubmitIncident = result.current.submitIncident;

      await rerender({ civicId: TEST_CIVIC_ID, accessToken: 'rotated-access-token' });

      expect(result.current.submitIncident).not.toBe(firstSubmitIncident);
    });
  });
});
