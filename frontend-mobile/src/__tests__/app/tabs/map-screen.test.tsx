/// <reference types="jest" />
import { cleanup, render, screen, userEvent, within } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import MapScreen from '@/app/(tabs)/map';
import { BottomTabInset } from '@/constants/theme';
import { useCategories, type UseCategoriesResult } from '@/hooks/use-categories';
import { useMapIncidents, type UseMapIncidentsResult } from '@/hooks/use-map-incidents';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import type { MapIncident } from '@/types/incident-map';
import type { AuthToken } from '@/types/token';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN de la pantalla "Mapa" (tab map).
// Se monta la pantalla real y se sustituyen los límites externos: la sesión
// (`useSession`), la carga de incidencias (`useMapIncidents`), el catálogo de
// categorías (`useCategories`), la navegación (`Redirect`/`router`), el mapa
// nativo (`IncidentMap`) y el botón de localización (`LocateMeButton`). Los
// filtros (`useIncidentMapFilters`, `IncidentMapFilterBar`) y el sheet
// (`IncidentMapSheet`) son reales.
// ---------------------------------------------------------------------------

// `Redirect` se sustituye por un stub que pinta el `href` recibido, para
// distinguir "se redirigió a /login" por contenido visible.
jest.mock('expo-router', () => {
  // Se usa `jest.requireActual` dentro de la factoría (mismo patrón que el resto de tests de tabs).
  const mockReact = jest.requireActual<typeof React>('react');
  const { Text: MockText } = jest.requireActual<{ Text: typeof Text }>('react-native');

  return {
    router: {
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
    },
    useFocusEffect: jest.fn(),
    Redirect: ({ href }: { href: string }) =>
      mockReact.createElement(MockText, null, `redirect:${href}`),
  };
});

// Sustituye el mapa nativo: expone las incidencias recibidas (un botón por
// incidencia que invoca `onSelectIncident`) y las coordenadas de foco recibidas.
jest.mock('@/components/incident-map', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const {
    View: MockView,
    Text: MockText,
    Pressable: MockPressable,
  } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IncidentMap: (props: {
      incidents: { id: string; title: string }[];
      onSelectIncident: (incident: unknown) => void;
      focusCoordinates?: { latitude: number; longitude: number } | null;
    }) => {
      const focus = props.focusCoordinates;
      return mockReact.createElement(
        MockView,
        { testID: 'incident-map' },
        mockReact.createElement(
          MockText,
          { testID: 'map-focus' },
          focus ? `focus:${focus.latitude},${focus.longitude}` : 'focus:none',
        ),
        props.incidents.map((incident) =>
          mockReact.createElement(
            MockPressable,
            {
              key: incident.id,
              accessibilityRole: 'button',
              accessibilityLabel: `Seleccionar ${incident.id}`,
              onPress: () => props.onSelectIncident(incident),
            },
            mockReact.createElement(MockText, null, incident.title),
          ),
        ),
      );
    },
  };
});

// Sustituye el botón de localización por un botón que dispara `onLocate` con unas coordenadas fijas.
jest.mock('@/components/locate-me-button', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { Pressable: MockPressable, Text: MockText } = jest.requireActual<
    typeof import('react-native')
  >('react-native');

  return {
    LocateMeButton: (props: {
      onLocate: (coords: { latitude: number; longitude: number; accuracy: number | null }) => void;
    }) =>
      mockReact.createElement(
        MockPressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Mock localizarme',
          onPress: () => props.onLocate({ latitude: 36.72, longitude: -4.42, accuracy: 5 }),
        },
        mockReact.createElement(MockText, null, 'Localizarme'),
      ),
  };
});

// El visor de fotos no se renderiza en estos tests (las incidencias no tienen imágenes).
jest.mock('@/components/incident-photo-viewer', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    IncidentPhotoViewer: () =>
      mockReact.createElement(MockView, { testID: 'incident-photo-viewer' }),
  };
});

// `react-native-reanimated` arrastra `react-native-worklets`, sin módulo nativo en Jest.
// Mismo mock que `incident-map-sheet.test.tsx`: `Animated.View` reenvía props.
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

jest.mock('@/hooks/use-session', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/hooks/use-map-incidents', () => ({
  useMapIncidents: jest.fn(),
}));

jest.mock('@/hooks/use-categories', () => ({
  useCategories: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseMapIncidents = jest.mocked(useMapIncidents);
const mockedUseCategories = jest.mocked(useCategories);

const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';
const EMPTY_STATE_TEXT = 'No tienes incidencias activas en el mapa';
const RETRY_BUTTON_LABEL = 'Reintentar';
const MAP_LOADING_TEST_ID = 'map-loading';
const MAP_EMPTY_STATE_TEST_ID = 'map-empty-state';
const SHEET_TEST_ID = 'incident-map-sheet';

const mockSessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

const BACKEND_SESSION_TOKEN: AuthToken = { accessToken: 'jwt-session-test', source: 'backend' };

// Fecha reciente (dentro del filtro de 7 días) y antigua (fuera del filtro de 7 días).
const RECENT_CREATED_AT = new Date().toISOString();
const OLD_CREATED_AT = '2020-01-01T10:00:00.000Z';

const recentIncident: MapIncident = {
  id: 'incident-recent',
  title: 'Farola fundida reciente',
  status: 'reported',
  category: 'Alumbrado',
  categoryId: 'category-lighting',
  latitude: 36.72,
  longitude: -4.42,
  createdAt: RECENT_CREATED_AT,
  images: [],
};

const oldIncident: MapIncident = {
  id: 'incident-old',
  title: 'Bache antiguo',
  status: 'in_progress',
  category: 'Viales',
  categoryId: 'category-roads',
  latitude: 36.721,
  longitude: -4.421,
  createdAt: OLD_CREATED_AT,
  images: [],
};

function buildSessionValue(overrides: Partial<SessionContextValue> = {}): SessionContextValue {
  return {
    user: mockSessionUser,
    token: BACKEND_SESSION_TOKEN,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildMapIncidentsResult(
  overrides: Partial<UseMapIncidentsResult> = {},
): UseMapIncidentsResult {
  return {
    incidents: [],
    isLoading: false,
    errorMessage: null,
    backendFallbackNotice: null,
    reload: jest.fn(),
    ...overrides,
  };
}

function buildCategoriesResult(): UseCategoriesResult {
  return {
    categories: [],
    isLoading: false,
    errorMessage: null,
    backendFallbackNotice: null,
    reload: jest.fn(),
  };
}

function givenMapIncidents(overrides: Partial<UseMapIncidentsResult> = {}) {
  mockedUseMapIncidents.mockReturnValue(buildMapIncidentsResult(overrides));
}

async function renderMapScreen() {
  return await render(<MapScreen />);
}

// Pulsa un elemento con `userEvent` (asíncrono) para que las actualizaciones de estado
// de React queden aplicadas antes de las aserciones.
async function pressByName(name: string) {
  await userEvent.press(screen.getByRole('button', { name }));
}

describe('MapScreen (tab Mapa)', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue(buildSessionValue());
    mockedUseCategories.mockReturnValue(buildCategoriesResult());
    givenMapIncidents();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('sin sesión y ya resuelta redirige a /login', async () => {
    mockedUseSession.mockReturnValue(buildSessionValue({ user: null, token: null }));

    await renderMapScreen();

    expect(screen.getByText('redirect:/login')).toBeOnTheScreen();
    expect(screen.queryByTestId('incident-map')).not.toBeOnTheScreen();
  });

  it('mientras se restaura la sesión (user null) no redirige a /login', async () => {
    mockedUseSession.mockReturnValue(
      buildSessionValue({ user: null, token: null, isRestoringSession: true }),
    );

    await renderMapScreen();

    expect(screen.queryByText('redirect:/login')).not.toBeOnTheScreen();
    expect(screen.getByTestId('incident-map')).toBeOnTheScreen();
  });

  it('pide las incidencias con el civicId de la sesión y pasa el token', async () => {
    await renderMapScreen();

    expect(mockedUseMapIncidents).toHaveBeenLastCalledWith(
      mockSessionUser.civicId,
      BACKEND_SESSION_TOKEN,
    );
  });

  it('con backendFallbackNotice muestra el aviso de fallback', async () => {
    givenMapIncidents({ backendFallbackNotice: BACKEND_FALLBACK_NOTICE });

    await renderMapScreen();

    expect(screen.getByText(BACKEND_FALLBACK_NOTICE)).toBeOnTheScreen();
  });

  it('sin backendFallbackNotice no muestra ningún aviso de fallback', async () => {
    await renderMapScreen();

    expect(screen.queryByText(BACKEND_FALLBACK_NOTICE)).not.toBeOnTheScreen();
  });

  it('con errorMessage muestra el error y "Reintentar" llama a reload una vez', async () => {
    const reload = jest.fn();
    givenMapIncidents({ errorMessage: 'No se pudieron cargar las incidencias.', reload });

    await renderMapScreen();

    expect(screen.getByText('No se pudieron cargar las incidencias.')).toBeOnTheScreen();
    await pressByName(RETRY_BUTTON_LABEL);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('con errorMessage no muestra el estado vacío aunque no haya incidencias', async () => {
    givenMapIncidents({ errorMessage: 'Error de red' });

    await renderMapScreen();

    expect(screen.queryByTestId(MAP_EMPTY_STATE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('mientras isLoading muestra el spinner map-loading y no el estado vacío', async () => {
    givenMapIncidents({ isLoading: true });

    await renderMapScreen();

    expect(screen.getByTestId(MAP_LOADING_TEST_ID)).toBeOnTheScreen();
    expect(screen.queryByTestId(MAP_EMPTY_STATE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('sin carga, sin error y sin incidencias muestra el estado vacío', async () => {
    await renderMapScreen();

    expect(screen.getByTestId(MAP_EMPTY_STATE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen();
    expect(screen.queryByTestId(MAP_LOADING_TEST_ID)).not.toBeOnTheScreen();
  });

  it('con incidencias no muestra el estado vacío', async () => {
    givenMapIncidents({ incidents: [recentIncident] });

    await renderMapScreen();

    expect(screen.queryByTestId(MAP_EMPTY_STATE_TEST_ID)).not.toBeOnTheScreen();
    expect(screen.getByText(recentIncident.title)).toBeOnTheScreen();
  });

  it('seleccionar una incidencia abre el sheet con su título', async () => {
    givenMapIncidents({ incidents: [recentIncident] });

    await renderMapScreen();
    expect(screen.queryByTestId(SHEET_TEST_ID)).not.toBeOnTheScreen();

    await pressByName(`Seleccionar ${recentIncident.id}`);

    expect(screen.getByTestId(SHEET_TEST_ID)).toBeOnTheScreen();
    expect(within(screen.getByTestId(SHEET_TEST_ID)).getByText(recentIncident.title)).toBeOnTheScreen();
  });

  it('el sheet recibe bottomOffset igual a BottomTabInset', async () => {
    givenMapIncidents({ incidents: [recentIncident] });

    await renderMapScreen();
    await pressByName(`Seleccionar ${recentIncident.id}`);

    const sheetStyle = StyleSheet.flatten(screen.getByTestId(SHEET_TEST_ID).props.style);
    expect(sheetStyle.bottom).toBe(BottomTabInset);
  });

  it('al aplicar un filtro que excluye la incidencia seleccionada el sheet se cierra', async () => {
    givenMapIncidents({ incidents: [recentIncident, oldIncident] });

    await renderMapScreen();
    await pressByName(`Seleccionar ${oldIncident.id}`);
    expect(screen.getByTestId(SHEET_TEST_ID)).toBeOnTheScreen();

    // "7 días" deja fuera la incidencia de 2020.
    await pressByName('7 días');

    expect(screen.queryByTestId(SHEET_TEST_ID)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: `Seleccionar ${oldIncident.id}` })).toBeNull();
  });

  it('al aplicar un filtro que mantiene la incidencia seleccionada el sheet sigue abierto', async () => {
    givenMapIncidents({ incidents: [recentIncident, oldIncident] });

    await renderMapScreen();
    await pressByName(`Seleccionar ${recentIncident.id}`);

    await pressByName('7 días');

    expect(screen.getByTestId(SHEET_TEST_ID)).toBeOnTheScreen();
    expect(within(screen.getByTestId(SHEET_TEST_ID)).getByText(recentIncident.title)).toBeOnTheScreen();
  });

  it('pulsar "Cerrar" en el sheet lo oculta', async () => {
    givenMapIncidents({ incidents: [recentIncident] });

    await renderMapScreen();
    await pressByName(`Seleccionar ${recentIncident.id}`);
    await pressByName('Cerrar');

    expect(screen.queryByTestId(SHEET_TEST_ID)).not.toBeOnTheScreen();
  });

  it('el mapa arranca sin coordenadas de foco', async () => {
    await renderMapScreen();

    expect(screen.getByText('focus:none')).toBeOnTheScreen();
  });

  it('LocateMeButton con onLocate pasa las coordenadas como focusCoordinates a IncidentMap', async () => {
    await renderMapScreen();

    await pressByName('Mock localizarme');

    expect(screen.getByText('focus:36.72,-4.42')).toBeOnTheScreen();
    expect(screen.queryByText('focus:none')).not.toBeOnTheScreen();
  });

  it('con el sheet abierto el botón de localización se oculta', async () => {
    givenMapIncidents({ incidents: [recentIncident] });

    await renderMapScreen();
    expect(screen.getByRole('button', { name: 'Mock localizarme' })).toBeOnTheScreen();

    await pressByName(`Seleccionar ${recentIncident.id}`);

    expect(screen.queryByRole('button', { name: 'Mock localizarme' })).toBeNull();
  });
});
