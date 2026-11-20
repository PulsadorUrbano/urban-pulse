import { useState } from 'react';
import { FlatList, Modal, Pressable, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COUNTRIES } from '@/constants/countries';
import type { Country } from '@/types/country';

// Fracción de la altura de la ventana que puede ocupar la hoja inferior.
const SHEET_MAX_HEIGHT_RATIO = 0.8;

export interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

// Selector compacto de prefijo telefónico: muestra el país elegido en un
// trigger reducido y delega la elección en una hoja inferior deslizante.
export function CountryCodePicker({ selectedCountry, onSelectCountry }: CountryCodePickerProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Abre la hoja de países.
  const openSheet = () => {
    setIsSheetVisible(true);
  };

  // Cierra la hoja de países.
  const closeSheet = () => {
    setIsSheetVisible(false);
  };

  // Selecciona un país y cierra la hoja.
  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    closeSheet();
  };

  return (
    <>
      <ThemedView type="backgroundElement" className="flex-row items-center rounded-2xl px-4 py-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cambiar prefijo de país, actual: ${selectedCountry.name} ${selectedCountry.dialCode}`}
          onPress={openSheet}
          className="shrink active:opacity-70">
          <ThemedText type="small" numberOfLines={1} className="shrink">
            {selectedCountry.flagEmoji} {selectedCountry.isoCode} {selectedCountry.dialCode}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <Modal transparent animationType="slide" visible={isSheetVisible} onRequestClose={closeSheet}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de prefijo de país"
          onPress={closeSheet}
          className="flex-1 justify-end bg-black/40">
          {/* El View captura el toque dentro del panel para que no cierre la hoja; a diferencia
              de un Pressable vacío, no compite con el gesto de scroll de la lista. */}
          <View onStartShouldSetResponder={() => true}>
            <ThemedView
              className="gap-2 rounded-t-3xl px-6 pb-8 pt-6"
              style={{ maxHeight: windowHeight * SHEET_MAX_HEIGHT_RATIO }}>
              <ThemedText type="smallBold" className="mb-1">
                Elige un país
              </ThemedText>

              <FlatList
                data={COUNTRIES}
                keyExtractor={(country) => country.isoCode}
                className="shrink grow-0"
                contentContainerClassName="gap-2"
                renderItem={({ item: country }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Prefijo de ${country.name} ${country.dialCode}`}
                    onPress={() => handleSelectCountry(country)}
                    className="active:opacity-70 py-6">
                    <ThemedText type="default">
                      {country.flagEmoji} {country.name} {country.dialCode}
                    </ThemedText>
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
