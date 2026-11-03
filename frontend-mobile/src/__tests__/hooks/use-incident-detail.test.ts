/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useIncidentDetail } from '@/hooks/use-incident-detail';
import { IncidentNotFoundError, fetchIncidentById } from '@/services/incident.service';
import type { FetchIncidentDetailResult, IncidentDetail } from '@/types/incident';

// Se mockea solo `fetchIncidentById`; `IncidentNotFoundError` se conserva real
// para que el `instanceof` del hook se evalúe contra la misma clase.
jest.mock('@/services/incident.service', () => {
  const actualService = jest.requireActual<typeof import('@/services/incident.service')>(
    '@/services/incident.service',
  );
  return {
    ...actualService,
    fetchIncidentById: jest.fn(),
  };
});

const mockedFetchIncidentById = fetchIncidentById as jest.MockedFunction<
  typeof fetchIncidentById
>;

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

const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, mostrando los datos del mock.';
const GENERIC_ERROR_MESSAGE = 'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.';

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

describe('useIncidentDetail', () => {
  beforeEach(() => {
    mockedFetchIncidentById.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('en carga desde backend rellena incident y deja las banderas de error y aviso limpias', async () => {
    mockedFetchIncidentById.mockResolvedValueOnce(backendResultFixture);

    const { result } = await renderHook(() => useIncidentDetail('42'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchIncidentById).toHaveBeenCalledWith('42');
    expect(result.current.incident).toEqual(incidentFixture);
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en carga desde mock rellena incident y expone el aviso de fallback exacto', async () => {
    mockedFetchIncidentById.mockResolvedValueOnce(mockResultFixture);

    const { result } = await renderHook(() => useIncidentDetail('42'));

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

    const { result } = await renderHook(() => useIncidentDetail('999'));

    await waitFor(() => {
      expect(result.current.isNotFound).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.incident).toBeNull();
  });

  it('con un Error genérico expone su mensaje en errorMessage, isNotFound false e incident null', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce(new Error('Fallo de servidor inesperado.'));

    const { result } = await renderHook(() => useIncidentDetail('42'));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo de servidor inesperado.');
    });

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.incident).toBeNull();
  });

  it('con un valor no-Error usa el mensaje genérico de respaldo', async () => {
    mockedFetchIncidentById.mockRejectedValueOnce('x');

    const { result } = await renderHook(() => useIncidentDetail('42'));

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

    const { result } = await renderHook(() => useIncidentDetail('42'));

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

    const { result } = await renderHook(() => useIncidentDetail('42'));

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

    const { unmount } = await renderHook(() => useIncidentDetail('42'));

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

    const { unmount } = await renderHook(() => useIncidentDetail('42'));

    await unmount();

    await act(async () => {
      pendingLoad.reject(new Error('Fallo tras desmontar.'));
      await pendingLoad.promise.catch(() => undefined);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
