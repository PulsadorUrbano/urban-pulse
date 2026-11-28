/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { IncidentMapMarker } from '@/components/incident-map-marker';
import type { MapIncident } from '@/types/incident-map';
import { getCategoryColor } from '@/utils/map/category-colors';

// `react-native-maps` necesita el módulo nativo del mapa, que no existe en Jest.
// Se sustituye `Marker` por un `View` host que reenvía todas las props (incluidos
// `coordinate`, `onPress`, `accessibilityLabel`) y los `children`, de modo que el
// test puede inspeccionar el contrato observable del marcador.
jest.mock('react-native-maps', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  function Marker(props: Record<string, unknown> & { children?: React.ReactNode }) {
    return mockReact.createElement(MockView, { ...props, testID: 'map-marker' }, props.children);
  }

  return { __esModule: true, default: Marker, Marker };
});

function buildMapIncident(overrides: Partial<MapIncident> = {}): MapIncident {
  return {
    id: 'incident-1',
    title: 'Farola fundida en la calle Mayor',
    status: 'reported',
    category: 'Alumbrado',
    categoryId: 'category-lighting',
    latitude: 40.4168,
    longitude: -3.7038,
    createdAt: '2026-10-24T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

// Devuelve el `View` host que pinta el círculo del marcador (el hijo con backgroundColor).
// RNTL v14 expone `queryAll` sobre cada elemento; los hosts nativos tienen `type` como string.
function findMarkerDot(markerElement: ReturnType<typeof screen.getByTestId>) {
  const dotCandidates = markerElement.queryAll(
    (instance) =>
      instance.type === 'View' &&
      StyleSheet.flatten(instance.props.style)?.backgroundColor !== undefined,
  );
  expect(dotCandidates.length).toBeGreaterThan(0);
  return dotCandidates[0];
}

describe('IncidentMapMarker', () => {
  it('se posiciona en la latitud y longitud de la incidencia', async () => {
    const incident = buildMapIncident({ latitude: 39.4699, longitude: -0.3763 });

    await render(<IncidentMapMarker incident={incident} onPress={jest.fn()} />);

    expect(screen.getByTestId('map-marker')).toHaveProp('coordinate', {
      latitude: 39.4699,
      longitude: -0.3763,
    });
  });

  it('usa el título de la incidencia como accessibilityLabel del marcador', async () => {
    const incident = buildMapIncident({ title: 'Bache en la avenida' });

    await render(<IncidentMapMarker incident={incident} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Bache en la avenida')).toBeOnTheScreen();
  });

  it('desactiva tracksViewChanges para no re-renderizar en cada frame del mapa', async () => {
    await render(<IncidentMapMarker incident={buildMapIncident()} onPress={jest.fn()} />);

    expect(screen.getByTestId('map-marker')).toHaveProp('tracksViewChanges', false);
  });

  it('al pulsar el marcador llama a onPress una vez con la incidencia completa', async () => {
    const incident = buildMapIncident();
    const onPress = jest.fn();
    await render(<IncidentMapMarker incident={incident} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('map-marker'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(incident);
  });

  it('pinta el círculo con el color que devuelve getCategoryColor para su categoría', async () => {
    const incident = buildMapIncident({ category: 'Alumbrado' });

    await render(<IncidentMapMarker incident={incident} onPress={jest.fn()} />);

    const dot = findMarkerDot(screen.getByTestId('map-marker'));
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(
      getCategoryColor('Alumbrado'),
    );
  });

  it('una incidencia sin categoría usa el color neutro de getCategoryColor(null)', async () => {
    const incident = buildMapIncident({ category: null, categoryId: null });

    await render(<IncidentMapMarker incident={incident} onPress={jest.fn()} />);

    const dot = findMarkerDot(screen.getByTestId('map-marker'));
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(getCategoryColor(null));
  });

  it('dos categorías distintas reciben colores distintos según getCategoryColor', async () => {
    const lightingIncident = buildMapIncident({ category: 'Alumbrado' });
    const potholeIncident = buildMapIncident({ id: 'incident-2', category: 'Baches' });

    await render(
      <>
        <IncidentMapMarker incident={lightingIncident} onPress={jest.fn()} />
        <IncidentMapMarker incident={potholeIncident} onPress={jest.fn()} />
      </>,
    );

    const [lightingMarker, potholeMarker] = screen.getAllByTestId('map-marker');
    const lightingColor = StyleSheet.flatten(findMarkerDot(lightingMarker).props.style).backgroundColor;
    const potholeColor = StyleSheet.flatten(findMarkerDot(potholeMarker).props.style).backgroundColor;

    expect(lightingColor).toBe(getCategoryColor('Alumbrado'));
    expect(potholeColor).toBe(getCategoryColor('Baches'));
  });
});
