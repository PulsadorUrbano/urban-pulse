import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { SessionProvider } from '@/hooks/use-session';

// Expo Router define la ruta inicial del navegador con unstable_settings (no con una prop del Stack)
export const unstable_settings = { initialRouteName: 'login' };

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
