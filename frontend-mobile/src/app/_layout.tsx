import '@/global.css';

import { DarkTheme, DefaultTheme, enableLegacyHeaderAppearance, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { SessionProvider } from '@/hooks/use-session';

// Expo Router define la ruta inicial del navegador con unstable_settings (no con una prop del Stack)
export const unstable_settings = { initialRouteName: 'login' };

// En Expo Router 58, en iOS 26+ con Liquid Glass disponible, el header nativo
// del Stack pasa a ser translúcido y posicionado de forma absoluta por defecto,
// solapando el contenido de la pantalla en vez de empujarlo hacia abajo. Esto
// restaura el header opaco clásico (contenido renderizado debajo del header),
// que es el comportamiento que ya asumían `incidents/new.tsx` e
// `incidents/[id].tsx` (ver docs/spec/bugs/general/24-10-26-ui-desplazada-hacia-arriba.md).
enableLegacyHeaderAppearance();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SessionProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="incidents/new" options={{ title: 'Registrar incidencia' }} />
        <Stack.Screen name="incidents/[id]" options={{ title: 'Detalle de la incidencia' }} />
      </Stack>
    </ThemeProvider>
    </SessionProvider>
  );
}
