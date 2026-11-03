import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentPhotoViewer } from '@/components/incident-photo-viewer';
import { IncidentStatusBadge } from '@/components/incident-status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useIncidentDetail } from '@/hooks/use-incident-detail';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { incident, isLoading, errorMessage, isNotFound, backendFallbackNotice, reload } =
    useIncidentDetail(id);

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="flex-1 w-full" edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerClassName="gap-6 px-6 pt-6">
          {/* Aviso de fallback a mock: siempre visible cuando aplica, sin
              importar el resto del estado (carga, error, contenido). */}
          {backendFallbackNotice ? (
            <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
              <Text className="text-center text-sm font-medium text-[#d92d20]">
                {backendFallbackNotice}
              </Text>
            </ThemedView>
          ) : null}

          {/* Cargando: solo mientras todavía no hay ninguna incidencia resuelta. */}
          {isLoading && !incident ? (
            <ThemedView className="items-center justify-center py-10">
              <ActivityIndicator />
            </ThemedView>
          ) : null}

          {/* No encontrado (404 real o del mock): estado explícito, sin reintento,
              solo ofrece volver a la pantalla anterior. */}
          {isNotFound ? (
            <ThemedView className="items-center gap-4 py-10">
              <ThemedText className="text-center" themeColor="textSecondary">
                Esta incidencia no existe o ya no está disponible.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={() => router.back()}
                className="active:opacity-70 rounded-3xl">
                <ThemedView
                  type="backgroundElement"
                  className="items-center justify-center rounded-3xl px-6 py-4">
                  <ThemedText type="smallBold">Volver</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          ) : null}

          {/* Error genérico (conexión o respuesta no-404): ofrece reintentar. */}
          {errorMessage && !isNotFound ? (
            <ThemedView className="items-center gap-4 py-10">
              <Text className="text-center text-sm font-medium text-[#d92d20]">
                {errorMessage}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
                onPress={reload}
                className="active:opacity-70 rounded-3xl">
                <ThemedView
                  type="backgroundElement"
                  className="items-center justify-center rounded-3xl px-6 py-4">
                  <ThemedText type="smallBold">Reintentar</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          ) : null}

          {/* Contenido completo de la incidencia, una vez resuelta. */}
          {incident ? (
            <ThemedView className="gap-4">
              <IncidentPhotoViewer images={incident.images} />

              <ThemedText type="subtitle">{incident.title}</ThemedText>

              <IncidentStatusBadge status={incident.status} />

              <ThemedView className="gap-1">
                <ThemedText type="smallBold">Categoría</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {incident.category ?? 'Sin categoría'}
                </ThemedText>
              </ThemedView>

              <ThemedView className="gap-1">
                <ThemedText type="smallBold">Descripción</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {incident.description ?? 'Sin descripción'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
