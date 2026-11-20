/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useIncidentDetail } from '@/hooks/use-incident-detail';
import { IncidentNotFoundError, fetchIncidentById } from '@/services/incident.service';
import type { FetchIncidentDetailResult, IncidentDetail } from '@/types/incident';
import type { AuthToken } from '@/types/token';

// Se mockea solo `fetchIncidentById`; `IncidentNotFoundError` se conserva real
// para que el `instanceof` del hook se evalúe contra la misma clase, y
// `QUERY_MISSING_TOKEN_MESSAGE` también real para comprobar el mensaje de sesión.
jest.mock('@/services/incident.service', () => {
  const actualService = jest.requireActual<typeof import('@/services/incident.service')>(
    '@/services/incident.service',
  );
  return {
    ...actualService,
    fetchIncidentById: jest.fn(),
  };
});

const mockedFetchIncidentById = jest.mocked(fetchIncidentById);

const incidentFixture: IncidentDetail = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  civicId: 'ciudadano-1',
  categoryId: '1',
  category: 'Vías',
  urbanAssetId: null,
  location: {
    latitude: 40.4168,
    longitude: -3.7038,
    accuracy: 5,
    createdAt: '2026-10-24T10:00:00.000Z',
  },
  images: [],
  status: 'reported',
  priority: 'low',
  createdAt: '2026-10-24T10:00:00.000Z',
};

const backendResultFixture: FetchIncidentDetailResult = {
  incident: incidentFixture,
  source: 'backend',
};

const mockResultFixture: FetchIncidentDetailResult = {
  incident: incidentFixture,
  source: 'mock',
};

const BACKEND_TOKEN: AuthToken = { accessToken: 'jwt-backend-test', source: 'backend' };

type TokenProps = { token: AuthToken | null };

const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, mostrando los datos del mock.';
const GENERIC_ERROR_MESSAGE = 'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.';
const SESSION_ERROR_MESSAGE = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.';

// Promesa controlable desde el test para observar estados intermedios de carga.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Vacía los microtasks pendientes dentro de act para que los setState se apliquen.
async function flushPendingMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useIncidentDetail', () => {
  beforeEach(() => {
    mockedFetchIncidentById.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('en carga desde backend rellena incident y deja las banderas de error y aviso limpias', async () => {
    mockedFetchIncidentById.mockResolvedValueOnce(backendResultFixture);

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchIncidentById).toHaveBeenCalledWith('42', BACKEND_TOKEN);
    expect(result.current.incident).toEqual(incidentFixture);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en carga desde mock rellena incident y expone el aviso de fallback exacto', async () => {
    mockedFetchIncidentById.mockResolvedValueOnce(mockResultFixture);

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incident).toEqual(incidentFixture);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
  });

  it('con IncidentNotFoundError marca isNotFound, no muestra errorMessage y deja incident en null', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce(
      new IncidentNotFoundError('La incidencia solicitada no existe.'),
    );

    const { result } = await renderHook(() => useIncidentDetail('999', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isNotFound).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.incident).toBeNull();
  });

  it('con un Error genérico expone su mensaje en errorMessage, isNotFound false e incident null', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce(new Error('Fallo de servidor inesperado.'));

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo de servidor inesperado.');
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.incident).toBeNull();
  });

  it('con un valor no-Error usa el mensaje genérico de respaldo', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce('x');

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(GENERIC_ERROR_MESSAGE);
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.incident).toBeNull();
  });

  it('reload tras isNotFound limpia isNotFound y pone isLoading antes de resolver la nueva petición', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce(
      new IncidentNotFoundError('La incidencia solicitada no existe.'),
    );

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isNotFound).toBe(true);
    });

    const pendingReload = createDeferred<FetchIncidentDetailResult>();
    mockedFetchIncidentById.mockReturnValueOnce(pendingReload.promise);

    await act(() => {
      result.current.reload();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(mockedFetchIncidentById).toHaveBeenCalledTimes(2);

    await act(async () => {
      pendingReload.resolve(backendResultFixture);
      await pendingReload.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incident).toEqual(incidentFixture);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('reload tras errorMessage limpia errorMessage y pone isLoading antes de resolver la nueva petición', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce(new Error('Fallo de servidor inesperado.'));

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo de servidor inesperado.');
    });

    const pendingReload = createDeferred<FetchIncidentDetailResult>();
    mockedFetchIncidentById.mockReturnValueOnce(pendingReload.promise);

    await act(() => {
      result.current.reload();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.errorMessage).toBeNull();

    await act(async () => {
      pendingReload.resolve(mockResultFixture);
      await pendingReload.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incident).toEqual(incidentFixture);
    expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
    expect(result.current.errorMessage).toBeNull();
  });

  it('desmontar durante una carga pendiente no produce warnings de setState ni lanza error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingLoad = createDeferred<FetchIncidentDetailResult>();
    mockedFetchIncidentById.mockReturnValueOnce(pendingLoad.promise);

    const { unmount } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await unmount();

    await act(async () => {
      pendingLoad.resolve(backendResultFixture);
      await pendingLoad.promise;
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('desmontar durante una carga que termina en error no produce warnings de setState ni lanza error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingLoad = createDeferred<FetchIncidentDetailResult>();
    mockedFetchIncidentById.mockReturnValueOnce(pendingLoad.promise);

    const { unmount } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));

    await unmount();

    await act(async () => {
      pendingLoad.reject(new Error('Fallo tras desmontar.'));
      await pendingLoad.promise.catch(() => undefined);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('una respuesta antigua tras cambiar el id no pisa el resultado de la petición nueva', async () => {
    const firstLoad = createDeferred<FetchIncidentDetailResult>();
    const secondLoad = createDeferred<FetchIncidentDetailResult>();
    const secondIncident: IncidentDetail = { ...incidentFixture, id: '43', title: 'Farola rota' };
    mockedFetchIncidentById
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = await renderHook(
      ({ id }: { id: string }) => useIncidentDetail(id, BACKEND_TOKEN),
      { initialProps: { id: '42' } },
    );
    await act(() => {
      rerender({ id: '43' });
    });

    await act(async () => {
      secondLoad.resolve({ incident: secondIncident, source: 'backend' });
    });
    await act(async () => {
      firstLoad.resolve(mockResultFixture);
    });

    expect(result.current.incident).toEqual(secondIncident);
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('una respuesta antigua tras reload() no pisa el resultado de la recarga', async () => {
    const firstLoad = createDeferred<FetchIncidentDetailResult>();
    const secondLoad = createDeferred<FetchIncidentDetailResult>();
    const reloadedIncident: IncidentDetail = { ...incidentFixture, title: 'Recargada' };
    mockedFetchIncidentById
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result } = await renderHook(() => useIncidentDetail('42', BACKEND_TOKEN));
    await act(() => {
      result.current.reload();
    });

    await act(async () => {
      secondLoad.resolve({ incident: reloadedIncident, source: 'backend' });
    });
    await act(async () => {
      firstLoad.reject(new Error('Fallo antiguo.'));
    });

    expect(result.current.incident).toEqual(reloadedIncident);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  describe('gestión del token de sesión', () => {
    it('reenvía accessToken y source del token al servicio', async () => {
      mockedFetchIncidentById.mockResolvedValueOnce(mockResultFixture);
      const mockSessionToken: AuthToken = { accessToken: 'token-mock-test', source: 'mock' };

      const { result } = await renderHook(() => useIncidentDetail('42', mockSessionToken));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedFetchIncidentById).toHaveBeenCalledWith('42', {
        accessToken: 'token-mock-test',
        source: 'mock',
      });
    });

    it('sin token no llama a fetchIncidentById, termina sin cargar y expone el mensaje de sesión sin marcar isNotFound', async () => {
      const { result } = await renderHook(() => useIncidentDetail('42', null));

      await flushPendingMicrotasks();

      expect(mockedFetchIncidentById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incident).toBeNull();
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.backendFallbackNotice).toBeNull();
    });

    it('reload() sin token no llama a fetchIncidentById y mantiene el mensaje de sesión', async () => {
      const { result } = await renderHook(() => useIncidentDetail('42', null));

      await act(() => {
        result.current.reload();
      });

      expect(mockedFetchIncidentById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incident).toBeNull();
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
    });

    it('al pasar de token null a uno válido en un rerender carga el detalle sin llamar a reload', async () => {
      mockedFetchIncidentById.mockResolvedValueOnce(backendResultFixture);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useIncidentDetail('42', token),
        { initialProps: { token: null } as TokenProps },
      );

      await flushPendingMicrotasks();
      expect(mockedFetchIncidentById).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);

      await act(() => {
        rerender({ token: BACKEND_TOKEN });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedFetchIncidentById).toHaveBeenCalledTimes(1);
      expect(mockedFetchIncidentById).toHaveBeenCalledWith('42', BACKEND_TOKEN);
      expect(result.current.incident).toEqual(incidentFixture);
      expect(result.current.errorMessage).toBeNull();
    });

    it('cierre de sesión con petición en vuelo: al resolver la petición antigua no vuelve el detalle ni desaparece el mensaje de sesión', async () => {
      const pendingLoad = createDeferred<FetchIncidentDetailResult>();
      mockedFetchIncidentById.mockReturnValueOnce(pendingLoad.promise);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useIncidentDetail('42', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await act(() => {
        rerender({ token: null });
      });

      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);

      await act(async () => {
        pendingLoad.resolve(backendResultFixture);
      });

      expect(result.current.incident).toBeNull();
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.isNotFound).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(mockedFetchIncidentById).toHaveBeenCalledTimes(1);
    });

    it('cierre de sesión con petición en vuelo: al rechazar la petición antigua con not-found no se marca isNotFound ni se pisa el mensaje de sesión', async () => {
      const pendingLoad = createDeferred<FetchIncidentDetailResult>();
      mockedFetchIncidentById.mockReturnValueOnce(pendingLoad.promise);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useIncidentDetail('42', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await act(() => {
        rerender({ token: null });
      });

      await act(async () => {
        pendingLoad.reject(new IncidentNotFoundError('La incidencia solicitada no existe.'));
        await pendingLoad.promise.catch(() => undefined);
      });

      expect(result.current.isNotFound).toBe(false);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.incident).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('un objeto de token nuevo con el mismo accessToken y source no vuelve a cargar', async () => {
      mockedFetchIncidentById.mockResolvedValueOnce(backendResultFixture);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useIncidentDetail('42', token),
        { initialProps: { token: { ...BACKEND_TOKEN } } as TokenProps },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(() => {
        rerender({ token: { accessToken: 'jwt-backend-test', source: 'backend' } });
      });
      await flushPendingMicrotasks();

      expect(mockedFetchIncidentById).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incident).toEqual(incidentFixture);
    });

    it('un cambio de accessToken recarga el detalle con el token nuevo', async () => {
      mockedFetchIncidentById
        .mockResolvedValueOnce(backendResultFixture)
        .mockResolvedValueOnce(mockResultFixture);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useIncidentDetail('42', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const rotatedToken: AuthToken = { accessToken: 'jwt-rotated-test', source: 'backend' };
      await act(() => {
        rerender({ token: rotatedToken });
      });

      await waitFor(() => {
        expect(mockedFetchIncidentById).toHaveBeenCalledTimes(2);
      });

      expect(mockedFetchIncidentById).toHaveBeenLastCalledWith('42', rotatedToken);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
    });
  });
});
