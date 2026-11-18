import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { CreatedIncidentImage } from '@/types/incident';

export interface IncidentPhotoViewerProps {
  images: CreatedIncidentImage[];
}

// Alto fijo de cada página del visor. El ancho de cada página es el ancho real
// del contenedor, medido con `onLayout`, para que `pagingEnabled` encaje con el
// ancho visible también en web (contenedor limitado por `MaxContentWidth`).
// Hasta que llega la primera medición se usa el ancho de la ventana, de modo que
// la lista se pinta desde el primer render (sin parpadeo) y se corrige sola.
const VIEWER_HEIGHT = 240;

// Visor horizontal de fotos de una incidencia (detalle, solo lectura).
// Componente 100% presentacional: recibe las imágenes ya resueltas
// (`images[].url`) y no depende de sesión, red ni navegación.
export function IncidentPhotoViewer({ images }: IncidentPhotoViewerProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Ancho medido del contenedor; 0 hasta el primer layout.
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const pageWidth = measuredWidth > 0 ? measuredWidth : windowWidth;

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  };

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
    <View testID="incident-photo-viewer" style={{ height: VIEWER_HEIGHT }} onLayout={handleContainerLayout}>
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
            style={{ width: pageWidth, height: VIEWER_HEIGHT }}
          />
        )}
      />
    </View>
  );
}
