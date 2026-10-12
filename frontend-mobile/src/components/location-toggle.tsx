import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

export interface LocationToggleProps {
  isLocationEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Diámetro del botón; la pantalla lo usa para reservar espacio bajo el FAB.
export const LOCATION_TOGGLE_SIZE = 56;

const TOGGLE_ICON_SIZE = 24;
// Ancho de la línea diagonal que tacha el icono con la ubicación desactivada.
const DISABLED_LINE_WIDTH = 48;
const DISABLED_LINE_HEIGHT = 3;
const TOGGLE_BACKGROUND_COLOR = '#6B7280';
const DISABLED_LINE_COLOR = '#1F2937';

// Botón circular flotante para activar o desactivar el envío de la ubicación.
// Con la ubicación apagada, una línea diagonal tacha el icono.
export function LocationToggle({
  isLocationEnabled,
  onToggle,
  disabled = false,
}: LocationToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={isLocationEnabled ? 'Desactivar ubicación' : 'Activar ubicación'}
      accessibilityState={{ checked: isLocationEnabled, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}>
      <MaterialIcons name="location-on" size={TOGGLE_ICON_SIZE} color="#ffffff" />
      {isLocationEnabled ? null : (
        <View style={styles.disabledLineWrapper} pointerEvents="none">
          <View style={styles.disabledLine} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: LOCATION_TOGGLE_SIZE,
    height: LOCATION_TOGGLE_SIZE,
    borderRadius: LOCATION_TOGGLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOGGLE_BACKGROUND_COLOR,
  },
  disabledLineWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledLine: {
    width: DISABLED_LINE_WIDTH,
    height: DISABLED_LINE_HEIGHT,
    borderRadius: DISABLED_LINE_HEIGHT / 2,
    backgroundColor: DISABLED_LINE_COLOR,
    transform: [{ rotate: '-45deg' }],
  },
  pressed: {
    opacity: 0.7,
  },
});
