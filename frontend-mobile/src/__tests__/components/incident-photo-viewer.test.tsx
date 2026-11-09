/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { IncidentPhotoViewer } from '@/components/incident-photo-viewer';
import type { CreatedIncidentImage } from '@/types/incident';

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test (mismo patrón
// que `photo-picker.test.tsx`).
jest.mock('@/global.css', () => ({}));

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
});
