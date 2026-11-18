import { Alert, Platform } from 'react-native';

export interface ConfirmActionOption {
  text: string;
  onPress: () => void;
}

export interface ConfirmActionConfirmOption extends ConfirmActionOption {
  // Solo native: p. ej. 'destructive' para acciones irreversibles; en web se ignora
  style?: 'default' | 'destructive';
}

export interface ConfirmActionParams {
  title: string;
  message: string;
  // También se ejecuta al descartar el diálogo
  cancel: ConfirmActionOption;
  confirm: ConfirmActionConfirmOption;
  // Botones adicionales solo para native (p. ej. "Abrir Ajustes"); en web se omiten
  nativeOnlyOptions?: ConfirmActionOption[];
}

/**
 * Muestra una confirmación multiplataforma.
 * En react-native-web `Alert.alert` es un no-op, por eso en web se usa `window.confirm`.
 */
export function confirmAction({
  title,
  message,
  cancel,
  confirm,
  nativeOnlyOptions = [],
}: ConfirmActionParams): void {
  if (Platform.OS !== 'web') {
    Alert.alert(
      title,
      message,
      [
        { text: cancel.text, style: 'cancel', onPress: cancel.onPress },
        ...nativeOnlyOptions.map((option) => ({
          text: option.text,
          onPress: option.onPress,
        })),
        {
          text: confirm.text,
          onPress: confirm.onPress,
          ...(confirm.style ? { style: confirm.style } : {}),
        },
      ],
      { cancelable: true, onDismiss: cancel.onPress },
    );
    return;
  }

  // Sin window.confirm se cancela para no dejar nunca la UI bloqueada
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    cancel.onPress();
    return;
  }

  if (window.confirm(`${title}\n\n${message}`)) {
    confirm.onPress();
  } else {
    cancel.onPress();
  }
}
