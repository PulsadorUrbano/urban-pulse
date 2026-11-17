/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useLocationPreference } from '@/hooks/use-location-preference';

// ---------------------------------------------------------------------------
// Test unitario del hook de preferencia de ubicación. El hook no persiste
// nada en almacenamiento (ni AsyncStorage ni otro mecanismo): vive solo en
// memoria mediante `useState`, por lo que no hay nada que mockear.
// ---------------------------------------------------------------------------

describe('useLocationPreference', () => {
  it('por defecto empieza con la ubicación activada cuando no se pasa ningún argumento', async () => {
    const { result } = await renderHook(() => useLocationPreference());

    expect(result.current.isLocationEnabled).toBe(true);
  });

  it('respeta el valor inicial explícito pasado por parámetro', async () => {
    const { result } = await renderHook(() => useLocationPreference(false));

    expect(result.current.isLocationEnabled).toBe(false);
  });

  it('toggleLocation invierte el valor de isLocationEnabled', async () => {
    const { result } = await renderHook(() => useLocationPreference(true));

    await act(async () => {
      result.current.toggleLocation();
    });

    expect(result.current.isLocationEnabled).toBe(false);
  });

  it('toggleLocation aplicado dos veces vuelve al valor original', async () => {
    const { result } = await renderHook(() => useLocationPreference(true));

    await act(async () => {
      result.current.toggleLocation();
    });
    await act(async () => {
      result.current.toggleLocation();
    });

    expect(result.current.isLocationEnabled).toBe(true);
  });

  it('funciona igual partiendo de un valor inicial en false', async () => {
    const { result } = await renderHook(() => useLocationPreference(false));

    await act(async () => {
      result.current.toggleLocation();
    });

    expect(result.current.isLocationEnabled).toBe(true);
  });

  it('expone la misma referencia de toggleLocation entre renders (useCallback memoizado)', async () => {
    const { result, rerender } = await renderHook(
      ({ initialEnabled }: { initialEnabled: boolean }) => useLocationPreference(initialEnabled),
      { initialProps: { initialEnabled: true } },
    );
    const firstToggleReference = result.current.toggleLocation;

    await rerender({ initialEnabled: true });

    expect(result.current.toggleLocation).toBe(firstToggleReference);
  });

  it('cambios posteriores en el argumento initialEnabled no afectan al estado ya montado', async () => {
    // `useState(initialEnabled)` solo usa el valor inicial en el primer render;
    // re-renderizar con un `initialEnabled` distinto no debe resetear el estado.
    const { result, rerender } = await renderHook(
      ({ initialEnabled }: { initialEnabled: boolean }) => useLocationPreference(initialEnabled),
      { initialProps: { initialEnabled: true } },
    );

    await act(async () => {
      result.current.toggleLocation();
    });
    expect(result.current.isLocationEnabled).toBe(false);

    await rerender({ initialEnabled: false });

    expect(result.current.isLocationEnabled).toBe(false);
  });
});
