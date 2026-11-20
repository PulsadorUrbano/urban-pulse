import { ActivityIndicator, Pressable, View, type AccessibilityState } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  // Clases extra para el contenedor pulsable (p. ej. `flex-1` dentro de una fila).
  className?: string;
}

// Botón primario de la app. Fondo y texto salen siempre de `Colors.light`
// (fijos en ambos temas, a propósito): se usa `View` de RN y no `ThemedView`
// para que el fondo no dependa del tema.
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  isLoading = false,
  accessibilityLabel,
  accessibilityState,
  className,
}: PrimaryButtonProps) {
  const disabledClass = disabled ? ' opacity-70' : '';
  const extraClass = className ? ` ${className}` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-3xl active:opacity-70${disabledClass}${extraClass}`}>
      <View
        className="items-center justify-center rounded-3xl px-6 py-4"
        style={{ backgroundColor: Colors.light.background }}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <ThemedText type="smallBold" style={{ color: Colors.light.text }}>
            {label}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}
