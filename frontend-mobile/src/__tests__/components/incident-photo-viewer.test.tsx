/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { IncidentPhotoViewer } from '@/components/incident-photo-viewer';
import type { CreatedIncidentImage } from '@/types/incident';

// `expo-image` renderiza una vista nativa (`ViewManagerAdapter_ExpoImage`) que
// RNTL no considera accesible, por lo que `getAllByRole('image')` no la encuentra
// y la prop `source` no llega al host. Se sustituye por un `View` host que
// reenvía todas las props y se marca como accesible, manteniendo el contrato
// observable (`accessibilityRole`, `accessibilityLabel`, `source`).
jest.mock('expo-image', () => {
  // `jest.mock` no permite referenciar variables externas fuera de un scope
  // permitido; se usa `jest.requireActual` en vez de `require()` directo
  // para evitar también el warning de lint `no-require-imports` (mismo
  // patrón que `incident-detail-screen.test.tsx`).
  const mockReact = jest.requireActual<typeof React>('react');

  return {
    Image: (props: Record<string, unknown>) =>
      mockReact.createElement('View', { ...props, accessible: true }),
  };
});

const INCIDENT_IMAGE_ACCESSIBILITY_LABEL = 'Foto de la incidencia';

function buildIncidentImage(index: number): CreatedIncidentImage {
  return {
    id: `image-${index}`,
    url: `https://picsum.photos/seed/incident-${index}/800/600`,
    mimeType: 'image/jpeg',
    createdAt: '2026-10-24T10:00:00.000Z',
  };
}

// Simula el primer layout del contenedor con el ancho indicado.
async function layoutViewer(width: number) {
  const container = screen.getByTestId('incident-photo-viewer');
  await fireEvent(container, 'layout', { nativeEvent: { layout: { width, height: 240, x: 0, y: 0 } } });
}

describe('IncidentPhotoViewer', () => {
  it('con una sola imagen renderiza exactamente un elemento de imagen con su uri', async () => {
    const images = [buildIncidentImage(1)];

    await render(<IncidentPhotoViewer images={images} />);

    const renderedImages = screen.getAllByRole('image');
    expect(renderedImages).toHaveLength(1);
    expect(renderedImages[0]).toHaveProp('accessibilityLabel', INCIDENT_IMAGE_ACCESSIBILITY_LABEL);
    expect(renderedImages[0]).toHaveProp('source', { uri: images[0].url });
  });

  it('con tres imágenes renderiza exactamente tres elementos de imagen, cada uno con el uri de su posición', async () => {
    const images = [buildIncidentImage(1), buildIncidentImage(2), buildIncidentImage(3)];

    await render(<IncidentPhotoViewer images={images} />);

    const renderedImages = screen.getAllByRole('image');
    expect(renderedImages).toHaveLength(3);
    renderedImages.forEach((renderedImage, index) => {
      expect(renderedImage).toHaveProp('accessibilityLabel', INCIDENT_IMAGE_ACCESSIBILITY_LABEL);
      expect(renderedImage).toHaveProp('source', { uri: images[index].url });
    });
  });

  it('con images vacío no lanza error, no renderiza imágenes y muestra "Sin fotos adjuntas"', async () => {
    await render(<IncidentPhotoViewer images={[]} />);

    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(screen.getByText('Sin fotos adjuntas')).toBeOnTheScreen();
  });

  it('antes del layout renderiza las imágenes con el ancho de la ventana', async () => {
    await render(<IncidentPhotoViewer images={[buildIncidentImage(1)]} />);

    const imageStyle = StyleSheet.flatten(screen.getAllByRole('image')[0].props.style);
    expect(imageStyle.width).toBe(Dimensions.get('window').width);
  });

  it('tras el layout cada página usa el ancho medido del contenedor, no el de la ventana', async () => {
    await render(<IncidentPhotoViewer images={[buildIncidentImage(1)]} />);
    await layoutViewer(320);

    const imageStyle = StyleSheet.flatten(screen.getAllByRole('image')[0].props.style);
    expect(imageStyle.width).toBe(320);
  });
});
