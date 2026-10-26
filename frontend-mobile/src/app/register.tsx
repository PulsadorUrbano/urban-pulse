import { Redirect, router } from 'expo-router';
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

import { CountryCodePicker } from '@/components/country-code-picker';
import { PasswordInput } from '@/components/password-input';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_COUNTRY } from '@/constants/countries';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRegister } from '@/hooks/use-register';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { Country } from '@/types/country';
import type { RegisterUserInput } from '@/types/user';
import { getPasswordStrengthLevel, isEmailFormatValid } from '@/utils/password-strength';

const ERROR_COLOR = '#d92d20';

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

  if (isRestoringSession) {
    return (
      <ThemedView style={styles.container}>
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
    const phone = trimmedPhoneNumber !== '' ? `${selectedCountry.dialCode}${trimmedPhoneNumber}` : undefined;

    const input: RegisterUserInput = {
      username: username.trim(),
      email: email.trim(),
      password,
      phone,
    };

    const registerResult = await submitRegister(input);
    if (registerResult) {
      await signIn(registerResult.user, registerResult.token);
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
              Crear cuenta
            </ThemedText>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
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
              <ThemedText type="small" style={{ color: ERROR_COLOR }} accessibilityRole="alert">
                {visibleErrorMessage}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
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
                    Crear cuenta
                  </ThemedText>
                )}
              </View>
            </Pressable>

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
