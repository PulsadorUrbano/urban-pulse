import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/category-picker';
import { LOCATION_TOGGLE_SIZE, LocationToggle } from '@/components/location-toggle';
import { PhotoPicker } from '@/components/photo-picker';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useCreateIncident } from '@/hooks/use-create-incident';
import { useIncidentLocationSubmit } from '@/hooks/use-incident-location-submit';
import { useLocationPreference } from '@/hooks/use-location-preference';
import { usePhotoAttachment } from '@/hooks/use-photo-attachment';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_INCIDENT_STATUS, type CreateIncidentInput } from '@/types/incident';
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
  const { user, isRestoringSession } = useSession();
  const { isSubmitting, errorMessage, submitIncident } = useCreateIncident(user?.civicId ?? null);
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
  } = useCategories();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [validationErrors, setValidationErrors] = useState<IncidentValidationErrors>({});

  // Construye el payload de categoría según la selección activa: una categoría
  // del catálogo, una categoría personalizada ("Otros") o ninguna.
  const buildCategoryInput = () => ({
    categoryId: isOtherSelected ? null : selectedCategoryId,
    category: isOtherSelected ? customCategory : null,
  });

  const {
    isResolvingLocation,
    locationNotice,
    backendFallbackNotice,
    submitErrorMessage,
    createdIncident,
    startSubmit,
  } = useIncidentLocationSubmit({
    isLocationEnabled,
    title,
    description,
    ...buildCategoryInput(),
    selectedPhotoUris,
    submitIncident,
  });

  // Sin sesión activa (y ya resuelta) esta pantalla no es alcanzable: mismo
  // guard que ya usa HomeScreen/MyIncidentsScreen. Se coloca tras llamar a
  // todos los hooks de arriba para no romper las reglas de hooks.
  if (!isRestoringSession && !user) {
    return <Redirect href="/login" />;
  }

  // No se permite enviar mientras se resuelve la ubicación, se persiste la
  // incidencia o se está guardando una foto adjunta.
  const isSubmitDisabled = isSubmitting || isResolvingLocation || isProcessingPhoto;

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
                <ThemedText type="small" themeColor="error" className="text-center">
                  {backendFallbackNotice}
                </ThemedText>
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
              <ThemedText type="small" themeColor="error">
                {validationErrors.title}
              </ThemedText>
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
                  onSelectCategory={handleSelectCategory}
                  onSelectOther={handleSelectOther}
                  onClear={clearCategory}
                />
              </View>
            </ThemedView>

            {validationErrors.category ? (
              <ThemedText type="small" themeColor="error">
                {validationErrors.category}
              </ThemedText>
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
              <ThemedText type="small" themeColor="error">
                {errorMessage}
              </ThemedText>
            </ThemedView>
          ) : null}

          {submitErrorMessage ? (
            <ThemedView type="backgroundElement" className="rounded-2xl px-4 py-2">
              <ThemedText type="small" themeColor="error">
                {submitErrorMessage}
              </ThemedText>
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
          <PrimaryButton
            label="Enviar"
            accessibilityLabel="Enviar incidencia"
            disabled={isSubmitDisabled}
            isLoading={isSubmitting || isResolvingLocation}
            onPress={handleSubmit}
            className="flex-1"
          />

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
