import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TypewriterText } from '@/components/typewriter-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

// Genera los saludos posibles para el usuario
const buildGreetings = (name: string): string[] => [
  `¡Estás de vuelta, ${name}!`,
  `¿Alguna incidencia que reportar, ${name}?`,
  `Hola, ${name}`,
];

export default function HomeScreen() {
  const { user } = useSession();
  // Se elige un saludo al montar para que no cambie en cada render
  const [greeting] = useState(() => {
    const greetings = buildGreetings(user?.username ?? '');
    return greetings[Math.floor(Math.random() * greetings.length)];
  });

  // Sin sesión en memoria, la app arranca en el login (sesión no persistida).
  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.hero}>
          <TypewriterText type="serifTitle" text={greeting} style={styles.centerText} />
          <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
            UrbanPulse
          </ThemedText>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar incidencia"
          onPress={() => router.push('/incidents/new')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <ThemedView type="backgroundElement" style={styles.buttonInner}>
            <ThemedText type="smallBold">Registrar incidencia</ThemedText>
          </ThemedView>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
  },
  buttonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
