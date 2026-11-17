/// <reference types="jest" />
import { renderHook } from '@testing-library/react-native';
import { useSyncExternalStore } from 'react';
import * as ReactNative from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme.web';

// ---------------------------------------------------------------------------
// Test de la variante web: `use-color-scheme.web.ts` usa `useSyncExternalStore`
// para distinguir el render estático (servidor), donde devuelve `'light'` de
// forma fija, del render ya hidratado en el cliente, donde devuelve el valor
// real de `react-native`.
//
// Se mockea el módulo `react` completo (necesario para interceptar
// `useSyncExternalStore`: espiarlo con `jest.spyOn` sobre el namespace no
// intercepta las llamadas, porque el bundler resuelve la referencia en el
// momento de importar). En cambio, para `react-native` se usa `jest.spyOn`
// sobre el namespace, que sí funciona y evita romper el auto-mock de
// componentes nativos que usa NativeWind (mockear `react-native` completo con
// `jest.mock` provoca ese fallo).
// ---------------------------------------------------------------------------

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useSyncExternalStore: jest.fn(),
  };
});

const mockedUseSyncExternalStore = jest.mocked(useSyncExternalStore);

describe('useColorScheme (variante web)', () => {
  let useColorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedUseSyncExternalStore.mockReset();
    useColorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
  });

  afterEach(() => {
    useColorSchemeSpy.mockRestore();
  });

  describe('antes de hidratar (render estático)', () => {
    it('devuelve "light" fijo, ignorando el esquema real del sistema', async () => {
      mockedUseSyncExternalStore.mockReturnValue(false);

      const { result } = await renderHook(() => useColorScheme());

      expect(result.current).toBe('light');
      // El hook siempre consulta el esquema real ("dark"), pero devuelve "light" mientras no haya hidratado.
      expect(useColorSchemeSpy).toHaveBeenCalled();
    });
  });

  describe('tras hidratar (cliente)', () => {
    it('devuelve el valor real que informa react-native', async () => {
      mockedUseSyncExternalStore.mockReturnValue(true);

      const { result } = await renderHook(() => useColorScheme());

      expect(result.current).toBe('dark');
    });

    it('propaga null cuando react-native no informa de esquema', async () => {
      mockedUseSyncExternalStore.mockReturnValue(true);
      useColorSchemeSpy.mockReturnValue(null);

      const { result } = await renderHook(() => useColorScheme());

      expect(result.current).toBeNull();
    });

    it('propaga "light" cuando react-native lo devuelve explícitamente (no por el valor fijo pre-hidratación)', async () => {
      mockedUseSyncExternalStore.mockReturnValue(true);
      useColorSchemeSpy.mockReturnValue('light');

      const { result } = await renderHook(() => useColorScheme());

      expect(result.current).toBe('light');
      expect(useColorSchemeSpy).toHaveBeenCalled();
    });
  });

  it('llama a useSyncExternalStore con getSnapshot=true y getServerSnapshot=false', async () => {
    mockedUseSyncExternalStore.mockReturnValue(true);

    await renderHook(() => useColorScheme());

    const [, getSnapshot, getServerSnapshot] = mockedUseSyncExternalStore.mock.calls[0];
    expect(getSnapshot()).toBe(true);
    expect(getServerSnapshot?.()).toBe(false);
  });

  it('la función subscribe no se suscribe a nada y su limpieza no lanza', async () => {
    mockedUseSyncExternalStore.mockReturnValue(true);

    await renderHook(() => useColorScheme());

    const [subscribe] = mockedUseSyncExternalStore.mock.calls[0];
    const unsubscribe = subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});
