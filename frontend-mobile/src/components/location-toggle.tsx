import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, View } from 'react-native';

export interface LocationToggleProps {
  isLocationEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Diámetro del botón; la pantalla lo usa para reservar el espacio del footer.
// Se aplica vía `style` inline porque es la única fuente de este tamaño
// (constante exportada); el resto de estilos vive en `className`.
export const LOCATION_TOGGLE_SIZE = 56;

const TOGGLE_ICON_SIZE = 24;

// Botón circular para activar o desactivar el envío de la ubicación. Con la
// ubicación apagada, una línea diagonal tacha el icono.
export function LocationToggle({ isLocationEnabled, onToggle, disabled = false }: LocationToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={isLocationEnabled ? 'Desactivar ubicación' : 'Activar ubicación'}
      accessibilityState={{ checked: isLocationEnabled, disabled }}
      disabled={disabled}
      onPress={onToggle}
      className={`items-center justify-center rounded-full active:opacity-70${
        disabled ? ' opacity-70' : ''
      }`}
      // Color final decidido: fondo negro (#000000) con icono blanco (#ffffff),
      // fijo en ambos temas (light/dark). El fondo va en estilo inline para
      // poder verificarlo en tests (igual que el botón Enviar).
      style={[{ width: LOCATION_TOGGLE_SIZE, height: LOCATION_TOGGLE_SIZE, backgroundColor: '#000000' }]}>
      <MaterialIcons name="location-on" size={TOGGLE_ICON_SIZE} color="#ffffff" />
      {isLocationEnabled ? null : (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          {/* Línea diagonal (w-12 = 48dp, h-[3px]) que tacha el icono. */}
          <View className="h-[3px] w-12 -rotate-45 rounded-full bg-gray-800" />
        </View>
      )}
    </Pressable>
  );
}
