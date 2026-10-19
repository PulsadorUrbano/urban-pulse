import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type PasswordInputProps = TextInputProps;

export function PasswordInput({ editable = true, ...rest }: PasswordInputProps) {
  const theme = useTheme();
  // Por defecto la contraseña está oculta
  const [isVisible, setIsVisible] = useState(false);

  const handleToggleVisibility = () => {
    // Si el input está deshabilitado, el ojo tampoco alterna
    if (!editable) return;
    setIsVisible((previous) => !previous);
  };

  return (
    <View
      className="flex-row items-center rounded-2xl border px-4"
      style={{ borderColor: theme.backgroundSelected, opacity: editable ? 1 : 0.5 }}>
      <TextInput
        className="flex-1 py-2 text-[16px]"
        style={{ color: theme.text }}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
        editable={editable}
        secureTextEntry={!isVisible}
      />
      <Pressable
        onPress={handleToggleVisibility}
        disabled={!editable}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        accessibilityState={{ disabled: !editable }}>
        <MaterialIcons
          name={isVisible ? 'visibility' : 'visibility-off'}
          size={24}
          color={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}
