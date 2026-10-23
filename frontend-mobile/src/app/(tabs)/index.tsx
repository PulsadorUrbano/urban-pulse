import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
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
  const { user, signOut } = useSession();
  const insets = useSafeAreaInsets();
  // Se elige un saludo al montar para que no cambie en cada render
  const [greeting] = useState(() => {
    const greetings = buildGreetings(user?.username ?? '');
    return greetings[Math.floor(Math.random() * greetings.length)];
  });

  // Sin sesión en memoria, la app arranca en el login (sesión no persistida).
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Cierra la sesión y vuelve al login tras confirmar el aviso destructivo.
  const handleConfirmLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  // Pide confirmación antes de cerrar sesión para evitar cierres accidentales.
  const handleLogoutPress = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: handleConfirmLogout },
    ]);
  };

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

      <LogoutButton
        onPress={handleLogoutPress}
        style={[
          styles.logoutButton,
          { top: insets.top + Spacing.two, left: insets.left + Spacing.three },
        ]}
      />
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
  logoutButton: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
});
