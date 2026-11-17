import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Suscripción vacía: el valor solo cambia entre el render de servidor y el de cliente.
const subscribe = () => () => {};

/**
 * Para soportar el renderizado estático, este valor debe recalcularse en el lado del cliente para web
 */
export function useColorScheme() {
  // `false` durante el render estático (servidor) y `true` ya en el cliente.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
