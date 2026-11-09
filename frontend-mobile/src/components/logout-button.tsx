import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export interface LogoutButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LOGOUT_BUTTON_SIZE = 44;
const LOGOUT_ICON_SIZE = 22;

// Botón circular discreto para cerrar sesión; usa colores de tema (no fijos
// como LocationToggle) para fundirse con el fondo en ambos modos, al ser un
// control secundario que no debe competir con el botón principal de la pantalla.
export function LogoutButton({ onPress, style }: LogoutButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      onPress={onPress}
      className="items-center justify-center rounded-full active:opacity-70"
      style={[
        { width: LOGOUT_BUTTON_SIZE, height: LOGOUT_BUTTON_SIZE, backgroundColor: theme.backgroundElement },
        style,
      ]}>
      <MaterialIcons name="logout" size={LOGOUT_ICON_SIZE} color={theme.text} />
    </Pressable>
  );
}
