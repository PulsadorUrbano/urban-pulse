import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FallbackNoticeCard } from '@/components/fallback-notice-card';
import { PasswordInput } from '@/components/password-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_FALLBACK_NOTICE } from '@/constants/messages';
import { MaxContentWidth } from '@/constants/theme';
import { type LoginSuccess, useLogin } from '@/hooks/use-login';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { LoginUserInput } from '@/types/user';

export default function LoginScreen() {
  const theme = useTheme();
  const { isSubmitting, errorMessage, isLocked, lockMessage, submitLogin } = useLogin();
  const { signIn, user, isRestoringSession } = useSession();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  // Mientras haya un aviso de fallback pendiente de confirmar, se retiene el
  // resultado del login sin llamar a signIn todavía: si se llamara ya, el
  // guard `if (user) return <Redirect .../>` de abajo navegaría de inmediato
  // y el aviso nunca llegaría a verse.
  const [pendingFallbackLogin, setPendingFallbackLogin] = useState<LoginSuccess | null>(null);

  if (isRestoringSession) {
    return (
      <ThemedView className="flex-1 flex-row justify-center">
        <ActivityIndicator testID="session-restoring-indicator" />
      </ThemedView>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

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
      usernameOrEmail: usernameOrEmail.trim(),
      password,
    };
    const loginResult = await submitLogin(input);
    if (!loginResult) {
      return;
    }

    if (loginResult.source === 'mock') {
      setPendingFallbackLogin(loginResult);
      return;
    }

    await signIn(loginResult.user, loginResult.token);
    router.replace('/');
  };

  const handleContinueAfterFallback = async () => {
    if (!pendingFallbackLogin) return;
    await signIn(pendingFallbackLogin.user, pendingFallbackLogin.token);
    router.replace('/');
  };

  // Aviso de fallback: se muestra en vez del formulario hasta que el usuario
  // confirme, momento en el que se llama a signIn y se navega.
  if (pendingFallbackLogin) {
    return (
      <ThemedView className="flex-1 flex-row justify-center">
        <SafeAreaView className="flex-1 px-6" style={{ maxWidth: MaxContentWidth }}>
          <FallbackNoticeCard
            message={MOCK_FALLBACK_NOTICE}
            buttonLabel="Continuar"
            onPress={handleContinueAfterFallback}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="flex-1 px-6" style={{ maxWidth: MaxContentWidth }}>
        <KeyboardAvoidingView
          className="flex-1 justify-center gap-6"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ThemedView className="items-center justify-center px-6 gap-4">
            <ThemedText type="title" className="text-center">
              UrbanPulse
            </ThemedText>
            <ThemedText className="text-center" themeColor="textSecondary">
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

            {/* Funcionalidad aún no implementada: se deshabilita visualmente en
                lugar de dejar un onPress no-op silencioso (ver TODO futuro de
                recuperación de contraseña). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Has olvidado tu contraseña"
              accessibilityHint="Próximamente disponible"
              accessibilityState={{ disabled: true }}
              disabled
              className="self-start opacity-50">
              <ThemedText type="link">¿Has olvidado tu contraseña? (Próximamente)</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="No tienes cuenta, créate una"
              onPress={() => router.push('/register')}
              className="self-start active:opacity-70">
              <ThemedText type="link">¿No tienes cuenta? Créate una</ThemedText>
            </Pressable>

            {visibleErrorMessage ? (
              <ThemedText type="small" themeColor="error" accessibilityRole="alert">
                {visibleErrorMessage}
              </ThemedText>
            ) : null}

            <PrimaryButton
              label="Iniciar sesión"
              accessibilityState={{ disabled: isSubmitDisabled, busy: isSubmitting }}
              disabled={isSubmitDisabled}
              isLoading={isSubmitting}
              onPress={handleSubmit}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
