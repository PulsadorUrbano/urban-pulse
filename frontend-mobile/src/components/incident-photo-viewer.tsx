import { Image } from 'expo-image';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { CreatedIncidentImage } from '@/types/incident';

export interface IncidentPhotoViewerProps {
  images: CreatedIncidentImage[];
}

// Alto fijo de cada página del visor. El ancho de cada página se calcula a
// partir del ancho de la ventana (`useWindowDimensions`) para que
// `pagingEnabled` encaje con el ancho visible en móvil; en web, dentro de un
// contenedor limitado por `MaxContentWidth`, el paginado puede quedar
// ligeramente desalineado en pantallas muy anchas (decisión menor del dev,
// sin impacto en móvil que es el caso de uso principal).
const VIEWER_HEIGHT = 240;

// Visor horizontal de fotos de una incidencia (detalle, solo lectura).
// Componente 100% presentacional: recibe las imágenes ya resueltas
// (`images[].url`) y no depende de sesión, red ni navegación.
export function IncidentPhotoViewer({ images }: IncidentPhotoViewerProps) {
  const { width: windowWidth } = useWindowDimensions();

  // Sin fotos adjuntas: placeholder discreto en vez de `null`, para dejar
  // explícito al usuario que la incidencia no tiene imágenes (mismo criterio
  // de estados vacíos explícitos ya usado en el resto de la feature, en vez
  // de omitir el bloque en silencio).
  if (images.length === 0) {
    return (
      <ThemedView type="backgroundElement" className="items-center justify-center rounded-2xl p-4">
        <ThemedText type="small" themeColor="textSecondary">
          Sin fotos adjuntas
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={{ height: VIEWER_HEIGHT }}>
      <FlatList
        horizontal
        pagingEnabled
        data={images}
        keyExtractor={(image) => image.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            accessibilityRole="image"
            accessibilityLabel="Foto de la incidencia"
            contentFit="cover"
            style={{ width: windowWidth, height: VIEWER_HEIGHT }}
          />
        )}
      />
    </View>
  );
}
