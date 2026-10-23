import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/category-picker';
import { LOCATION_TOGGLE_SIZE, LocationToggle } from '@/components/location-toggle';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useCreateIncident } from '@/hooks/use-create-incident';
import { useLocationPreference } from '@/hooks/use-location-preference';
import { usePhotoAttachment } from '@/hooks/use-photo-attachment';
import { useTheme } from '@/hooks/use-theme';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import {
  DEFAULT_INCIDENT_STATUS,
  type CreateIncidentInput,
  type CreatedIncident,
} from '@/types/incident';
import type { LocationCoordinates } from '@/types/location';
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
    selectedPhotoUris,
    isProcessingPhoto,
    errorMessage: photoErrorMessage,
    attachPhotoFromCamera,
    attachPhotoFromLibrary,
    removePhoto,
  } = usePhotoAttachment();
  const {
    categories,
    isLoading: isCategoriesLoading,
    errorMessage: categoriesErrorMessage,
    fallbackNotice: categoriesFallbackNotice,
  } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [validationErrors, setValidationErrors] = useState<IncidentValidationErrors>({});
  const [createdIncident, setCreatedIncident] = useState<CreatedIncident | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  // No se permite enviar mientras se resuelve la ubicación, se persiste la
  // incidencia o se está guardando una foto adjunta.
  const isSubmitDisabled = isSubmitting || isResolvingLocation || isProcessingPhoto;

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

  // Envía la incidencia con las coordenadas indicadas (o sin ellas) y conserva los
  // avisos asociados (ubicación) para mostrarlos en la pantalla de confirmación.
  const submitWithCoordinates = async (
    coordinates: LocationCoordinates | null,
    notice: string | null = null,
  ) => {
    const result = await submitIncident(
      {
        title,
        description,
        ...buildCategoryInput(),
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        accuracy: coordinates?.accuracy ?? null,
      },
      selectedPhotoUris,
    );

    if (!result) {
      return;
    }

    setLocationNotice(notice);
    setBackendFallbackNotice(
      result.source === 'mock'
        ? 'No se ha podido conectar al backend, realizando en el mock'
        : null,
    );

    setCreatedIncident(result.incident);
  };

  // Resuelve la ubicación según la preferencia, los servicios del dispositivo y
  // los permisos, degradando a un registro sin posición cuando algo falla.
  const resolveLocationAndSubmit = async () => {
    if (!isLocationEnabled) {
      await submitWithCoordinates(null);
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
              void submitWithCoordinates(
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
              void submitWithCoordinates(
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
      await submitWithCoordinates(
        null,
        'No se pudo obtener la ubicación; la incidencia se registró sin posición.',
      );
      return;
    }

    await submitWithCoordinates(coordinates);
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
      <ThemedView className="flex-1 flex-row justify-center">
        <SafeAreaView className="flex-1 w-full" edges={['bottom', 'left', 'right']}>
          <ThemedView className="flex-1 items-center justify-center gap-4 px-6">
            <ThemedText type="subtitle" className="text-center">
              Incidencia registrada
            </ThemedText>
            <ThemedText className="text-center" themeColor="textSecondary">
              Tu incidencia se registró correctamente con estado{' '}
              <ThemedText type="smallBold">{DEFAULT_INCIDENT_STATUS}</ThemedText>.
            </ThemedText>

            {locationNotice ? (
              <ThemedText type="small" themeColor="textSecondary" className="text-center">
                {locationNotice}
              </ThemedText>
            ) : null}

            {backendFallbackNotice ? (
              <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
                <Text className="text-center text-sm font-medium text-[#d92d20]">
                  {backendFallbackNotice}
                </Text>
              </ThemedView>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              onPress={() => router.back()}
              className="active:opacity-70 rounded-3xl">
              <ThemedView
                type="backgroundElement"
                className="items-center justify-center rounded-3xl px-6 py-4">
                <ThemedText type="smallBold">Volver</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="flex-1 w-full" edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerClassName="gap-6 px-6 pt-6"
          contentContainerStyle={{
            // Reserva la altura del footer fijo para que no tape el contenido al
            // final del scroll: paddings verticales del footer más la altura de
            // su fila (el toggle de ubicación, LOCATION_TOGGLE_SIZE, es el
            // elemento más alto).
            paddingBottom: insets.bottom + Spacing.three + Spacing.two + LOCATION_TOGGLE_SIZE,
          }}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            Describe la incidencia urbana. El título es obligatorio y la descripción es opcional,
            aunque recomendable.
          </ThemedText>

          <ThemedView className="gap-2">
            <ThemedText type="smallBold">Título</ThemedText>
            <TextInput
              accessibilityLabel="Título de la incidencia"
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Bache en la calle principal"
              placeholderTextColor={theme.textSecondary}
              maxLength={INCIDENT_TITLE_MAX_LENGTH}
              className="rounded-2xl border px-4 py-2 text-[16px]"
              style={{ color: theme.text, borderColor: theme.backgroundSelected }}
            />
            {validationErrors.title ? (
              <Text className="text-sm font-medium text-[#d92d20]">{validationErrors.title}</Text>
            ) : null}
          </ThemedView>

          <ThemedView className="gap-2">
            <ThemedText type="smallBold">Descripción</ThemedText>
            <ThemedView
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: theme.backgroundSelected }}>
              <TextInput
                accessibilityLabel="Descripción de la incidencia"
                value={description}
                onChangeText={setDescription}
                placeholder="Explica qué ocurre, desde cuándo y cualquier detalle útil."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
                maxLength={INCIDENT_DESCRIPTION_MAX_LENGTH}
                className="min-h-[120px] px-4 py-2 text-[16px]"
                style={[
                  { color: theme.text },
                  // `textAlignVertical` no tiene utility equivalente en
                  // Tailwind/NativeWind (alinea el texto arriba en Android);
                  // se mantiene como estilo inline.
                  { textAlignVertical: 'top' },
                ]}
              />
              {/* La categoría vive en la esquina inferior del campo de descripción. */}
              <View className="flex-row justify-end px-2 pb-2">
                <CategoryPicker
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  customCategory={customCategory}
                  isLoading={isCategoriesLoading}
                  errorMessage={categoriesErrorMessage}
                  fallbackNotice={categoriesFallbackNotice}
                  onSelectCategory={handleSelectCategory}
                  onSelectOther={handleSelectOther}
                  onClear={clearCategory}
                />
              </View>
            </ThemedView>

            {validationErrors.category ? (
              <Text className="text-sm font-medium text-[#d92d20]">
                {validationErrors.category}
              </Text>
            ) : null}
          </ThemedView>

          {/* Sección de fotos: adjuntos opcionales para la incidencia. */}
          <ThemedView className="gap-2">
            {selectedPhotoUris.length > 0 ? (
              <ThemedText type="smallBold">
                Imágenes subidas ({selectedPhotoUris.length}):
              </ThemedText>
            ) : null}
            <PhotoPicker
              selectedPhotoUris={selectedPhotoUris}
              isProcessingPhoto={isProcessingPhoto}
              errorMessage={photoErrorMessage}
              onAttachFromCamera={attachPhotoFromCamera}
              onAttachFromLibrary={attachPhotoFromLibrary}
              onRemovePhoto={removePhoto}
              disabled={isSubmitting || isResolvingLocation}
            />
          </ThemedView>

          {errorMessage ? (
            <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
              <Text className="text-sm font-medium text-[#d92d20]">{errorMessage}</Text>
            </ThemedView>
          ) : null}
        </ScrollView>

        {/* Footer fijo en fila: botón Enviar a la izquierda (flex-1, nunca
            solapa al toggle) y el toggle de ubicación a su derecha, ambos
            centrados verticalmente y separados por gap-2. */}
        <View
          className="z-10 flex-row items-center gap-2 px-6 pt-2"
          style={[
            { paddingBottom: insets.bottom + Spacing.three },
            // Tailwind/NativeWind no dispone de utility para `elevation`
            // (sombra en Android); se mantiene inline junto al `z-10` del
            // className para que el footer siga en la capa superior.
            { elevation: 10 },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar incidencia"
            disabled={isSubmitDisabled}
            onPress={handleSubmit}
            className={`flex-1 rounded-3xl active:opacity-70${isSubmitDisabled ? ' opacity-70' : ''}`}>
            {/* Color final decidido: fondo blanco (#ffffff) y texto negro
                (#000000), fijo en ambos temas (light/dark). Se usa `View` de RN
                (no `ThemedView`) para que el fondo no dependa del tema; el
                `ActivityIndicator` sigue visible sobre el blanco al cargando. */}
            <View
              className="items-center justify-center rounded-3xl px-6 py-4"
              style={{ backgroundColor: '#ffffff' }}>
              {isSubmitting || isResolvingLocation ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="smallBold" style={{ color: '#000000' }}>
                  Enviar
                </ThemedText>
              )}
            </View>
          </Pressable>

          {/* Toggle de ubicación dentro del footer (componente normal, sin
              posicionamiento absoluto). */}
          <LocationToggle
            isLocationEnabled={isLocationEnabled}
            onToggle={toggleLocation}
            disabled={isSubmitDisabled}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
