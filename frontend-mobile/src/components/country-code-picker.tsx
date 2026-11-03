import { useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COUNTRIES } from '@/constants/countries';
import { Spacing } from '@/constants/theme';
import type { Country } from '@/types/country';

export interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

// Selector compacto de prefijo telefónico: muestra el país elegido en un
// trigger reducido y delega la elección en una hoja inferior deslizante.
export function CountryCodePicker({ selectedCountry, onSelectCountry }: CountryCodePickerProps) {
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
      <ThemedView type="backgroundElement" style={styles.trigger}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cambiar prefijo de país, actual: ${selectedCountry.name} ${selectedCountry.dialCode}`}
          onPress={openSheet}
          style={({ pressed }) => [styles.triggerLabel, pressed && styles.pressed]}>
          <ThemedText type="small" numberOfLines={1} style={styles.triggerLabelText}>
            {selectedCountry.flagEmoji} {selectedCountry.isoCode} {selectedCountry.dialCode}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <Modal transparent animationType="slide" visible={isSheetVisible} onRequestClose={closeSheet}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de prefijo de país"
          onPress={closeSheet}
          style={styles.backdrop}>
          {/* El Pressable vacío evita que los toques dentro del panel cierren la hoja. */}
          <Pressable onPress={() => undefined}>
            <ThemedView style={styles.sheet}>
              <ThemedText type="smallBold" style={styles.sheetTitle}>
                Elige un país
              </ThemedText>

              {COUNTRIES.map((country) => (
                <Pressable
                  key={country.isoCode}
                  accessibilityRole="button"
                  accessibilityLabel={`Prefijo de ${country.name} ${country.dialCode}`}
                  onPress={() => handleSelectCountry(country)}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <ThemedText type="default">
                    {country.flagEmoji} {country.name} {country.dialCode}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  triggerLabel: {
    flexShrink: 1,
  },
  triggerLabelText: {
    flexShrink: 1,
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
  pressed: {
    opacity: 0.7,
  },
});
