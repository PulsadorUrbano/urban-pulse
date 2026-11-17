import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type RouteErrorFallbackProps = {
  // Error capturado por el límite de error de Expo Router
  error: Error;
  // Vuelve a renderizar la ruta limpiando el estado de error
  retry: () => Promise<void>;
};

// Pantalla de error amigable para fallos inesperados a nivel de ruta
export function RouteErrorFallback({ retry }: RouteErrorFallbackProps) {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center gap-4 px-6">
        <ThemedText type="subtitle" themeColor="error">
          Algo ha salido mal
        </ThemedText>
        <ThemedText themeColor="textSecondary" className="text-center">
          Se ha producido un error inesperado al mostrar esta pantalla. Inténtalo de nuevo.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void retry();
          }}
          className="rounded-full bg-black px-6 py-3 active:opacity-70">
          <ThemedText className="text-white">Reintentar</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}
