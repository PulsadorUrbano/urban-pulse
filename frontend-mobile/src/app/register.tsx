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

import { CountryCodePicker } from '@/components/country-code-picker';
import { FallbackNoticeCard } from '@/components/fallback-notice-card';
import { PasswordInput } from '@/components/password-input';
import { PrimaryButton } from '@/components/primary-button';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_COUNTRY } from '@/constants/countries';
import { MOCK_FALLBACK_NOTICE } from '@/constants/messages';
import { MaxContentWidth } from '@/constants/theme';
import { type RegisterSuccess, useRegister } from '@/hooks/use-register';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { Country } from '@/types/country';
import type { RegisterUserInput } from '@/types/user';
import { buildPhoneWithDialCode } from '@/utils/phone';
import { getPasswordStrengthLevel, isEmailFormatValid } from '@/utils/password-strength';

export default function RegisterScreen() {
  const theme = useTheme();
  const { isSubmitting, errorMessage, submitRegister } = useRegister();
  const { signIn, user, isRestoringSession } = useSession();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Igual que en pendingFallbackLogin de login.tsx: se retiene el resultado
  // sin llamar a signIn hasta confirmar, para que el guard `if (user)` de
  // abajo no navegue antes de que el aviso llegue a verse.
  const [pendingFallbackRegister, setPendingFallbackRegister] = useState<RegisterSuccess | null>(null);
  const [autoLoginFailedNotice, setAutoLoginFailedNotice] = useState(false);

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

  // Validación manual: username y email con contenido, email con formato
  // válido, contraseña que cumpla al menos el nivel mínimo y confirmación
  // coincidente con la contraseña.
  const passwordsDoNotMatch =
    password.length > 0 && confirmPassword.length > 0 && confirmPassword !== password;
  const isSubmitDisabled =
    isSubmitting ||
    username.trim() === '' ||
    email.trim() === '' ||
    !isEmailFormatValid(email) ||
    getPasswordStrengthLevel(password) === 'invalid' ||
    confirmPassword !== password;
  const areInputsEditable = !isSubmitting;

  // Prioridad del mensaje: contraseñas no coincidentes > error del backend/mock
  const visibleErrorMessage = passwordsDoNotMatch ? 'Las contraseñas no coinciden.' : errorMessage;

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;

    const trimmedPhoneNumber = phoneNumber.trim();
    const phone =
      trimmedPhoneNumber !== '' ? buildPhoneWithDialCode(selectedCountry.dialCode, trimmedPhoneNumber) : undefined;

    const input: RegisterUserInput = {
      username: username.trim(),
      email: email.trim(),
      password,
      phone,
    };

    const registerResult = await submitRegister(input);
    if (!registerResult) {
      return;
    }

    if (registerResult.autoLoginFailed) {
      // Cuenta creada en el backend, pero sin token válido: no hay sesión que
      // guardar, así que no se llama a signIn.
      setAutoLoginFailedNotice(true);
      return;
    }

    if (registerResult.source === 'mock') {
      setPendingFallbackRegister(registerResult);
      return;
    }

    await signIn(registerResult.user, registerResult.token);
    router.replace('/');
  };

  const handleContinueAfterFallback = async () => {
    if (!pendingFallbackRegister) return;
    await signIn(pendingFallbackRegister.user, pendingFallbackRegister.token);
    router.replace('/');
  };

  if (autoLoginFailedNotice) {
    return (
      <ThemedView className="flex-1 flex-row justify-center">
        <SafeAreaView className="flex-1 px-6" style={{ maxWidth: MaxContentWidth }}>
          <FallbackNoticeCard
            message="Tu cuenta se ha creado, pero no se pudo iniciar sesión automáticamente. Inicia sesión."
            buttonLabel="Iniciar sesión"
            onPress={() => router.replace('/login')}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (pendingFallbackRegister) {
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
              Crear cuenta
            </ThemedText>
            <ThemedText className="text-center" themeColor="textSecondary">
              Únete a UrbanPulse para reportar incidencias en tu ciudad.
            </ThemedText>
          </ThemedView>

          <View className="gap-3 self-stretch">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Nombre de usuario"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={areInputsEditable}
              accessibilityLabel="Nombre de usuario"
              className="rounded-2xl border px-4 py-2 text-[16px]"
              style={{
                color: theme.text,
                borderColor: theme.backgroundSelected,
                opacity: areInputsEditable ? 1 : 0.5,
              }}
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={areInputsEditable}
              accessibilityLabel="Correo electrónico"
              className="rounded-2xl border px-4 py-2 text-[16px]"
              style={{
                color: theme.text,
                borderColor: theme.backgroundSelected,
                opacity: areInputsEditable ? 1 : 0.5,
              }}
            />

            <View className="flex-row gap-2">
              <CountryCodePicker selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Teléfono (opcional)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                editable={areInputsEditable}
                accessibilityLabel="Teléfono"
                className="flex-1 rounded-2xl border px-4 py-2 text-[16px]"
                style={{
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                  opacity: areInputsEditable ? 1 : 0.5,
                }}
              />
            </View>

            <View>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                editable={areInputsEditable}
                accessibilityLabel="Contraseña"
              />
              <PasswordStrengthMeter password={password} />
            </View>

            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar contraseña"
              editable={areInputsEditable}
              accessibilityLabel="Confirmar contraseña"
            />

            {visibleErrorMessage ? (
              <ThemedText type="small" themeColor="error" accessibilityRole="alert">
                {visibleErrorMessage}
              </ThemedText>
            ) : null}

            <PrimaryButton
              label="Crear cuenta"
              accessibilityState={{ disabled: isSubmitDisabled, busy: isSubmitting }}
              disabled={isSubmitDisabled}
              isLoading={isSubmitting}
              onPress={handleSubmit}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ya tienes cuenta, inicia sesión"
              onPress={() => router.back()}
              className="self-start active:opacity-70">
              <ThemedText type="link">¿Ya tienes cuenta? Inicia sesión</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
