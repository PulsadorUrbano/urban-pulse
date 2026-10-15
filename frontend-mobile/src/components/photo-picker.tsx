import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MAX_SELECTED_PHOTOS } from '@/hooks/use-photo-attachment';
import { useTheme } from '@/hooks/use-theme';

export interface PhotoPickerProps {
  selectedPhotoUris: string[];
  isProcessingPhoto: boolean;
  errorMessage: string | null;
  disabled?: boolean;
  onAttachFromCamera: () => void;
  onAttachFromLibrary: () => void;
  onRemovePhoto: (uri: string) => void;
}

// Lado del cuadrado de cada miniatura y del recuadro de añadir. Los tiles lo
// reciben vía `style` inline (fuente única de este tamaño; los tests lo
// asertan) mientras el resto de estilos vive en `className`.
export const PHOTO_TILE_SIZE = 120;

// Retardo (ms) para esperar la animación de cierre del `Modal` (`slide`,
// ~300 ms) antes de lanzar el picker nativo. Si el picker se presenta en el
// mismo tick en que la hoja empieza a cerrarse, la promesa de
// `launchImageLibraryAsync` queda colgada para siempre en iOS y la app se
// queda pillada con `isProcessingPhoto` eterno (expo/expo#8213).
export const SHEET_DISMISS_DELAY_MS = 350;

// Origen de la foto elegido en la hoja inferior.
type PhotoSource = 'camera' | 'library';

// Fila horizontal de fotos adjuntas con recuadro de añadir al final. Componente
// 100% presentacional: recibe el estado y los callbacks del hook que lo use.
export function PhotoPicker({
  selectedPhotoUris,
  isProcessingPhoto,
  errorMessage,
  disabled = false,
  onAttachFromCamera,
  onAttachFromLibrary,
  onRemovePhoto,
}: PhotoPickerProps) {
  const theme = useTheme();

  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Origen elegido en la hoja y pendiente de lanzar una vez que el `Modal`
  // termine su animación de cierre. Vive en un ref: no afecta al render.
  const pendingSourceRef = useRef<PhotoSource | null>(null);

  // Id del timer que lanza el picker nativo tras el cierre de la hoja.
  const sheetLaunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al desmontar se cancela el timer pendiente para no lanzar el picker
  // nativo (y adjuntar una foto) después de salir de la pantalla.
  useEffect(() => {
    return () => {
      if (sheetLaunchTimerRef.current !== null) {
        clearTimeout(sheetLaunchTimerRef.current);
      }
    };
  }, []);

  // El recuadro de añadir queda inutilizable mientras se procesa una foto.
  const isAddTileDisabled = disabled || isProcessingPhoto;

  // Abre la hoja de selección de origen (cámara o galería).
  const openSheet = () => {
    setIsSheetVisible(true);
  };

  // Cierra la hoja sin elegir origen y descarta el origen pendiente: si la
  // hoja se vuelve a abrir y cerrar antes de que salte el timer, este
  // encontrará `pendingSourceRef` a `null` y no lanzará ningún picker.
  const closeSheet = () => {
    setIsSheetVisible(false);
    pendingSourceRef.current = null;
  };

  // Cierra la hoja y lanza el flujo de adjunto del origen elegido.
  //
  // El lanzamiento se retrasa `SHEET_DISMISS_DELAY_MS` ms porque, si el picker
  // nativo se presenta en el mismo tick en que el `Modal` empieza su animación
  // de cierre, la promesa nunca se resuelve en iOS y la app se queda pillada
  // con `isProcessingPhoto` eterno (expo/expo#8213).
  const handleSelectSource = (source: PhotoSource) => {
    pendingSourceRef.current = source;
    setIsSheetVisible(false);

    // Se descarta un timer anterior por si la hoja se reabrió y se eligió otro
    // origen antes del retardo: solo debe lanzarse el picker de la última
    // elección.
    if (sheetLaunchTimerRef.current !== null) {
      clearTimeout(sheetLaunchTimerRef.current);
    }

    sheetLaunchTimerRef.current = setTimeout(() => {
      sheetLaunchTimerRef.current = null;
      const pendingSource = pendingSourceRef.current;
      pendingSourceRef.current = null;

      if (pendingSource === 'camera') {
        onAttachFromCamera();
      } else if (pendingSource === 'library') {
        onAttachFromLibrary();
      }
      // `pendingSource === null`: la hoja se abrió/cerró de nuevo entre medias
      // (o el componente se desmontó); no hay origen pendiente, no se hace nada.
    }, SHEET_DISMISS_DELAY_MS);
  };

  // Cuadrado con la miniatura de una foto y su botón "×" para quitarla.
  const renderPhotoTile = (uri: string) => (
    <ThemedView
      type="backgroundElement"
      className="overflow-hidden rounded-2xl"
      style={{ width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE }}>
      <Image
        source={{ uri }}
        // `expo-image` no está interopado por NativeWind, así que `flex: 1`
        // (estirar la miniatura al tile) se mantiene como estilo inline.
        style={{ flex: 1 }}
        contentFit="cover"
        accessibilityLabel="Foto adjunta"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitar foto"
        accessibilityState={{ disabled }}
        hitSlop={Spacing.two}
        disabled={disabled}
        onPress={() => onRemovePhoto(uri)}
        className={`absolute top-1 right-1 h-6 w-6 items-center justify-center rounded-full bg-black/55 active:opacity-70${
          disabled ? ' opacity-70' : ''
        }`}>
        <Text className="text-sm font-medium text-white">×</Text>
      </Pressable>
    </ThemedView>
  );

  // Estado vacío (sin fotos adjuntas): un único recuadro pulsable centrado con
  // un "+" grande y un texto de invitación a añadir imágenes.
  const renderEmptyState = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Añadir imágenes"
      accessibilityState={{ disabled: isAddTileDisabled }}
      disabled={isAddTileDisabled}
      onPress={openSheet}
      className={`items-center justify-center gap-2 active:opacity-70${
        isAddTileDisabled ? ' opacity-70' : ''
      }`}>
      {isProcessingPhoto ? (
        <ActivityIndicator />
      ) : (
        <MaterialIcons name="add" size={48} color={theme.textSecondary} />
      )}
      <ThemedText type="small" themeColor="textSecondary" className="text-center">
        ¿Desea añadir imágenes?
      </ThemedText>
    </Pressable>
  );

  // Recuadro de añadir: un único "+" centrado que abre la hoja inferior de
  // origen de la foto. Sin borde ni fondo para alinearse visualmente con las
  // miniaturas; mientras se procesa una foto muestra el indicador de carga.
  const renderAddTile = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Añadir imagen"
      accessibilityState={{ disabled: isAddTileDisabled }}
      disabled={isAddTileDisabled}
      onPress={openSheet}
      className={`items-center justify-center active:opacity-70${
        isAddTileDisabled ? ' opacity-70' : ''
      }`}
      style={{ width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE }}>
      {isProcessingPhoto ? (
        <ActivityIndicator />
      ) : (
        <MaterialIcons name="add" size={30} color={theme.textSecondary} />
      )}
    </Pressable>
  );

  return (
    <>
      {selectedPhotoUris.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <FlatList
            horizontal
            data={selectedPhotoUris}
            keyExtractor={(uri) => uri}
            renderItem={({ item }) => renderPhotoTile(item)}
            ListFooterComponent={
              selectedPhotoUris.length < MAX_SELECTED_PHOTOS ? renderAddTile : null
            }
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          />
          {selectedPhotoUris.length >= MAX_SELECTED_PHOTOS ? (
            // El color semántico de `ThemedText` se aplica vía `style` inline,
            // por lo que `className="text-[#d92d20]"` quedaría pisado; el rojo
            // de error se fuerza con `style` para garantizarlo.
            <ThemedText type="small" style={{ color: '#d92d20' }}>
              El número máximo de imágenes son 8
            </ThemedText>
          ) : null}
        </>
      )}

      {errorMessage ? (
        <Text className="text-sm font-medium text-[#d92d20]">{errorMessage}</Text>
      ) : null}

      <Modal transparent animationType="slide" visible={isSheetVisible} onRequestClose={closeSheet}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de fotos"
          onPress={closeSheet}
          className="flex-1 justify-end bg-black/40">
          {/* El Pressable vacío evita que los toques dentro del panel cierren la hoja. */}
          <Pressable onPress={() => undefined}>
            <ThemedView className="gap-2 rounded-t-3xl px-6 pb-8 pt-6">
              <ThemedText type="smallBold" className="mb-1">
                Elige la fuente
              </ThemedText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cámara"
                onPress={() => handleSelectSource('camera')}
                className="active:opacity-70 py-6">
                <ThemedText type="default">Cámara</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Galería"
                onPress={() => handleSelectSource('library')}
                className="active:opacity-70 py-6">
                <ThemedText type="default">Galería</ThemedText>
              </Pressable>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
