import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export interface FallbackNoticeCardProps {
  message: string;
  buttonLabel: string;
  onPress: () => void;
}

// Tarjeta que avisa de un fallback (p. ej. backend inalcanzable, usando el
// mock) o de cualquier aviso similar que requiera confirmación explícita del
// usuario mediante un único botón de acción. Reutilizada por login.tsx y
// register.tsx, que la envuelven con su propio contenedor a pantalla completa.
export function FallbackNoticeCard({ message, buttonLabel, onPress }: FallbackNoticeCardProps) {
  return (
    <ThemedView className="flex-1 items-center justify-center gap-4 px-6">
      <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
        <ThemedText type="small" themeColor="error" className="text-center">
          {message}
        </ThemedText>
      </ThemedView>
      {/* Botón primario con fondo/texto de Colors.light, fijo en ambos temas */}
      <PrimaryButton label={buttonLabel} onPress={onPress} />
    </ThemedView>
  );
}
