import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentMap } from '@/components/incident-map';
import { IncidentMapFilterBar } from '@/components/incident-map-filter-bar';
import { IncidentMapSheet } from '@/components/incident-map-sheet';
import { LocateMeButton } from '@/components/locate-me-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useIncidentMapFilters } from '@/hooks/use-incident-map-filters';
import { useMapIncidents } from '@/hooks/use-map-incidents';
import { useSession } from '@/hooks/use-session';
import type { MapIncident } from '@/types/incident-map';
import type { LocationCoordinates } from '@/types/location';

// Separación entre los controles flotantes y la tab bar.
const FLOATING_MARGIN = 16;

export default function MapScreen() {
  // Los hooks se llaman siempre antes de cualquier return condicional.
  const { user, token, isRestoringSession } = useSession();
  const { incidents, isLoading, errorMessage, backendFallbackNotice, reload } = useMapIncidents(
    user?.civicId ?? null,
    token,
  );
  const { categories } = useCategories();
  const { age, categoryIds, setAge, toggleCategory, clearCategories, filteredIncidents } =
    useIncidentMapFilters(incidents);

  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<LocationCoordinates | null>(null);

  // Si los filtros (o una recarga) dejan fuera la incidencia seleccionada, se
  // cierra el sheet. Ajuste de estado durante el render, permitido por React.
  if (
    selectedIncident !== null &&
    !filteredIncidents.some((incident) => incident.id === selectedIncident.id)
  ) {
    setSelectedIncident(null);
  }

  // Mismo guard de sesión que HomeScreen y MyIncidentsScreen.
  if (!isRestoringSession && !user) {
    return <Redirect href="/login" />;
  }

  const isMapEmpty = !isLoading && !errorMessage && filteredIncidents.length === 0;

  return (
    <View className="flex-1">
      <IncidentMap
        incidents={filteredIncidents}
        onSelectIncident={setSelectedIncident}
        focusCoordinates={focusCoordinates}
      />

      {/* Capa superior: `box-none` deja pasar los toques al mapa fuera de los controles. */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" className="absolute inset-x-0 top-0">
        <View pointerEvents="box-none" className="gap-2 pt-2">
          <IncidentMapFilterBar
            age={age}
            onAgeChange={setAge}
            categories={categories}
            selectedCategoryIds={categoryIds}
            onToggleCategory={toggleCategory}
            onClearCategories={clearCategories}
          />

          {backendFallbackNotice ? (
            <ThemedView type="backgroundElement" className="mx-4 rounded-2xl px-4 py-2">
              <ThemedText type="small" themeColor="error" className="text-center">
                {backendFallbackNotice}
              </ThemedText>
            </ThemedView>
          ) : null}

          {errorMessage ? (
            <ThemedView type="backgroundElement" className="mx-4 gap-2 rounded-2xl px-4 py-3">
              <ThemedText type="small" themeColor="error" className="text-center">
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reintentar"
                onPress={reload}
                className="items-center rounded-full py-2 active:opacity-70">
                <ThemedText type="smallBold">Reintentar</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {isLoading ? (
            <View pointerEvents="none" className="items-center" testID="map-loading">
              <ThemedView type="backgroundElement" className="rounded-full p-2">
                <ActivityIndicator />
              </ThemedView>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {isMapEmpty ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-1/2 items-center px-6"
          testID="map-empty-state">
          <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-3">
            <ThemedText type="small" themeColor="textSecondary" className="text-center">
              No tienes incidencias activas en el mapa
            </ThemedText>
          </ThemedView>
        </View>
      ) : null}

      {/* Con el sheet abierto el botón quedaría tapado, así que se oculta. */}
      {selectedIncident === null ? (
        <View
          className="absolute right-4"
          style={{ bottom: BottomTabInset + FLOATING_MARGIN }}>
          <LocateMeButton onLocate={setFocusCoordinates} />
        </View>
      ) : null}

      <IncidentMapSheet
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        bottomOffset={BottomTabInset}
      />
    </View>
  );
}
