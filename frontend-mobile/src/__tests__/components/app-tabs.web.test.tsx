/// <reference types="jest" />
import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import AppTabs, { CustomTabList, TabButton } from '@/components/app-tabs.web';
import { Colors } from '@/constants/theme';

// `Tabs`/`TabList`/`TabTrigger` de `expo-router/ui` necesitan un árbol de
// navegación real (una `Screen` con nombre de archivo resuelto) para saber
// qué pestaña está activa; fuera de ese contexto lanzan
// "No filename found. This is likely a bug in expo-router."
// (ver node_modules/expo-router/build/Route.tsx). Se sustituyen por
// versiones mínimas que solo reenvían a sus hijos, suficientes para
// comprobar que `AppTabs` compone el árbol esperado sin depender del router
// real. La lógica de foco/navegación de `TabTrigger` queda fuera de este
// test; se cubre por separado probando `TabButton` de forma aislada.
jest.mock('expo-router/ui', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');

  const passthrough = ({ children }: { children?: ReactNode }) =>
    mockReact.createElement(mockReact.Fragment, null, children);

  return {
    Tabs: passthrough,
    TabList: passthrough,
    TabTrigger: passthrough,
    TabSlot: () => null,
  };
});

describe('AppTabs (web, src/components/app-tabs.web.tsx)', () => {
  it('muestra la marca "UrbanPulse" y las etiquetas de ambas pestañas', async () => {
    await render(<AppTabs />);

    expect(screen.getByText('UrbanPulse')).toBeOnTheScreen();
    expect(screen.getByText('Inicio')).toBeOnTheScreen();
    expect(screen.getByText('Mis incidencias')).toBeOnTheScreen();
  });
});

describe('TabButton', () => {
  it('con isFocused usa los colores de pestaña activa (fondo seleccionado y texto principal)', async () => {
    await render(<TabButton isFocused>Inicio</TabButton>);

    const label = screen.getByText('Inicio');
    expect(StyleSheet.flatten(label.props.style).color).toBe(Colors.light.text);

    const container = label.parent;
    expect(container).not.toBeNull();
    // `ThemedView` recibe `type="backgroundSelected"` cuando `isFocused` es verdadero.
    expect(StyleSheet.flatten(container?.props.style).backgroundColor).toBe(Colors.light.backgroundSelected);
  });

  it('sin isFocused usa los colores de pestaña inactiva (fondo neutro y texto secundario)', async () => {
    await render(<TabButton isFocused={false}>Mis incidencias</TabButton>);

    const label = screen.getByText('Mis incidencias');
    expect(StyleSheet.flatten(label.props.style).color).toBe(Colors.light.textSecondary);

    const container = label.parent;
    expect(container).not.toBeNull();
    // `ThemedView` recibe `type="backgroundElement"` cuando `isFocused` es falso.
    expect(StyleSheet.flatten(container?.props.style).backgroundColor).toBe(Colors.light.backgroundElement);
  });
});

describe('CustomTabList', () => {
  it('envuelve a sus hijos junto con la marca "UrbanPulse"', async () => {
    await render(
      <CustomTabList>
        <Text>Hijo de prueba</Text>
      </CustomTabList>,
    );

    expect(screen.getByText('UrbanPulse')).toBeOnTheScreen();
    expect(screen.getByText('Hijo de prueba')).toBeOnTheScreen();
  });
});
