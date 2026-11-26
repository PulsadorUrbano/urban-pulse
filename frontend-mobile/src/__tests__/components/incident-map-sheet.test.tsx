/// <reference types="jest" />
import { router } from 'expo-router';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { IncidentMapSheet } from '@/components/incident-map-sheet';
import { STATUS_LABELS } from '@/components/incident-status-badge';
import type { CreatedIncidentImage } from '@/types/incident';
import type { MapIncident } from '@/types/incident-map';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Se sustituye el visor de fotos por un `View` que expone las imágenes recibidas;
// su comportamiento interno ya está cubierto en `incident-photo-viewer.test.tsx`.
// `react-native-reanimated` arrastra `react-native-worklets`, cuyo módulo nativo no
// existe en Jest. Se sustituye `Animated.View` por un `View` que reenvía props; la
// animación `SlideInDown` no es observable en estos tests, así que solo se simula su API.
jest.mock('react-native-reanimated', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  const AnimatedView = (props: Record<string, unknown> & { children?: React.ReactNode }) =>
    mockReact.createElement(MockView, props, props.children);
  const slideInDownBuilder = { duration: () => slideInDownBuilder };

  return {
    __esModule: true,
    default: { View: AnimatedView },
    SlideInDown: slideInDownBuilder,
  };
});

jest.mock('@/components/incident-photo-viewer', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IncidentPhotoViewer: (props: { images: { id: string }[] }) =>
      mockReact.createElement(MockView, {
        testID: 'incident-photo-viewer',
        accessibilityLabel: `visor con ${props.images.length} fotos`,
      }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const safeAreaContext = jest.requireActual(
    'react-native-safe-area-context',
  ) as Record<string, unknown>;

  return {
    ...safeAreaContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  };
});

const mockedRouterPush = router.push as jest.Mock;

function buildCreatedIncidentImage(index: number): CreatedIncidentImage {
  return {
    id: `image-${index}`,
    url: `https://picsum.photos/seed/sheet-${index}/800/600`,
    mimeType: 'image/jpeg',
    createdAt: '2026-10-24T10:00:00.000Z',
  };
}

function buildMapIncident(overrides: Partial<MapIncident> = {}): MapIncident {
  return {
    id: 'incident-42',
    title: 'Farola fundida en la calle Mayor',
    status: 'in_progress',
    category: 'Alumbrado',
    categoryId: 'category-lighting',
    latitude: 40.4168,
    longitude: -3.7038,
    createdAt: '2026-10-24T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

describe('IncidentMapSheet', () => {
  beforeEach(() => {
    mockedRouterPush.mockClear();
  });

  it('con incident null no renderiza nada', async () => {
    await render(<IncidentMapSheet incident={null} onClose={jest.fn()} />);

    expect(screen.queryByTestId('incident-map-sheet')).not.toBeOnTheScreen();
    expect(screen.queryByText('Ver detalle')).not.toBeOnTheScreen();
  });

  it('con una incidencia muestra su título', async () => {
    const incident = buildMapIncident({ title: 'Bache en la avenida' });

    await render(<IncidentMapSheet incident={incident} onClose={jest.fn()} />);

    expect(screen.getByTestId('incident-map-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Bache en la avenida')).toBeOnTheScreen();
  });

  it.each([
    ['reported', 'Reportada'],
    ['in_progress', 'En curso'],
    ['resolved', 'Resuelta'],
  ] as const)('muestra la etiqueta de estado para "%s"', async (status, expectedLabel) => {
    await render(
      <IncidentMapSheet incident={buildMapIncident({ status })} onClose={jest.fn()} />,
    );

    expect(expectedLabel).toBe(STATUS_LABELS[status]);
    expect(screen.getByText(expectedLabel)).toBeOnTheScreen();
  });

  it('sin bottomOffset aplica bottom 0 al contenedor del sheet', async () => {
    await render(<IncidentMapSheet incident={buildMapIncident()} onClose={jest.fn()} />);

    const sheetStyle = StyleSheet.flatten(screen.getByTestId('incident-map-sheet').props.style);
    expect(sheetStyle.bottom).toBe(0);
  });

  it('con bottomOffset aplica ese valor a style.bottom del contenedor del sheet', async () => {
    await render(
      <IncidentMapSheet incident={buildMapIncident()} onClose={jest.fn()} bottomOffset={50} />,
    );

    const sheetStyle = StyleSheet.flatten(screen.getByTestId('incident-map-sheet').props.style);
    expect(sheetStyle.bottom).toBe(50);
  });

  it('muestra la categoría de la incidencia', async () => {
    await render(
      <IncidentMapSheet
        incident={buildMapIncident({ category: 'Alumbrado' })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Alumbrado')).toBeOnTheScreen();
  });

  it('con category null muestra "Sin categoría"', async () => {
    await render(
      <IncidentMapSheet
        incident={buildMapIncident({ category: null, categoryId: null })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Sin categoría')).toBeOnTheScreen();
  });

  it('con images vacío muestra "Sin fotos" y no renderiza el visor', async () => {
    await render(
      <IncidentMapSheet incident={buildMapIncident({ images: [] })} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Sin fotos')).toBeOnTheScreen();
    expect(screen.queryByTestId('incident-photo-viewer')).not.toBeOnTheScreen();
  });

  it('con imágenes renderiza el visor con todas ellas y no muestra "Sin fotos"', async () => {
    const images = [buildCreatedIncidentImage(1), buildCreatedIncidentImage(2)];

    await render(
      <IncidentMapSheet incident={buildMapIncident({ images })} onClose={jest.fn()} />,
    );

    expect(screen.getByTestId('incident-photo-viewer')).toBeOnTheScreen();
    expect(screen.getByLabelText('visor con 2 fotos')).toBeOnTheScreen();
    expect(screen.queryByText('Sin fotos')).not.toBeOnTheScreen();
  });

  it('"Ver detalle" navega con router.push a /incidents/<id>', async () => {
    await render(
      <IncidentMapSheet incident={buildMapIncident({ id: 'incident-42' })} onClose={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Ver detalle' }));

    expect(mockedRouterPush).toHaveBeenCalledTimes(1);
    expect(mockedRouterPush).toHaveBeenCalledWith('/incidents/incident-42');
  });

  it('"Ver detalle" usa el id de la incidencia actual tras cambiar de incidencia', async () => {
    const { rerender } = await render(
      <IncidentMapSheet incident={buildMapIncident({ id: 'incident-1' })} onClose={jest.fn()} />,
    );

    await rerender(
      <IncidentMapSheet incident={buildMapIncident({ id: 'incident-2' })} onClose={jest.fn()} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Ver detalle' }));

    expect(mockedRouterPush).toHaveBeenCalledWith('/incidents/incident-2');
  });

  it('"Cerrar" llama a onClose una vez', async () => {
    const onClose = jest.fn();
    await render(<IncidentMapSheet incident={buildMapIncident()} onClose={onClose} />);

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedRouterPush).not.toHaveBeenCalled();
  });
});
