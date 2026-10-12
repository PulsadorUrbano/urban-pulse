import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/types/category';

export interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: string | null;
  // Texto guardado de la opción "Otros".
  customCategory: string;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectOther: (customCategory: string) => void;
  onClear: () => void;
}

// Control compacto de categoría: muestra la selección actual en la esquina del
// campo y delega la elección en una hoja inferior y un modal de texto para "Otros".
export function CategoryPicker({
  categories,
  selectedCategoryId,
  customCategory,
  isLoading,
  errorMessage,
  onSelectCategory,
  onSelectOther,
  onClear,
}: CategoryPickerProps) {
  const theme = useTheme();

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isOtherModalVisible, setIsOtherModalVisible] = useState(false);
  const [otherInputText, setOtherInputText] = useState('');

  // La categoría personalizada tiene prioridad; en su defecto se busca la del
  // catálogo por id. Si el id no existe todavía, se usa una etiqueta genérica.
  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId) ?? null
    : null;

  const hasSelection = selectedCategoryId !== null || customCategory.trim() !== '';
  const displayName =
    customCategory.trim() !== ''
      ? customCategory
      : selectedCategory?.name ?? (selectedCategoryId !== null ? 'Categoría' : '');

  const isSaveDisabled = otherInputText.trim() === '';

  // Abre la hoja de categorías.
  const openSheet = () => {
    setIsSheetVisible(true);
  };

  // Cierra la hoja de categorías.
  const closeSheet = () => {
    setIsSheetVisible(false);
  };

  // Selecciona una categoría del catálogo y cierra la hoja.
  const handleSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    closeSheet();
  };

  // Cierra la hoja y abre el modal de texto, precargando la categoría previa.
  const handleOpenOtherModal = () => {
    closeSheet();
    setOtherInputText(customCategory);
    setIsOtherModalVisible(true);
  };

  // Cierra el modal de "Otros" descartando el texto escrito.
  const closeOtherModal = () => {
    setIsOtherModalVisible(false);
    setOtherInputText('');
  };

  // Confirma la categoría personalizada y la propaga al formulario.
  const handleSaveOther = () => {
    const trimmedCategory = otherInputText.trim();
    if (trimmedCategory === '') return;
    onSelectOther(trimmedCategory);
    setIsOtherModalVisible(false);
    setOtherInputText('');
  };

  return (
    <>
      <ThemedView type="backgroundElement" style={styles.trigger}>
        {hasSelection ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar categoría, actual: ${displayName}`}
              onPress={openSheet}
              style={({ pressed }) => [styles.triggerLabel, pressed && styles.pressed]}>
              <ThemedText type="small" numberOfLines={1} style={styles.triggerLabelText}>
                {displayName}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar categoría"
              hitSlop={Spacing.two}
              onPress={onClear}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <ThemedText type="small">×</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir categoría"
            onPress={openSheet}
            style={({ pressed }) => [styles.triggerLabel, pressed && styles.pressed]}>
            <ThemedText type="small" numberOfLines={1} style={styles.triggerLabelText}>
              Añadir categoría +
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      <Modal transparent animationType="slide" visible={isSheetVisible} onRequestClose={closeSheet}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de categorías"
          onPress={closeSheet}
          style={styles.backdrop}>
          {/* El Pressable vacío evita que los toques dentro del panel cierren la hoja. */}
          <Pressable onPress={() => undefined}>
            <ThemedView style={styles.sheet}>
              <ThemedText type="smallBold" style={styles.sheetTitle}>
                Elige una categoría
              </ThemedText>

              {isLoading ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando categorías…
                </ThemedText>
              ) : null}

              {errorMessage ? (
                <ThemedText type="small" style={styles.errorText}>
                  {errorMessage}
                </ThemedText>
              ) : null}

              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Categoría ${category.name}`}
                  onPress={() => handleSelectCategory(category.id)}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <ThemedText type="default">{category.name}</ThemedText>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Categoría Otros"
                onPress={handleOpenOtherModal}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <ThemedText type="default">Otros</ThemedText>
              </Pressable>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={isOtherModalVisible}
        onRequestClose={closeOtherModal}>
        <ThemedView style={styles.otherBackdrop}>
          <ThemedView style={styles.otherCard}>
            <ThemedText type="smallBold">Categoría personalizada</ThemedText>
            <TextInput
              accessibilityLabel="Categoría personalizada"
              value={otherInputText}
              onChangeText={setOtherInputText}
              placeholder="Escribe la categoría"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[
                styles.otherInput,
                { color: theme.text, borderColor: theme.backgroundSelected },
              ]}
            />

            <ThemedView style={styles.otherActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar categoría personalizada"
                onPress={closeOtherModal}
                style={({ pressed }) => [styles.otherButton, pressed && styles.pressed]}>
                <ThemedText type="small">Cancelar</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Guardar categoría personalizada"
                disabled={isSaveDisabled}
                onPress={handleSaveOther}
                style={({ pressed }) => [
                  styles.otherButton,
                  (pressed || isSaveDisabled) && styles.pressed,
                ]}>
                <ThemedText type="smallBold">Guardar</ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.one,
    maxWidth: '100%',
  },
  triggerLabel: {
    flexShrink: 1,
  },
  triggerLabelText: {
    flexShrink: 1,
  },
  clearButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  sheetTitle: {
    marginBottom: Spacing.one,
  },
  option: {
    paddingVertical: Spacing.four,
  },
  otherBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  otherCard: {
    width: '100%',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  otherInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  otherActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  otherButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  errorText: {
    color: '#d92d20',
  },
  pressed: {
    opacity: 0.7,
  },
});
