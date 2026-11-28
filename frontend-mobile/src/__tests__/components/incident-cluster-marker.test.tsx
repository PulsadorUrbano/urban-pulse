/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { IncidentClusterMarker } from '@/components/incident-cluster-marker';
import type { ClusterItem } from '@/utils/map/incident-clusters';

// `react-native-maps` necesita el módulo nativo del mapa, que no existe en Jest.
// Se sustituye `Marker` por un `View` host que reenvía las props (`coordinate`,
// `onPress`, `accessibilityLabel`) y los `children` para poder inspeccionarlos.
jest.mock('react-native-maps', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  function Marker(props: Record<string, unknown> & { children?: React.ReactNode }) {
    return mockReact.createElement(MockView, { ...props, testID: 'map-cluster-marker' }, props.children);
  }

  return { __esModule: true, default: Marker, Marker };
});

function buildCluster(overrides: Partial<ClusterItem> = {}): ClusterItem {
  return {
    type: 'cluster',
    id: 7,
    count: 4,
    latitude: 40.4168,
    longitude: -3.7038,
    ...overrides,
  };
}

describe('IncidentClusterMarker', () => {
  it('muestra el número de incidencias agrupadas', async () => {
    await render(<IncidentClusterMarker cluster={buildCluster({ count: 4 })} onPress={jest.fn()} />);

    expect(screen.getByText('4')).toBeOnTheScreen();
  });

  it('muestra un contador de varios dígitos sin truncarlo', async () => {
    await render(<IncidentClusterMarker cluster={buildCluster({ count: 128 })} onPress={jest.fn()} />);

    expect(screen.getByText('128')).toBeOnTheScreen();
  });

  it('se posiciona en la latitud y longitud del cluster', async () => {
    const cluster = buildCluster({ latitude: 39.4699, longitude: -0.3763 });

    await render(<IncidentClusterMarker cluster={cluster} onPress={jest.fn()} />);

    expect(screen.getByTestId('map-cluster-marker')).toHaveProp('coordinate', {
      latitude: 39.4699,
      longitude: -0.3763,
    });
  });

  it('expone en accessibilityLabel el número de incidencias agrupadas', async () => {
    await render(<IncidentClusterMarker cluster={buildCluster({ count: 4 })} onPress={jest.fn()} />);

    expect(screen.getByLabelText('4 incidencias agrupadas')).toBeOnTheScreen();
  });

  it('desactiva tracksViewChanges para no re-renderizar en cada frame del mapa', async () => {
    await render(<IncidentClusterMarker cluster={buildCluster()} onPress={jest.fn()} />);

    expect(screen.getByTestId('map-cluster-marker')).toHaveProp('tracksViewChanges', false);
  });

  it('al pulsar el cluster llama a onPress una vez con el cluster completo', async () => {
    const cluster = buildCluster({ id: 99, count: 3 });
    const onPress = jest.fn();
    await render(<IncidentClusterMarker cluster={cluster} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('3 incidencias agrupadas'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(cluster);
  });
});
