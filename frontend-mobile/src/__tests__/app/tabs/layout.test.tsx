/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import AppTabs from '@/components/app-tabs';

// ---------------------------------------------------------------------------
// Test de renderizado del layout del grupo `(tabs)` (`src/app/(tabs)/_layout.tsx`).
//
// El layout no tiene lógica propia: solo delega en `<AppTabs />`
// (`src/components/app-tabs.tsx`). Se sustituye `AppTabs` por un stub simple
// para aislar este test de su lógica interna (NativeTabs, colores de tema,
// etc.), que ya está cubierta por los tests dedicados de ese componente.
//
// `jest.mock` se eleva (hoist) por encima de los imports aunque aparezca
// después en el archivo, así que el import de `AppTabs` ya recibe el stub.
// ---------------------------------------------------------------------------

const mockAppTabsTestId = 'app-tabs-stub';

jest.mock('@/components/app-tabs', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: jest.fn(() => mockReact.createElement(MockView, { testID: mockAppTabsTestId })),
  };
});

const mockedAppTabs = jest.mocked(AppTabs);

describe('TabsLayout (src/app/(tabs)/_layout.tsx)', () => {
  beforeEach(() => {
    mockedAppTabs.mockClear();
  });

  it('delega el renderizado en AppTabs', async () => {
    // `render` de RNTL 14 es asíncrono: hay que esperarlo antes de las aserciones.
    await render(<TabsLayout />);

    expect(mockedAppTabs).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(mockAppTabsTestId)).toBeOnTheScreen();
  });

  it('no le pasa props a AppTabs', async () => {
    await render(<TabsLayout />);

    // El layout no tiene estado ni configuración propia que reenviar.
    expect(mockedAppTabs).toHaveBeenCalledWith({}, undefined);
  });
});
