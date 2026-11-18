import { useState } from 'react';
import { FlatList, Modal, Pressable, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/types/category';

// Fracción de la altura de la ventana que puede ocupar la hoja inferior.
const SHEET_MAX_HEIGHT_RATIO = 0.8;

export interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCategory: (categoryId: string) => void;
  onClear: () => void;
}

// Control compacto de categoría: muestra la selección actual en la esquina del
// campo y delega la elección en una hoja inferior. Solo ofrece categorías del
// catálogo activo: el backend rechaza categorías de texto libre.
export function CategoryPicker({
  categories,
  selectedCategoryId,
  isLoading,
  errorMessage,
  onSelectCategory,
  onClear,
}: CategoryPickerProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Se busca la categoría del catálogo por id. Si el id no existe todavía, se
  // usa una etiqueta genérica.
  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId) ?? null
    : null;

  const hasSelection = selectedCategoryId !== null;
  const displayName = selectedCategory?.name ?? (selectedCategoryId !== null ? 'Categoría' : '');

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

  return (
    <>
      <ThemedView
        type="backgroundElement"
        className="max-w-full flex-row items-center rounded-2xl px-4 py-1">
        {hasSelection ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cambiar categoría, actual: ${displayName}`}
              onPress={openSheet}
              className="shrink active:opacity-70">
              <ThemedText type="small" numberOfLines={1} className="shrink">
                {displayName}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar categoría"
              hitSlop={Spacing.two}
              onPress={onClear}
              className="ml-2 px-2 py-0.5 active:opacity-70">
              <ThemedText type="small">×</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir categoría"
            onPress={openSheet}
            className="shrink active:opacity-70">
            <ThemedText type="small" numberOfLines={1} className="shrink">
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
          className="flex-1 justify-end bg-black/40">
          {/* El View captura el toque dentro del panel para que no cierre la hoja; a diferencia
              de un Pressable vacío, no compite con el gesto de scroll de la lista. */}
          <View onStartShouldSetResponder={() => true}>
            <ThemedView
              className="gap-2 rounded-t-3xl px-6 pb-8 pt-6"
              style={{ maxHeight: windowHeight * SHEET_MAX_HEIGHT_RATIO }}>
              <ThemedText type="smallBold" className="mb-1">
                Elige una categoría
              </ThemedText>

              {isLoading ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando categorías…
                </ThemedText>
              ) : null}

              {errorMessage ? (
                // Se fuerza el color vía `style` (no `className`) porque
                // `ThemedText` aplica su color de tema vía `style` inline, que
                // tiene prioridad sobre las clases de NativeWind.
                <ThemedText type="small" style={{ color: theme.error }}>
                  {errorMessage}
                </ThemedText>
              ) : null}

              <FlatList
                data={categories}
                keyExtractor={(category) => category.id}
                className="shrink grow-0"
                contentContainerClassName="gap-2"
                renderItem={({ item: category }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Categoría ${category.name}`}
                    onPress={() => handleSelectCategory(category.id)}
                    className="py-6 active:opacity-70">
                    <ThemedText type="default">{category.name}</ThemedText>
                  </Pressable>
                )}
              />
            </ThemedView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
