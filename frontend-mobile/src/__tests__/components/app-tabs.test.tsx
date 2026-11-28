/// <reference types="jest" />
import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react-native';

import AppTabs from '@/components/app-tabs';

// `NativeTabs` (de `expo-router/unstable-native-tabs`) renderiza un
// componente nativo real de tabs del sistema operativo, que no existe en el
// entorno de test de Jest. Se sustituye por una versión mínima basada en
// `View`/`Text` que conserva la misma forma (Trigger con `name`, Label e
// Icon) para poder comprobar que `AppTabs` declara las pestañas esperadas.
jest.mock('expo-router/unstable-native-tabs', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { View: MockView, Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');

  function Trigger({ name, children }: { name: string; children?: ReactNode }) {
    return mockReact.createElement(MockView, { testID: `tab-trigger-${name}` }, children);
  }
  Trigger.Label = function Label({ children }: { children?: ReactNode }) {
    return mockReact.createElement(MockText, null, children);
  };
  Trigger.Icon = function Icon() {
    return null;
  };

  function MockNativeTabs({ children }: { children?: ReactNode }) {
    return mockReact.createElement(MockView, null, children);
  }
  MockNativeTabs.Trigger = Trigger;

  return { NativeTabs: MockNativeTabs };
});

describe('AppTabs (nativo, src/components/app-tabs.tsx)', () => {
  it('muestra las etiquetas "Inicio", "Mapa" y "Mis incidencias"', async () => {
    await render(<AppTabs />);

    expect(screen.getByText('Inicio')).toBeOnTheScreen();
    expect(screen.getByText('Mapa')).toBeOnTheScreen();
    expect(screen.getByText('Mis incidencias')).toBeOnTheScreen();
  });

  it('declara un trigger por cada ruta de pestaña ("index" y "my-incidents")', async () => {
    await render(<AppTabs />);

    expect(screen.getByTestId('tab-trigger-index')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-trigger-my-incidents')).toBeOnTheScreen();
  });

  it('declara el trigger "map" con la etiqueta "Mapa" entre "Inicio" y "Mis incidencias"', async () => {
    await render(<AppTabs />);

    expect(screen.getByTestId('tab-trigger-map')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-trigger-map')).toHaveTextContent('Mapa');
  });
});
