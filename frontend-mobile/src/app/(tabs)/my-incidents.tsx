import { Redirect, router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentListItem } from '@/components/incident-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { useMyIncidents } from '@/hooks/use-my-incidents';
import { useSession } from '@/hooks/use-session';
import type { IncidentSummary } from '@/types/incident';

export default function MyIncidentsScreen() {
  // Los hooks se llaman siempre antes de cualquier return condicional, igual
  // que en HomeScreen: el guard de sesión de abajo no puede saltarse esto.
  const { user, isRestoringSession } = useSession();
  const { incidents, isLoading, errorMessage, backendFallbackNotice, reload } = useMyIncidents(
    user?.id ?? null,
  );

  // Sin sesión activa (y ya resuelta) la tab nunca es alcanzable: mismo guard
  // que ya usa HomeScreen.
  if (!isRestoringSession && !user) {
    return <Redirect href="/login" />;
  }

  // Navega al detalle de la incidencia pulsada; la lista no construye la URL
  // ella misma, delega en el handler de la pantalla.
  const handlePressIncident = (id: string) => {
    router.push(`/incidents/${id}`);
  };

  const renderIncidentItem = ({ item }: { item: IncidentSummary }) => (
    <IncidentListItem incident={item} onPress={handlePressIncident} />
  );

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="flex-1 w-full" style={{ maxWidth: MaxContentWidth }}>
        <ThemedView className="flex-1 gap-4 px-6 pt-6">
          <ThemedText type="subtitle">Mis incidencias</ThemedText>

          {backendFallbackNotice ? (
            <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
              <Text className="text-center text-sm font-medium text-[#d92d20]">
                {backendFallbackNotice}
              </Text>
            </ThemedView>
          ) : null}

          {isLoading && incidents.length === 0 ? (
            <ThemedView className="flex-1 items-center justify-center">
              <ActivityIndicator />
            </ThemedView>
          ) : errorMessage ? (
            <ThemedView className="flex-1 items-center justify-center gap-4">
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
                  className="items-center justify-center rounded-3xl px-6 py-3">
                  <ThemedText type="smallBold">Reintentar</ThemedText>
                </ThemedView>
              </Pressable>
            </ThemedView>
          ) : incidents.length === 0 ? (
            <ThemedView className="flex-1 items-center justify-center">
              <ThemedText themeColor="textSecondary" className="text-center">
                Todavía no has registrado ninguna incidencia.
              </ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              data={incidents}
              keyExtractor={(incident) => incident.id}
              renderItem={renderIncidentItem}
              contentContainerClassName="gap-3 pb-6"
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}
