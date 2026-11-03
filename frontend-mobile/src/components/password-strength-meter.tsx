import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPasswordStrengthLevel, type PasswordStrengthLevel } from '@/utils/password-strength';

// Etiqueta en español para cada nivel de fortaleza.
export const STRENGTH_LABELS: Record<PasswordStrengthLevel, string> = {
  invalid: 'Débil: mínimo 8 caracteres, una mayúscula y un número',
  acceptable: 'Aceptable',
  strong: 'Robusta',
};

// Color asociado a cada nivel; decisión visual propia (rojo/naranja/verde
// siguiendo el mismo patrón que IncidentStatusBadge).
export const STRENGTH_COLORS: Record<PasswordStrengthLevel, string> = {
  invalid: '#d92d20',
  acceptable: '#d97706',
  strong: '#16a34a',
};

export interface PasswordStrengthMeterProps {
  password: string;
}

// Indicador presentacional puro de la fortaleza de una contraseña.
// No valida el formulario ni despacha nada: solo refleja el `password` recibido.
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (password === '') return null;

  const strengthLevel = getPasswordStrengthLevel(password);
  const strengthColor = STRENGTH_COLORS[strengthLevel];

  return (
    <ThemedView className="mt-2 gap-1">
      <View className="h-1.5 w-full rounded-full" style={{ backgroundColor: strengthColor }} />
      <ThemedText type="small" style={{ color: strengthColor }}>
        {STRENGTH_LABELS[strengthLevel]}
      </ThemedText>
    </ThemedView>
  );
}
