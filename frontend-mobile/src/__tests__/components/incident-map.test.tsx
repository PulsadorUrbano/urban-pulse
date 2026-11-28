/// <reference types="jest" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { INITIAL_MAP_REGION, IncidentMap } from '@/components/incident-map';
import type { MapIncident } from '@/types/incident-map';
import type { MapRegion } from '@/utils/map/incident-clusters';

// `react-native-maps` necesita el módulo nativo del mapa, que no existe en Jest.
// `MapView` se sustituye por un `View` host que expone `animateToRegion` mediante
// `useImperativeHandle` y reenvía `onRegionChangeComplete`. `Marker` se sustituye por
// un `View` que reenvía todas sus props (coordinate, onPress, accessibilityLabel) y
// los `children`, igual que en incident-map-marker.test.tsx.
const mockAnimateToRegion = jest.fn();

// Props genéricas del mock: se declaran fuera de la factoría de jest.mock.
type MockProps = { children?: React.ReactNode; [prop: string]: unknown };
type MockMapHandle = { animateToRegion: jest.Mock };

jest.mock('react-native-maps', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  const MockMapView = mockReact.forwardRef(function MockMapView(
    { children, ...restProps }: MockProps,
    ref: React.Ref<MockMapHandle>,
  ) {
    mockReact.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
    return mockReact.createElement(MockView, { ...restProps, testID: 'map-view' }, children);
  });

  function Marker({ children, ...restProps }: MockProps) {
    return mockReact.createElement(MockView, { ...restProps, testID: 'map-marker' }, children);
  }

  return { __esModule: true, default: MockMapView, Marker };
});

// Málaga: coincide con el centro de INITIAL_MAP_REGION.
const MALAGA_LATITUDE = 36.7213;
const MALAGA_LONGITUDE = -4.4214;
// Separación de 0.001 grados (~6 px a zoom 12): se agrupan en la región inicial.
const CLOSE_OFFSET_DEGREES = 0.001;
const ANIMATION_DURATION_MS = 400;
const FOCUS_DELTA = 0.01;

function buildMapIncident(overrides: Partial<MapIncident> = {}): MapIncident {
  return {
    id: 'incident-1',
    title: 'Farola fundida en la calle Mayor',
    status: 'reported',
    category: 'Alumbrado',
    categoryId: 'category-lighting',
    latitude: MALAGA_LATITUDE,
    longitude: MALAGA_LONGITUDE,
    createdAt: '2026-10-24T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

function getClusterLabel(count: number): string {
  return `${count} incidencias agrupadas`;
}

describe('IncidentMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin incidencias no pinta ningún marcador', async () => {
    await render(<IncidentMap incidents={[]} onSelectIncident={jest.fn()} />);

    expect(screen.queryByTestId('map-marker')).toBeNull();
  });

  it('agrupa en un cluster las incidencias cercanas a la región inicial', async () => {
    const incidents = [
      buildMapIncident({ id: 'a', title: 'Bache A' }),
      buildMapIncident({
        id: 'b',
        title: 'Bache B',
        latitude: MALAGA_LATITUDE + CLOSE_OFFSET_DEGREES,
      }),
    ];

    await render(<IncidentMap incidents={incidents} onSelectIncident={jest.fn()} />);

    expect(screen.getByLabelText(getClusterLabel(2))).toBeOnTheScreen();
    expect(screen.queryByLabelText('Bache A')).toBeNull();
    expect(screen.queryByLabelText('Bache B')).toBeNull();
  });

  it('al pulsar un cluster anima la cámara hacia su posición con el zoom de expansión', async () => {
    const incidents = [
      buildMapIncident({ id: 'a' }),
      buildMapIncident({
        id: 'b',
        latitude: MALAGA_LATITUDE + CLOSE_OFFSET_DEGREES,
      }),
    ];
    await render(<IncidentMap incidents={incidents} onSelectIncident={jest.fn()} />);
    const clusterMarker = screen.getByLabelText(getClusterLabel(2));
    const clusterCoordinate = clusterMarker.props.coordinate as {
      latitude: number;
      longitude: number;
    };

    fireEvent.press(clusterMarker);

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    const [targetRegion, duration] = mockAnimateToRegion.mock.calls[0] as [MapRegion, number];
    expect(targetRegion.latitude).toBe(clusterCoordinate.latitude);
    expect(targetRegion.longitude).toBe(clusterCoordinate.longitude);
    // El zoom de expansión es mayor que el inicial, así que el delta debe ser menor.
    expect(targetRegion.longitudeDelta).toBeGreaterThan(0);
    expect(targetRegion.longitudeDelta).toBeLessThan(INITIAL_MAP_REGION.longitudeDelta);
    expect(duration).toBe(ANIMATION_DURATION_MS);
  });

  it('con focusCoordinates informadas anima la cámara con delta 0.01', async () => {
    const focusCoordinates = { latitude: 40.4168, longitude: -3.7038, accuracy: 10 };

    await render(
      <IncidentMap
        incidents={[]}
        onSelectIncident={jest.fn()}
        focusCoordinates={focusCoordinates}
      />,
    );

    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
    expect(mockAnimateToRegion).toHaveBeenCalledWith(
      {
        latitude: 40.4168,
        longitude: -3.7038,
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA,
      },
      ANIMATION_DURATION_MS,
    );
  });

  it('con focusCoordinates null no anima la cámara', async () => {
    await render(
      <IncidentMap incidents={[]} onSelectIncident={jest.fn()} focusCoordinates={null} />,
    );

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it('sin focusCoordinates (undefined por defecto) no anima la cámara', async () => {
    await render(<IncidentMap incidents={[]} onSelectIncident={jest.fn()} />);

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  it('al completar un cambio de región con delta pequeño separa el cluster en marcadores individuales', async () => {
    const incidents = [
      buildMapIncident({ id: 'a', title: 'Bache A' }),
      buildMapIncident({
        id: 'b',
        title: 'Bache B',
        latitude: MALAGA_LATITUDE + CLOSE_OFFSET_DEGREES,
      }),
    ];
    await render(<IncidentMap incidents={incidents} onSelectIncident={jest.fn()} />);
    expect(screen.queryByLabelText('Bache A')).toBeNull();

    const onRegionChangeComplete = screen.getByTestId('map-view').props
      .onRegionChangeComplete as (region: MapRegion) => void;
    await act(async () => {
      onRegionChangeComplete({
        latitude: MALAGA_LATITUDE + CLOSE_OFFSET_DEGREES / 2,
        longitude: MALAGA_LONGITUDE,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    });

    expect(screen.queryByLabelText(getClusterLabel(2))).toBeNull();
    expect(screen.getByLabelText('Bache A')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bache B')).toBeOnTheScreen();
  });

  it('al pulsar un marcador individual llama a onSelectIncident con la incidencia', async () => {
    const incident = buildMapIncident({ title: 'Bache en la avenida' });
    const onSelectIncident = jest.fn();
    await render(<IncidentMap incidents={[incident]} onSelectIncident={onSelectIncident} />);

    fireEvent.press(screen.getByLabelText('Bache en la avenida'));

    expect(onSelectIncident).toHaveBeenCalledTimes(1);
    expect(onSelectIncident).toHaveBeenCalledWith(incident);
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });
});
