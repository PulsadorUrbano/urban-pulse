/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useMapIncidents } from '@/hooks/use-map-incidents';
import { fetchMyMapIncidents } from '@/services/incident.service';
import type { MapIncident } from '@/types/incident-map';
import type { AuthToken } from '@/types/token';

// Se mockea solo `fetchMyMapIncidents`; `QUERY_MISSING_TOKEN_MESSAGE` se conserva real
// para que el hook exponga el mismo mensaje de sesión que la app.
jest.mock('@/services/incident.service', () => {
  const actualService = jest.requireActual<typeof import('@/services/incident.service')>(
    '@/services/incident.service',
  );
  return {
    ...actualService,
    fetchMyMapIncidents: jest.fn(),
  };
});

const mockedFetchMyMapIncidents = jest.mocked(fetchMyMapIncidents);

const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';
const SESSION_ERROR_MESSAGE = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.';
const DEFAULT_LOAD_ERROR_MESSAGE = 'No se pudieron cargar tus incidencias. Inténtalo de nuevo.';

const BACKEND_TOKEN: AuthToken = { accessToken: 'jwt-backend-test', source: 'backend' };

type TokenProps = { token: AuthToken | null };
type CivicIdProps = { civicId: string | null };

const mapIncidentsFixture: MapIncident[] = [
  {
    id: 'inc-1',
    title: 'Bache en calle Mayor',
    status: 'reported',
    category: 'Vía pública',
    categoryId: 'cat-road',
    latitude: 40.4168,
    longitude: -3.7038,
    createdAt: '2026-10-20T10:00:00.000Z',
    images: [],
  },
  {
    id: 'inc-2',
    title: 'Farola fundida',
    status: 'in_progress',
    category: 'Alumbrado',
    categoryId: 'cat-light',
    latitude: 40.4201,
    longitude: -3.7112,
    createdAt: '2026-10-18T08:30:00.000Z',
    images: [],
  },
];

type FetchMyMapIncidentsResolution = Awaited<ReturnType<typeof fetchMyMapIncidents>>;

// Crea una promesa cuya resolución o rechazo controla el test desde fuera.
function createDeferred<T>() {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: unknown) => void = () => undefined;
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

describe('useMapIncidents', () => {
  beforeEach(() => {
    mockedFetchMyMapIncidents.mockReset();
  });

  it('con civicId null no llama a fetchMyMapIncidents, isLoading es false y la lista está vacía', async () => {
    const { result } = await renderHook(() => useMapIncidents(null, BACKEND_TOKEN));

    await flushPendingMicrotasks();

    expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en carga correcta rellena incidents, limpia errorMessage y pone isLoading en false', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);
    expect(mockedFetchMyMapIncidents).toHaveBeenCalledWith('civic-1', {
      accessToken: 'jwt-backend-test',
      source: 'backend',
    });
    expect(result.current.incidents).toEqual(mapIncidentsFixture);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('reenvía accessToken y source del token al servicio', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({ incidents: [], source: 'backend' });
    const mockSessionToken: AuthToken = { accessToken: 'token-mock-test', source: 'mock' };

    const { result } = await renderHook(() => useMapIncidents('civic-1', mockSessionToken));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledWith('civic-1', {
      accessToken: 'token-mock-test',
      source: 'mock',
    });
  });

  it('con source "mock" expone backendFallbackNotice con el mensaje exacto', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'mock',
    });

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backendFallbackNotice).toBe(BACKEND_FALLBACK_NOTICE);
    expect(result.current.incidents).toEqual(mapIncidentsFixture);
  });

  it('con source "backend" deja backendFallbackNotice en null', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en error de recarga rellena errorMessage y conserva las incidencias de la carga exitosa anterior', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockedFetchMyMapIncidents.mockRejectedValueOnce(new Error('Fallo al recargar.'));

    await act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo al recargar.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual(mapIncidentsFixture);
  });

  it('un rechazo que no es Error usa el mensaje genérico de carga', async () => {
    mockedFetchMyMapIncidents.mockRejectedValueOnce('fallo desconocido');

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(DEFAULT_LOAD_ERROR_MESSAGE);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
  });

  it('en error sin carga previa rellena errorMessage y deja incidents vacío', async () => {
    mockedFetchMyMapIncidents.mockRejectedValueOnce(new Error('Sin conexión.'));

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Sin conexión.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
  });

  it('reload() pone isLoading en true, limpia errorMessage y dispara una segunda llamada a fetchMyMapIncidents', async () => {
    mockedFetchMyMapIncidents.mockRejectedValueOnce(new Error('Primer fallo.'));

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Primer fallo.');
    });

    const secondLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents.mockReturnValueOnce(secondLoad.promise);

    await act(() => {
      result.current.reload();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.errorMessage).toBeNull();
    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2);
    expect(mockedFetchMyMapIncidents).toHaveBeenLastCalledWith('civic-1', {
      accessToken: 'jwt-backend-test',
      source: 'backend',
    });

    await act(async () => {
      secondLoad.resolve({ incidents: mapIncidentsFixture, source: 'backend' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incidents).toEqual(mapIncidentsFixture);
  });

  it('cambiar civicId de un string a otro dispara una nueva carga sin llamar a reload', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-1' } as CivicIdProps },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockedFetchMyMapIncidents.mockResolvedValueOnce({ incidents: [], source: 'backend' });

    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    await waitFor(() => {
      expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2);
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenLastCalledWith('civic-2', {
      accessToken: 'jwt-backend-test',
      source: 'backend',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.incidents).toEqual([]);
  });

  it('cambiar civicId vacía la lista mientras carga la nueva identidad', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'mock',
    });

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-1' } as CivicIdProps },
    );

    await waitFor(() => {
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
    });

    const pendingLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents.mockReturnValueOnce(pendingLoad.promise);

    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.incidents).toEqual([]);
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('cambiar civicId con error en la nueva carga deja la lista vacía y expone el error', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-1' } as CivicIdProps },
    );

    await waitFor(() => {
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
    });

    mockedFetchMyMapIncidents.mockRejectedValueOnce(new Error('Fallo de civic-2.'));

    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo de civic-2.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([]);
  });

  it('cambiar civicId de null a un string dispara la carga automáticamente', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: null } as CivicIdProps },
    );

    await flushPendingMicrotasks();

    expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();

    await act(() => {
      rerender({ civicId: 'civic-1' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);
    expect(result.current.incidents).toEqual(mapIncidentsFixture);
  });

  it('al pasar civicId de null a un valor, isLoading es true antes de resolver la petición', async () => {
    const deferredLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents.mockReturnValueOnce(deferredLoad.promise);

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: null } as CivicIdProps },
    );
    await flushPendingMicrotasks();
    expect(result.current.isLoading).toBe(false);

    await act(() => {
      rerender({ civicId: 'civic-1' });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferredLoad.resolve({ incidents: mapIncidentsFixture, source: 'backend' });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual(mapIncidentsFixture);
  });

  it('una respuesta antigua tras cambiar civicId no pisa el resultado de la petición nueva', async () => {
    const firstLoad = createDeferred<FetchMyMapIncidentsResolution>();
    const secondLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-1' } as CivicIdProps },
    );
    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    await act(async () => {
      secondLoad.resolve({ incidents: [mapIncidentsFixture[1]], source: 'backend' });
    });
    await act(async () => {
      firstLoad.resolve({ incidents: mapIncidentsFixture, source: 'mock' });
    });

    expect(result.current.incidents).toEqual([mapIncidentsFixture[1]]);
    expect(result.current.backendFallbackNotice).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('una respuesta antigua con error tras cambiar civicId no pisa el resultado de la petición nueva', async () => {
    const firstLoad = createDeferred<FetchMyMapIncidentsResolution>();
    const secondLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-1' } as CivicIdProps },
    );
    await act(() => {
      rerender({ civicId: 'civic-2' });
    });

    await act(async () => {
      secondLoad.resolve({ incidents: [mapIncidentsFixture[1]], source: 'backend' });
    });
    await act(async () => {
      firstLoad.reject(new Error('Fallo de la petición antigua.'));
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.incidents).toEqual([mapIncidentsFixture[1]]);
  });

  it('una respuesta antigua tras reload() no pisa el resultado de la recarga', async () => {
    const firstLoad = createDeferred<FetchMyMapIncidentsResolution>();
    const secondLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));
    await act(() => {
      result.current.reload();
    });

    await act(async () => {
      secondLoad.resolve({ incidents: [mapIncidentsFixture[1]], source: 'backend' });
    });
    await act(async () => {
      firstLoad.resolve({ incidents: mapIncidentsFixture, source: 'backend' });
    });

    expect(result.current.incidents).toEqual([mapIncidentsFixture[1]]);
    expect(result.current.isLoading).toBe(false);
  });

  it('desmontar antes de que resuelva la petición no lanza error ni produce warnings de setState', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const pendingLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents.mockReturnValueOnce(pendingLoad.promise);

    const { unmount } = await renderHook(() => useMapIncidents('civic-1', BACKEND_TOKEN));

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);

    await unmount();

    await act(async () => {
      pendingLoad.resolve({ incidents: mapIncidentsFixture, source: 'backend' });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  describe('gestión del token de sesión', () => {
    it('sin token no llama a fetchMyMapIncidents, termina sin cargar y expone el mensaje de sesión', async () => {
      const { result } = await renderHook(() => useMapIncidents('civic-1', null));

      await flushPendingMicrotasks();

      expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incidents).toEqual([]);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.backendFallbackNotice).toBeNull();
    });

    it('con civicId null y sin token no expone error de sesión ni llama al servicio', async () => {
      const { result } = await renderHook(() => useMapIncidents(null, null));

      await flushPendingMicrotasks();

      expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.incidents).toEqual([]);
    });

    it('reload() sin token no llama a fetchMyMapIncidents y mantiene el mensaje de sesión', async () => {
      const { result } = await renderHook(() => useMapIncidents('civic-1', null));

      await act(() => {
        result.current.reload();
      });

      expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
    });

    it('al pasar de token null a uno válido en un rerender carga las incidencias sin llamar a reload', async () => {
      mockedFetchMyMapIncidents.mockResolvedValueOnce({
        incidents: mapIncidentsFixture,
        source: 'backend',
      });

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
        { initialProps: { token: null } as TokenProps },
      );

      await flushPendingMicrotasks();
      expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);

      await act(() => {
        rerender({ token: BACKEND_TOKEN });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
      expect(result.current.errorMessage).toBeNull();
    });

    it('cierre de sesión con petición en vuelo: al resolver la petición antigua no vuelven los datos ni desaparece el mensaje de sesión', async () => {
      const pendingLoad = createDeferred<FetchMyMapIncidentsResolution>();
      mockedFetchMyMapIncidents.mockReturnValueOnce(pendingLoad.promise);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await act(() => {
        rerender({ token: null });
      });

      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);

      await act(async () => {
        pendingLoad.resolve({ incidents: mapIncidentsFixture, source: 'backend' });
      });

      expect(result.current.incidents).toEqual([]);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.isLoading).toBe(false);
      expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);
    });

    it('cierre de sesión con petición en vuelo: al rechazar la petición antigua se mantiene el mensaje de sesión', async () => {
      const pendingLoad = createDeferred<FetchMyMapIncidentsResolution>();
      mockedFetchMyMapIncidents.mockReturnValueOnce(pendingLoad.promise);

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await act(() => {
        rerender({ token: null });
      });

      await act(async () => {
        pendingLoad.reject(new Error('Fallo de la petición antigua.'));
      });

      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
      expect(result.current.incidents).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('con source "mock" y luego cierre de sesión, backendFallbackNotice se oculta', async () => {
      mockedFetchMyMapIncidents.mockResolvedValueOnce({
        incidents: mapIncidentsFixture,
        source: 'mock',
      });

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
        { initialProps: { token: BACKEND_TOKEN } as TokenProps },
      );

      await waitFor(() => {
        expect(result.current.backendFallbackNotice).toBe(BACKEND_FALLBACK_NOTICE);
      });

      await act(() => {
        rerender({ token: null });
      });

      expect(result.current.backendFallbackNotice).toBeNull();
      expect(result.current.incidents).toEqual([]);
      expect(result.current.errorMessage).toBe(SESSION_ERROR_MESSAGE);
    });

    it('un objeto de token nuevo con el mismo accessToken y source no vuelve a cargar', async () => {
      mockedFetchMyMapIncidents.mockResolvedValueOnce({
        incidents: mapIncidentsFixture,
        source: 'backend',
      });

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
        { initialProps: { token: { ...BACKEND_TOKEN } } as TokenProps },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(() => {
        rerender({ token: { accessToken: 'jwt-backend-test', source: 'backend' } });
      });
      await flushPendingMicrotasks();

      expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
    });

    it('un cambio de accessToken recarga las incidencias con el token nuevo', async () => {
      mockedFetchMyMapIncidents
        .mockResolvedValueOnce({ incidents: mapIncidentsFixture, source: 'backend' })
        .mockResolvedValueOnce({ incidents: [mapIncidentsFixture[1]], source: 'backend' });

      const { result, rerender } = await renderHook(
        ({ token }: TokenProps) => useMapIncidents('civic-1', token),
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
        expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2);
      });

      expect(mockedFetchMyMapIncidents).toHaveBeenLastCalledWith('civic-1', {
        accessToken: 'jwt-rotated-test',
        source: 'backend',
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.incidents).toEqual([mapIncidentsFixture[1]]);
    });
  });
});

describe('useMapIncidents: cambios de identidad y recuperación', () => {
  beforeEach(() => {
    mockedFetchMyMapIncidents.mockReset();
  });

  it('A → B (falla) → A vuelve a cargar y muestra los datos de A sin error', async () => {
    mockedFetchMyMapIncidents
      .mockResolvedValueOnce({ incidents: mapIncidentsFixture, source: 'backend' })
      .mockRejectedValueOnce(new Error('Fallo de la identidad B.'))
      .mockResolvedValueOnce({ incidents: [mapIncidentsFixture[0]], source: 'backend' });

    const { result, rerender } = await renderHook(
      ({ civicId }: CivicIdProps) => useMapIncidents(civicId, BACKEND_TOKEN),
      { initialProps: { civicId: 'civic-a' } as CivicIdProps },
    );

    await waitFor(() => {
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
    });

    await act(() => {
      rerender({ civicId: 'civic-b' });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Fallo de la identidad B.');
    });
    expect(result.current.incidents).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await act(() => {
      rerender({ civicId: 'civic-a' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(3);
    expect(mockedFetchMyMapIncidents).toHaveBeenLastCalledWith('civic-a', {
      accessToken: 'jwt-backend-test',
      source: 'backend',
    });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.incidents).toEqual([mapIncidentsFixture[0]]);
  });

  it('cambiar solo accessToken vacía la lista mientras carga y no muestra datos del token anterior', async () => {
    mockedFetchMyMapIncidents.mockResolvedValueOnce({
      incidents: mapIncidentsFixture,
      source: 'backend',
    });

    const { result, rerender } = await renderHook(
      ({ token }: TokenProps) => useMapIncidents('civic-1', token),
      { initialProps: { token: BACKEND_TOKEN } as TokenProps },
    );

    await waitFor(() => {
      expect(result.current.incidents).toEqual(mapIncidentsFixture);
    });

    const pendingLoad = createDeferred<FetchMyMapIncidentsResolution>();
    mockedFetchMyMapIncidents.mockReturnValueOnce(pendingLoad.promise);

    const rotatedToken: AuthToken = { accessToken: 'jwt-rotated-test', source: 'backend' };
    await act(() => {
      rerender({ token: rotatedToken });
    });

    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2);
    expect(mockedFetchMyMapIncidents).toHaveBeenLastCalledWith('civic-1', {
      accessToken: 'jwt-rotated-test',
      source: 'backend',
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.incidents).toEqual([]);

    await act(async () => {
      pendingLoad.resolve({ incidents: [mapIncidentsFixture[1]], source: 'backend' });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.incidents).toEqual([mapIncidentsFixture[1]]);
  });
});
