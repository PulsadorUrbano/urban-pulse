/// <reference types="jest" />
import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockedUseColorScheme = jest.mocked(useColorScheme);

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve Colors.light cuando el esquema de color es "light"', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.light);
  });

  it('devuelve Colors.dark cuando el esquema de color es "dark"', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.dark);
  });

  it('incluye el token "error" con el valor correcto en modo claro', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    const { result } = await renderHook(() => useTheme());

    expect(result.current.error).toBe(Colors.light.error);
  });

  it('incluye el token "error" con el valor correcto en modo oscuro', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useTheme());

    expect(result.current.error).toBe(Colors.dark.error);
  });

  it('usa "light" por defecto cuando el esquema de color es null', async () => {
    mockedUseColorScheme.mockReturnValue(null);

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.light);
  });

  it('usa "light" por defecto cuando el esquema de color es undefined', async () => {
    // El tipo de useColorScheme no incluye `undefined`, pero el hook lo contempla
    // igualmente mediante `??`; se fuerza el valor para cubrir esa rama defensiva.
    mockedUseColorScheme.mockReturnValue(undefined as unknown as ReturnType<typeof useColorScheme>);

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toEqual(Colors.light);
  });
});
