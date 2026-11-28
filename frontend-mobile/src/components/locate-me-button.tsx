import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import type { LocationCoordinates } from '@/types/location';

export interface LocateMeButtonProps {
  onLocate: (coords: LocationCoordinates) => void;
}

// Botón flotante que centra el mapa en la ubicación del dispositivo.
export function LocateMeButton({ onLocate }: LocateMeButtonProps) {
  const theme = useTheme();
  const [isLocating, setIsLocating] = useState(false);

  const handlePress = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Ubicación', 'Permiso de ubicación denegado. Actívalo en los ajustes.');
        return;
      }
      const servicesEnabled = await areLocationServicesEnabled();
      if (!servicesEnabled) {
        Alert.alert('Ubicación', 'Los servicios de ubicación están desactivados.');
        return;
      }
      const coordinates = await getCurrentCoordinates();
      if (coordinates === null) {
        Alert.alert('Ubicación', 'No se pudo obtener tu ubicación actual.');
        return;
      }
      onLocate(coordinates);
    } catch {
      Alert.alert('Ubicación', 'No se pudo obtener tu ubicación actual.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Centrar en mi ubicación"
      accessibilityState={{ disabled: isLocating, busy: isLocating }}
      disabled={isLocating}
      onPress={handlePress}
      className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: theme.backgroundElement }}
      testID="locate-me-button">
      {isLocating ? (
        <ActivityIndicator color={theme.text} testID="locate-me-loading" />
      ) : (
        <ThemedText type="subtitle">◎</ThemedText>
      )}
    </Pressable>
  );
}
