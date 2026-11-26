/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';
import React from 'react';

// Importa explícitamente la variante web para no depender de la resolución de plataforma de Jest.
import { IncidentMap } from '@/components/incident-map.web';
import type { MapIncident } from '@/types/incident-map';

function buildMapIncident(overrides: Partial<MapIncident> = {}): MapIncident {
  return {
    id: 'incident-1',
    title: 'Farola fundida en la calle Mayor',
    status: 'reported',
    category: 'Alumbrado',
    categoryId: 'category-lighting',
    latitude: 36.7213,
    longitude: -4.4214,
    createdAt: '2026-10-24T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

describe('IncidentMap (web)', () => {
  it('muestra el aviso de que el mapa solo está disponible en la app móvil', async () => {
    await render(<IncidentMap incidents={[]} onSelectIncident={jest.fn()} />);

    expect(screen.getByText('Mapa disponible solo en la app móvil')).toBeOnTheScreen();
  });

  it('muestra el mismo aviso aunque reciba incidencias y coordenadas a enfocar', async () => {
    await render(
      <IncidentMap
        incidents={[buildMapIncident(), buildMapIncident({ id: 'incident-2' })]}
        onSelectIncident={jest.fn()}
        focusCoordinates={{ latitude: 36.7213, longitude: -4.4214, accuracy: 10 }}
      />,
    );

    expect(screen.getByText('Mapa disponible solo en la app móvil')).toBeOnTheScreen();
  });

  it('no pinta marcadores ni llama a onSelectIncident', async () => {
    const onSelectIncident = jest.fn();
    await render(
      <IncidentMap incidents={[buildMapIncident()]} onSelectIncident={onSelectIncident} />,
    );

    expect(screen.queryByLabelText('Farola fundida en la calle Mayor')).toBeNull();
    expect(onSelectIncident).not.toHaveBeenCalled();
  });
});
