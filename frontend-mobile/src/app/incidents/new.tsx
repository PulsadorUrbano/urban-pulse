import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/category-picker';
import { LOCATION_TOGGLE_SIZE, LocationToggle } from '@/components/location-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useCreateIncident } from '@/hooks/use-create-incident';
import { useLocationPreference } from '@/hooks/use-location-preference';
import { useTheme } from '@/hooks/use-theme';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import { createLocation } from '@/services/location.service';
import type { CreateIncidentInput, Incident } from '@/types/incident';
import {
  INCIDENT_DESCRIPTION_MAX_LENGTH,
  INCIDENT_TITLE_MAX_LENGTH,
  getIncidentWarnings,
  hasValidationErrors,
  validateIncidentInput,
  type IncidentValidationErrors,
} from '@/utils/incident-validator';

export default function NewIncidentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isSubmitting, errorMessage, submitIncident } = useCreateIncident();
  const { isLocationEnabled, toggleLocation } = useLocationPreference();
  const {
    categories,
    isLoading: isCategoriesLoading,
    errorMessage: categoriesErrorMessage,
  } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [validationErrors, setValidationErrors] = useState<IncidentValidationErrors>({});
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  const isSubmitDisabled = isSubmitting || isResolvingLocation;

  // Construye el payload de categoría según la selección activa: una categoría
  // del catálogo, una categoría personalizada ("Otros") o ninguna.
  const buildCategoryInput = () => ({
    categoryId: isOtherSelected ? null : selectedCategoryId,
    category: isOtherSelected ? customCategory : null,
  });

  // Selecciona una categoría del catálogo y descarta la opción "Otros".
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setIsOtherSelected(false);
    setCustomCategory('');
  };

  // Activa la categoría personalizada con el texto recibido del picker y limpia
  // la categoría del catálogo.
  const handleSelectOther = (customCategory: string) => {
    setIsOtherSelected(true);
    setSelectedCategoryId(null);
    setCustomCategory(customCategory);
  };

  // Deselecciona cualquier categoría dejando el campo opcional vacío.
  const clearCategory = () => {
    setSelectedCategoryId(null);
    setIsOtherSelected(false);
    setCustomCategory('');
  };

  // Envía la incidencia con la ubicación indicada y conserva el aviso asociado
  // para mostrarlo en la pantalla de confirmación.
  const submitWithLocation = async (locationId: string | null, notice: string | null = null) => {
    const incident = await submitIncident({
      title,
      description,
      ...buildCategoryInput(),
      locationId,
    });

    if (incident) {
      setLocationNotice(notice);
      setCreatedIncident(incident);
    }
  };

  // Resuelve la ubicación según la preferencia, los servicios del dispositivo y
  // los permisos, degradando a un registro sin posición cuando algo falla.
  const resolveLocationAndSubmit = async () => {
    if (!isLocationEnabled) {
      await submitWithLocation(null);
      return;
    }

    const isDeviceLocationEnabled = await areLocationServicesEnabled();
    if (!isDeviceLocationEnabled) {
      Alert.alert(
        'Ubicación del dispositivo desactivada',
        'La ubicación del dispositivo está desactivada. Actívala en los Ajustes para registrar la incidencia con su posición.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar sin ubicación',
            onPress: () =>
              void submitWithLocation(
                null,
                'La incidencia se registró sin ubicación porque la ubicación del dispositivo está desactivada.',
              ),
          },
        ],
      );
      return;
    }

    const isPermissionGranted = await requestLocationPermission();
    if (!isPermissionGranted) {
      Alert.alert(
        'Permiso de ubicación',
        'No podemos acceder a tu ubicación. Actívala en los Ajustes para registrar la incidencia con su posición.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          {
            text: 'Enviar sin ubicación',
            onPress: () =>
              void submitWithLocation(
                null,
                'La incidencia se registró sin ubicación porque no hay permiso de ubicación.',
              ),
          },
        ],
      );
      return;
    }

    const coordinates = await getCurrentCoordinates();
    if (!coordinates) {
      await submitWithLocation(
        null,
        'No se pudo obtener la ubicación; la incidencia se registró sin posición.',
      );
      return;
    }

    try {
      const location = await createLocation(coordinates);
      await submitWithLocation(location.id);
    } catch {
      await submitWithLocation(
        null,
        'No se pudo guardar la ubicación; la incidencia se registró sin posición.',
      );
    }
  };

  // Punto de entrada del envío: resuelve la ubicación antes de registrar la
  // incidencia y libera el bloqueo al terminar, tanto si hay éxito como error.
  const startSubmit = () => {
    setIsResolvingLocation(true);
    void resolveLocationAndSubmit().finally(() => setIsResolvingLocation(false));
  };

  // Valida el formulario y pide un único consentimiento cuando hay avisos
  // (descripción o ubicación); sin avisos, inicia el envío directamente.
  const handleSubmit = () => {
    const input: CreateIncidentInput = {
      title,
      description,
      ...buildCategoryInput(),
    };

    const errors = validateIncidentInput(input);
    setValidationErrors(errors);

    if (hasValidationErrors(errors)) {
      return;
    }

    const warnings = getIncidentWarnings({ description, isLocationEnabled });
    if (warnings.length === 0) {
      startSubmit();
      return;
    }

    const warningsMessage = warnings.map((warning) => `• ${warning.message}`).join('\n\n');

    Alert.alert('¿Enviar de todas formas?', warningsMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar de todas formas',
        style: 'destructive',
        onPress: startSubmit,
      },
    ]);
  };

  // Estado de confirmación: se muestra tras un registro correcto.
  if (createdIncident) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
          <ThemedView style={styles.successContainer}>
            <ThemedText type="subtitle" style={styles.successTitle}>
              Incidencia registrada
            </ThemedText>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              Tu incidencia se registró correctamente con estado{' '}
              <ThemedText type="smallBold">{createdIncident.status}</ThemedText>.
            </ThemedText>

            {locationNotice ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                {locationNotice}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.buttonInner}>
                <ThemedText type="smallBold">Volver</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            Describe la incidencia urbana. El título es obligatorio y la descripción es opcional,
            aunque recomendable.
          </ThemedText>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Título</ThemedText>
            <TextInput
              accessibilityLabel="Título de la incidencia"
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Bache en la calle principal"
              placeholderTextColor={theme.textSecondary}
              maxLength={INCIDENT_TITLE_MAX_LENGTH}
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />
            {validationErrors.title ? (
              <ThemedText type="small" style={styles.errorText}>
                {validationErrors.title}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="smallBold">Descripción (opcional)</ThemedText>
            <ThemedView
              style={[styles.descriptionContainer, { borderColor: theme.backgroundSelected }]}>
              <TextInput
                accessibilityLabel="Descripción de la incidencia"
                value={description}
                onChangeText={setDescription}
                placeholder="Explica qué ocurre, desde cuándo y cualquier detalle útil."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
                maxLength={INCIDENT_DESCRIPTION_MAX_LENGTH}
                style={[styles.inputBorderless, styles.multilineInput, { color: theme.text }]}
              />
              {/* La categoría vive en la esquina inferior del campo de descripción. */}
              <View style={styles.descriptionPickerRow}>
                <CategoryPicker
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  customCategory={customCategory}
                  isLoading={isCategoriesLoading}
                  errorMessage={categoriesErrorMessage}
                  onSelectCategory={handleSelectCategory}
                  onSelectOther={handleSelectOther}
                  onClear={clearCategory}
                />
              </View>
            </ThemedView>

            {validationErrors.category ? (
              <ThemedText type="small" style={styles.errorText}>
                {validationErrors.category}
              </ThemedText>
            ) : null}
          </ThemedView>

          {errorMessage ? (
            <ThemedView type="backgroundElement" style={styles.errorBanner}>
              <ThemedText type="small" style={styles.errorText}>
                {errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar incidencia"
            disabled={isSubmitDisabled}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.button,
              (pressed || isSubmitDisabled) && styles.pressed,
            ]}>
            <ThemedView type="backgroundElement" style={styles.buttonInner}>
              {isSubmitting || isResolvingLocation ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="smallBold">Enviar</ThemedText>
              )}
            </ThemedView>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* FAB de ubicación: alterna si la incidencia se registra con posición. */}
      <View style={[styles.locationToggleWrapper, { bottom: insets.bottom + Spacing.four }]}>
        <LocationToggle
          isLocationEnabled={isLocationEnabled}
          onToggle={toggleLocation}
          disabled={isSubmitDisabled}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    // Espacio extra para que el FAB de ubicación no tape el botón Enviar.
    paddingBottom: LOCATION_TOGGLE_SIZE + Spacing.four + Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inputBorderless: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  descriptionContainer: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  descriptionPickerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  errorText: {
    color: '#d92d20',
  },
  errorBanner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  button: {
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
  locationToggleWrapper: {
    position: 'absolute',
    right: Spacing.four,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  successTitle: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
