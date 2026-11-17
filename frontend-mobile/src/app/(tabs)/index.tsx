import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoutButton } from '@/components/logout-button';
import { TypewriterText } from '@/components/typewriter-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { buildGreetings } from '@/utils/greetings';

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
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView
        className="flex-1 items-center gap-4 px-6"
        style={{ paddingBottom: BottomTabInset + Spacing.three, maxWidth: MaxContentWidth }}>
        <ThemedView className="flex-1 items-center justify-center gap-4 px-6">
          <TypewriterText type="serifTitle" text={greeting} className="text-center" />
          <ThemedText type="default" themeColor="textSecondary" className="text-center">
            UrbanPulse
          </ThemedText>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar incidencia"
          onPress={() => router.push('/incidents/new')}
          className="self-stretch rounded-3xl active:opacity-70">
          <ThemedView type="backgroundElement" className="items-center justify-center rounded-3xl px-6 py-4">
            <ThemedText type="smallBold">Registrar incidencia</ThemedText>
          </ThemedView>
        </Pressable>
      </SafeAreaView>

      <LogoutButton
        onPress={handleLogoutPress}
        style={{
          position: 'absolute',
          zIndex: 10,
          // Tailwind/NativeWind no dispone de utility para `elevation`
          // (sombra en Android); se mantiene inline junto a la posición,
          // que depende de los insets de la safe area.
          elevation: 10,
          top: insets.top + Spacing.two,
          left: insets.left + Spacing.three,
        }}
      />
    </ThemedView>
  );
}
