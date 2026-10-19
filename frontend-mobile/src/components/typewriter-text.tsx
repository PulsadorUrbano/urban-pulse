import { useEffect, useState, type ComponentProps } from 'react';

import { ThemedText } from '@/components/themed-text';

export type TypewriterTextProps = {
  text: string;
  speedMs?: number;
} & Omit<ComponentProps<typeof ThemedText>, 'children'>;

export function TypewriterText({ text, speedMs = 35, ...rest }: TypewriterTextProps) {
  const [visibleCharacterCount, setVisibleCharacterCount] = useState(0);

  const [previousText, setPreviousText] = useState(text);

  // Reinicia la animación en el render cuando cambia el texto (patrón recomendado por React:
  // guardar el valor previo en estado; evita setState dentro de useEffect y refs en render).
  if (previousText !== text) {
    setPreviousText(text);
    setVisibleCharacterCount(0);
  }

  useEffect(() => {
    if (text.length === 0) return;

    const intervalId = setInterval(() => {
      setVisibleCharacterCount((previous) => {
        const next = previous + 1;
        // Al completar el texto se detiene el intervalo
        if (next >= text.length) clearInterval(intervalId);
        return Math.min(next, text.length);
      });
    }, speedMs);

    // Cleanup: evita fugas de timers y setState tras desmontar
    return () => clearInterval(intervalId);
  }, [text, speedMs]);

  return <ThemedText {...rest}>{text.slice(0, visibleCharacterCount)}</ThemedText>;
}
