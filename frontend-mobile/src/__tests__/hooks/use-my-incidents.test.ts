/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useMyIncidents } from '@/hooks/use-my-incidents';
import { fetchMyIncidents } from '@/services/incident.service';
import type { IncidentSummary } from '@/types/incident';

jest.mock('@/services/incident.service', () => ({
  fetchMyIncidents: jest.fn(),
}));

const mockedFetchMyIncidents = fetchMyIncidents as jest.MockedFunction<typeof fetchMyIncidents>;

const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';

const incidentsFixture: IncidentSummary[] = [
  { id: 'inc-1', title: 'Bache en calle Mayor', status: 'reported', createdAt: '2026-10-20T10:00:00.000Z' },
  { id: 'inc-2', title: 'Farola fundida', status: 'resolved', createdAt: '2026-10-18T08:30:00.000Z' },
];

type FetchMyIncidentsResolution = Awaited<ReturnType<typeof fetchMyIncidents>>;

// Crea una promesa cuya resolución o rechazo controla el test desde fuera.
function createDeferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

// Vacía los microtasks pendientes dentro de act para que los setState se apliquen.
async function flushPendingMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useMyIncidents', () => {
  beforeEach(() => {
    mockedFetchMyIncidents.mockReset();
  });

  it('con civicId null no llama a fetchMyIncidents y termina con isLoading false e incidents vacío', async () => {
    const { result } = await renderHook(() => useMyIncidents(null));

    await flushPendingMicrotasks();

    expect(mockedFetchMyIncidents).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en carga correcta rellena incidents, limpia errorMessage y pone isLoading en false', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'backend' });

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(1);
    expect(mockedFetchMyIncidents).toHaveBeenCalledWith('civic-1');
    expect(result.current.incidents).toEqual(incidentsFixture);
    expect(result.current.errorMessage).toBeNull();
  });

  it('con source "mock" expone backendFallbackNotice con el mensaje exacto', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'mock' });

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backendFallbackNotice).toBe(BACKEND_FALLBACK_NOTICE);
    expect(result.current.incidents).toEqual(incidentsFixture);
  });

  it('con source "backend" deja backendFallbackNotice en null', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'backend' });

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en error de recarga rellena errorMessage y conserva las incidencias de la carga exitosa anterior', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'backend' });

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockedFetchMyIncidents.mockRejectedValueOnce(new Error('Fallo al recargar.'));

    await act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo al recargar.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual(incidentsFixture);
  });

  it('en error sin carga previa rellena errorMessage y deja incidents vacío', async () => {
    mockedFetchMyIncidents.mockRejectedValueOnce(new Error('Sin conexión.'));

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Sin conexión.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
  });

  it('reload() pone isLoading en true, limpia errorMessage y dispara una segunda llamada a fetchMyIncidents', async () => {
    mockedFetchMyIncidents.mockRejectedValueOnce(new Error('Primer fallo.'));

    const { result } = await renderHook(() => useMyIncidents('civic-1'));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Primer fallo.');
    });

    const secondLoad = createDeferred<FetchMyIncidentsResolution>();
    mockedFetchMyIncidents.mockReturnValueOnce(secondLoad.promise);

    await act(() => {
      result.current.reload();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.errorMessage).toBeNull();
    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(2);
    expect(mockedFetchMyIncidents).toHaveBeenLastCalledWith('civic-1');

    await act(async () => {
      secondLoad.resolve({ incidents: incidentsFixture, source: 'backend' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incidents).toEqual(incidentsFixture);
  });

  it('cambiar civicId de un string a otro dispara una nueva carga sin llamar a reload', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'backend' });

    const { result, rerender } = await renderHook(
      ({ civicId }: { civicId: string | null }) => useMyIncidents(civicId),
      { initialProps: { civicId: 'civic-1' as string | null } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: [], source: 'backend' });

    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    await waitFor(() => {
      expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(2);
    });

    expect(mockedFetchMyIncidents).toHaveBeenLastCalledWith('civic-2');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incidents).toEqual([]);
  });

  it('cambiar civicId de null a un string dispara la carga automáticamente', async () => {
    mockedFetchMyIncidents.mockResolvedValueOnce({ incidents: incidentsFixture, source: 'backend' });

    const { result, rerender } = await renderHook(
      ({ civicId }: { civicId: string | null }) => useMyIncidents(civicId),
      { initialProps: { civicId: null as string | null } },
    );

    await flushPendingMicrotasks();

    expect(mockedFetchMyIncidents).not.toHaveBeenCalled();

    await act(() => {
      rerender({ civicId: 'civic-1' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(1);
    expect(mockedFetchMyIncidents).toHaveBeenCalledWith('civic-1');
    expect(result.current.incidents).toEqual(incidentsFixture);
  });

  it('desmontar antes de que resuelva la promesa no lanza error ni produce warnings de setState', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingLoad = createDeferred<FetchMyIncidentsResolution>();
    mockedFetchMyIncidents.mockReturnValueOnce(pendingLoad.promise);

    const { unmount } = await renderHook(() => useMyIncidents('civic-1'));

    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(1);

    await unmount();

    await act(async () => {
      pendingLoad.resolve({ incidents: incidentsFixture, source: 'backend' });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('desmontar antes de que rechace la promesa no lanza error ni produce warnings de setState', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingLoad = createDeferred<FetchMyIncidentsResolution>();
    mockedFetchMyIncidents.mockReturnValueOnce(pendingLoad.promise);

    const { unmount } = await renderHook(() => useMyIncidents('civic-1'));

    await unmount();

    await act(async () => {
      pendingLoad.reject(new Error('Fallo tras desmontar.'));
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
