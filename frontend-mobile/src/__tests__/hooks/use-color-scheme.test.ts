/// <reference types="jest" />
import { renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Test del barrel nativo: `use-color-scheme.ts` únicamente re-exporta
// `useColorScheme` de `react-native` sin ninguna lógica propia. Se espía el
// `useColorScheme` de `react-native` (en lugar de mockear el módulo completo,
// que rompe el auto-mock de componentes nativos que usa NativeWind) para
// comprobar que el valor que este devuelve se propaga sin transformarse.
// ---------------------------------------------------------------------------

describe('useColorScheme (barrel nativo)', () => {
  it('es la misma referencia de función que react-native exporta', () => {
    expect(useColorScheme).toBe(ReactNative.useColorScheme);
  });

  it('propaga "dark" cuando react-native lo devuelve', async () => {
    const spy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { result } = await renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('propaga "light" cuando react-native lo devuelve', async () => {
    const spy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { result } = await renderHook(() => useColorScheme());

    expect(result.current).toBe('light');

    spy.mockRestore();
  });

  it('propaga null cuando el módulo nativo de Appearance no está disponible', async () => {
    const spy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(null);

    const { result } = await renderHook(() => useColorScheme());

    expect(result.current).toBeNull();

    spy.mockRestore();
  });
});
