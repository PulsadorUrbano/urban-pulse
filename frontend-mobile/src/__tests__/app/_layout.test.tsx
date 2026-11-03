/// <reference types="jest" />
import type { ReactNode } from 'react';

import { enableLegacyHeaderAppearance } from 'expo-router';

import RootLayout from '@/app/_layout';

// ---------------------------------------------------------------------------
// Regresión del bug "UI desplazada hacia arriba"
// (docs/spec/bugs/general/24-10-26-ui-desplazada-hacia-arriba.md).
//
// En Expo Router 58, iOS 26+ con Liquid Glass, el header nativo del Stack es
// translúcido y absoluto por defecto. `src/app/_layout.tsx` restaura el header
// opaco clásico llamando a `enableLegacyHeaderAppearance()` A NIVEL DE MÓDULO.
// Este test evita que esa llamada se elimine sin darse cuenta.
//
// Casos cubiertos:
//   - importar el módulo invoca `enableLegacyHeaderAppearance` exactamente una vez
//   - la llamada se hace sin argumentos (la API no recibe configuración)
//   - el módulo sigue exportando el layout raíz por defecto
// ---------------------------------------------------------------------------

// El layout importa `global.css` (Tailwind) que Jest no puede transformar.
jest.mock('@/global.css', () => ({}));

// Solo se sustituye la frontera nativa de `expo-router` que usa el layout; el
// router real no se carga en el entorno de test. `enableLegacyHeaderAppearance`
// es el único export con comportamiento que se verifica.
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  const MockStack = Object.assign(
    ({ children }: { children?: ReactNode }) => mockReact.createElement(MockView, null, children),
    {
      Screen: () => null,
    },
  );

  return {
    enableLegacyHeaderAppearance: jest.fn(),
    Stack: MockStack,
    ThemeProvider: ({ children }: { children?: ReactNode }) =>
      mockReact.createElement(MockView, null, children),
    DarkTheme: {},
    DefaultTheme: {},
  };
});

// `SessionProvider` arrastra los servicios de almacenamiento seguro; se
// sustituyen para que el módulo de layout se evalúe sin dependencias nativas.
jest.mock('@/hooks/use-session', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');

  return {
    SessionProvider: ({ children }: { children?: unknown }) => children ?? mockReact.createElement(mockReact.Fragment),
  };
});

describe('RootLayout (src/app/_layout.tsx)', () => {
  const enableLegacyHeaderAppearanceMock = jest.mocked(enableLegacyHeaderAppearance);

  it('invoca enableLegacyHeaderAppearance al evaluar el módulo', () => {
    // El import de arriba ya evalúa el módulo; la llamada debe haberse hecho
    // a nivel de módulo, no durante el render del componente.
    expect(enableLegacyHeaderAppearanceMock).toHaveBeenCalledTimes(1);
  });

  it('llama a enableLegacyHeaderAppearance sin argumentos', () => {
    expect(enableLegacyHeaderAppearanceMock).toHaveBeenCalledWith();
  });

  it('sigue exportando el layout raíz por defecto', () => {
    expect(typeof RootLayout).toBe('function');
  });
});
