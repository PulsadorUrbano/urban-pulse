import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.hero}>
          <ThemedText type="title" style={styles.centerText}>
            UrbanPulse
          </ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Reporta incidencias en tu ciudad y colabora en mantenerla en buen estado.
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
