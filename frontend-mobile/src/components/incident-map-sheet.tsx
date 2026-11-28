import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncidentPhotoViewer } from '@/components/incident-photo-viewer';
import { IncidentStatusBadge } from '@/components/incident-status-badge';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { MapIncident } from '@/types/incident-map';

export interface IncidentMapSheetProps {
  incident: MapIncident | null;
  onClose: () => void;
  // Separación inferior opcional (p. ej. la altura de la tab bar).
  bottomOffset?: number;
}

// Bottom sheet absoluto sobre el mapa con el resumen de la incidencia seleccionada.
export function IncidentMapSheet({ incident, onClose, bottomOffset = 0 }: IncidentMapSheetProps) {
  const insets = useSafeAreaInsets();

  if (incident === null) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      style={[styles.container, { bottom: bottomOffset }]}
      testID="incident-map-sheet">
      <ThemedView
        type="backgroundElement"
        className="gap-3 rounded-t-3xl px-4 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <ThemedText type="smallBold">{incident.title}</ThemedText>
            <IncidentStatusBadge status={incident.status} />
            <ThemedText type="small" themeColor="textSecondary">
              {incident.category ?? 'Sin categoría'}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onClose}
            hitSlop={12}
            className="active:opacity-70">
            <ThemedText type="smallBold">✕</ThemedText>
          </Pressable>
        </View>

        {incident.images.length > 0 ? (
          <IncidentPhotoViewer images={incident.images} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Sin fotos
          </ThemedText>
        )}

        <PrimaryButton
          label="Ver detalle"
          onPress={() => router.push(`/incidents/${incident.id}`)}
        />
      </ThemedView>
    </Animated.View>
  );
}

// Animated.View de reanimated no está registrado en css-interop, por lo que se
// posiciona con StyleSheet en lugar de `className`.
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
