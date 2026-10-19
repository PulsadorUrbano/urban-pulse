import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordInput } from '@/components/password-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLogin } from '@/hooks/use-login';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { LoginUserInput } from '@/types/user';

const ERROR_COLOR = '#d92d20';

export default function LoginScreen() {
  const theme = useTheme();
  const { isSubmitting, errorMessage, isLocked, lockMessage, submitLogin } = useLogin();
  const { signIn } = useSession();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validación manual: ambos campos con contenido (tras trim)
  const hasEmptyField = usernameOrEmail.trim().length === 0 || password.trim().length === 0;
  const isSubmitDisabled = hasEmptyField || isSubmitting || isLocked;
  // Durante el bloqueo o el envío los inputs quedan anulados
  const areInputsEditable = !isLocked && !isSubmitting;

  // Prioridad del mensaje: bloqueo > credenciales incorrectas
  const visibleErrorMessage = isLocked ? lockMessage : errorMessage;

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    const input: LoginUserInput = {
      username_email: usernameOrEmail.trim(),
      password,
    };
    const loginResult = await submitLogin(input);
    if (loginResult) {
      await signIn(loginResult.user, loginResult.token);
      router.replace('/');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title" style={styles.centerText}>
              UrbanPulse
            </ThemedText>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              Reporta incidencias en tu ciudad y colabora en mantenerla en buen estado.
            </ThemedText>
          </ThemedView>

          <View className="gap-3 self-stretch">
            <TextInput
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              placeholder="Usuario o correo"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={areInputsEditable}
              accessibilityLabel="Usuario o correo"
              className="rounded-2xl border px-4 py-2 text-[16px]"
              style={{
                color: theme.text,
                borderColor: theme.backgroundSelected,
                opacity: areInputsEditable ? 1 : 0.5,
              }}
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              editable={areInputsEditable}
              accessibilityLabel="Contraseña"
            />

            {/* TODO futuro: recuperación de contraseña */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Has olvidado tu contraseña"
              onPress={() => {}}
              className="self-start active:opacity-70">
              <ThemedText type="link">¿Has olvidado tu contraseña?</ThemedText>
            </Pressable>

            {visibleErrorMessage ? (
              <ThemedText type="small" style={{ color: ERROR_COLOR }} accessibilityRole="alert">
                {visibleErrorMessage}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
              accessibilityState={{ disabled: isSubmitDisabled, busy: isSubmitting }}
              disabled={isSubmitDisabled}
              onPress={handleSubmit}
              className={`rounded-3xl active:opacity-70${isSubmitDisabled ? ' opacity-70' : ''}`}>
              {/* Botón blanco (#ffffff) con texto negro (#000000), fijo en ambos temas */}
              <View
                className="items-center justify-center rounded-3xl px-6 py-4"
                style={{ backgroundColor: '#ffffff' }}>
                {isSubmitting ? (
                  <ActivityIndicator />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#000000' }}>
                    Iniciar sesión
                  </ThemedText>
                )}
              </View>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    maxWidth: MaxContentWidth,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
});
