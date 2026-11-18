/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCategories } from '@/hooks/use-categories';
import { fetchCategories } from '@/services/category.service';
import type { Category, FetchCategoriesResult } from '@/types/category';

jest.mock('@/services/category.service', () => ({
  fetchCategories: jest.fn(),
}));

const mockedFetchCategories = jest.mocked(fetchCategories);

const categoriesFixture: Category[] = [
  { id: '1', name: 'Vías' },
  { id: '2', name: 'Alumbrado' },
];

const backendFailureMessage = 'No se pudo conectar con el backend.';

describe('useCategories', () => {
  beforeEach(() => {
    mockedFetchCategories.mockReset();
  });

  it('en éxito con source "backend" rellena categories, limpia errorMessage y backendFallbackNotice queda en null', async () => {
    const backendResult: FetchCategoriesResult = {
      categories: categoriesFixture,
      source: 'backend',
      backendErrorMessage: null,
    };
    mockedFetchCategories.mockResolvedValueOnce(backendResult);

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual(categoriesFixture);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('en éxito con source "mock" rellena categories sin bloquear y compone backendFallbackNotice con el motivo del backend', async () => {
    const mockResult: FetchCategoriesResult = {
      categories: categoriesFixture,
      source: 'mock',
      backendErrorMessage: backendFailureMessage,
    };
    mockedFetchCategories.mockResolvedValueOnce(mockResult);

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual(categoriesFixture);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).not.toBeNull();
    expect(result.current.backendFallbackNotice).toBe(
      `${backendFailureMessage} Mostrando el catálogo de categorías guardado en el mock.`,
    );
  });

  it('en fallo total rellena errorMessage con el mensaje del error, deja categories vacío y backendFallbackNotice en null', async () => {
    mockedFetchCategories.mockRejectedValueOnce(
      new Error('No se pudieron cargar las categorías.'),
    );

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('No se pudieron cargar las categorías.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.categories).toEqual([]);
    expect(result.current.backendFallbackNotice).toBeNull();
  });

  it('reload() limpia errorMessage y backendFallbackNotice y pone isLoading en true antes de resolver la nueva carga', async () => {
    const mockResult: FetchCategoriesResult = {
      categories: categoriesFixture,
      source: 'mock',
      backendErrorMessage: backendFailureMessage,
    };
    let resolveReloadedFetch: (value: FetchCategoriesResult) => void = () => undefined;

    mockedFetchCategories.mockResolvedValueOnce(mockResult);

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.backendFallbackNotice).not.toBeNull();

    mockedFetchCategories.mockImplementationOnce(
      () =>
        new Promise<FetchCategoriesResult>((resolve) => {
          resolveReloadedFetch = resolve;
        }),
    );

    await act(async () => {
      result.current.reload();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.backendFallbackNotice).toBeNull();
    expect(mockedFetchCategories).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveReloadedFetch(mockResult);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.backendFallbackNotice).toBe(
      `${backendFailureMessage} Mostrando el catálogo de categorías guardado en el mock.`,
    );
  });

  it('una respuesta antigua tras reload() no pisa el resultado de la recarga', async () => {
    let resolveFirst: (value: FetchCategoriesResult) => void = () => undefined;
    const firstLoad = new Promise<FetchCategoriesResult>((resolve) => {
      resolveFirst = resolve;
    });
    mockedFetchCategories
      .mockReturnValueOnce(firstLoad)
      .mockResolvedValueOnce({ categories: [categoriesFixture[1]], source: 'backend', backendErrorMessage: null });

    const { result } = await renderHook(() => useCategories());
    await act(() => {
      result.current.reload();
    });
    await waitFor(() => {
      expect(result.current.categories).toEqual([categoriesFixture[1]]);
    });

    await act(async () => {
      resolveFirst({ categories: categoriesFixture, source: 'backend', backendErrorMessage: null });
    });

    expect(result.current.categories).toEqual([categoriesFixture[1]]);
  });
});
