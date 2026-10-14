/// <reference types="jest" />
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCategories } from '@/hooks/use-categories';
import { fetchCategories } from '@/services/category.service';
import type { Category } from '@/types/category';

jest.mock('@/services/category.service', () => ({
  fetchCategories: jest.fn(),
}));

const mockedFetchCategories = fetchCategories as jest.MockedFunction<typeof fetchCategories>;

const categoriesFixture: Category[] = [
  { id: '1', name: 'Vías' },
  { id: '2', name: 'Alumbrado' },
];

describe('useCategories', () => {
  beforeEach(() => {
    mockedFetchCategories.mockReset();
  });

  it('en éxito rellena categories, pone isLoading en false y limpia errorMessage', async () => {
    mockedFetchCategories.mockResolvedValueOnce(categoriesFixture);

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.categories).toEqual(categoriesFixture);
    expect(result.current.errorMessage).toBeNull();
  });

  it('en error rellena errorMessage y deja isLoading en false', async () => {
    mockedFetchCategories.mockRejectedValueOnce(
      new Error('No se pudieron cargar las categorías.'),
    );

    const { result } = await renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('No se pudieron cargar las categorías.');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.categories).toEqual([]);
  });
});
