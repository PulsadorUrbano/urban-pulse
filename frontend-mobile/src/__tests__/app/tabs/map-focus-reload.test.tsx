/// <reference types="jest" />
import { act, cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import MapScreen from '@/app/(tabs)/map';
import { useCategories, type UseCategoriesResult } from '@/hooks/use-categories';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import { fetchMyMapIncidents } from '@/services/incident.service';
import type { MapIncident } from '@/types/incident-map';
import type { AuthToken } from '@/types/token';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN del refresco por foco del mapa con el hook REAL
// `useMapIncidents`. Se cuentan las peticiones reales al servicio
// (`fetchMyMapIncidents`, que es la frontera de red) y se comprueba que una
// incidencia nueva aparece en el mapa tras un reenfoque. El hook no se mockea.
//
// `useFocusEffect` se sustituye: no hay NavigationContainer en Jest. El test
// dispara el último callback registrado para simular el foco inicial y los
// reenfoques posteriores al salir y volver a la pestaña.
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { Text: MockText } = jest.requireActual<{ Text: typeof Text }>('react-native');

  return {
    router: {
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) =>
      mockReact.createElement(MockText, null, `redirect:${href}`),
    useFocusEffect: jest.fn(),
  };
});

// Sustituye el mapa nativo: pinta el título de cada incidencia recibida para
// poder comprobar por contenido visible qué se muestra en el mapa.
jest.mock('@/components/incident-map', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView, Text: MockText } = jest.requireActual<typeof import('react-native')>(
    'react-native',
  );

  return {
    IncidentMap: (props: { incidents: { id: string; title: string }[] }) =>
      mockReact.createElement(
        MockView,
        { testID: 'incident-map' },
        props.incidents.map((incident) =>
          mockReact.createElement(MockText, { key: incident.id }, incident.title),
        ),
      ),
  };
});

// Sustituye el botón de localización: no es relevante para el refresco.
jest.mock('@/components/locate-me-button', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    LocateMeButton: () => mockReact.createElement(MockView, { testID: 'locate-me-button' }),
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
// Mismo mock que `map-screen.test.tsx`: `Animated.View` reenvía props.
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

jest.mock('@/hooks/use-categories', () => ({
  useCategories: jest.fn(),
}));

// Solo se sustituye la frontera de red. Se conserva el resto del módulo real
// porque `useMapIncidents` importa `QUERY_MISSING_TOKEN_MESSAGE` de él.
jest.mock('@/services/incident.service', () => ({
  ...jest.requireActual<typeof import('@/services/incident.service')>(
    '@/services/incident.service',
  ),
  fetchMyMapIncidents: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseCategories = jest.mocked(useCategories);
const mockedUseFocusEffect = jest.mocked(useFocusEffect);
const mockedFetchMyMapIncidents = jest.mocked(fetchMyMapIncidents);

const mockSessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

// Token de backend de la sesión: el hook real lo reenvía al servicio en cada carga.
const BACKEND_SESSION_TOKEN: AuthToken = { accessToken: 'jwt-session-test', source: 'backend' };

// Fecha reciente para que la incidencia pase cualquier filtro de antigüedad.
const RECENT_CREATED_AT = new Date().toISOString();

// Incidencia que ya existía en la primera carga del mapa.
const existingIncident: MapIncident = {
  id: 'incident-existing-a',
  title: 'Incidencia existente A',
  status: 'reported',
  category: 'Alumbrado',
  categoryId: 'category-lighting',
  latitude: 36.72,
  longitude: -4.42,
  createdAt: RECENT_CREATED_AT,
  images: [],
};

// Incidencia creada mientras el usuario estaba en otra pestaña: solo aparece tras el reenfoque.
const newlyCreatedIncident: MapIncident = {
  id: 'incident-new-b',
  title: 'Incidencia nueva B',
  status: 'reported',
  category: 'Viales',
  categoryId: 'category-roads',
  latitude: 36.721,
  longitude: -4.421,
  createdAt: RECENT_CREATED_AT,
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

function buildCategoriesResult(): UseCategoriesResult {
  return {
    categories: [],
    isLoading: false,
    errorMessage: null,
    backendFallbackNotice: null,
    reload: jest.fn(),
  };
}

// Ejecuta el callback de `useFocusEffect` registrado en el último render de la
// pantalla, dentro de `act` porque una recarga actualiza el estado del hook real.
async function simulateScreenFocus(): Promise<void> {
  const focusRegistrations = mockedUseFocusEffect.mock.calls;
  const lastRegistration = focusRegistrations[focusRegistrations.length - 1];
  if (lastRegistration === undefined) {
    throw new Error('La pantalla no registró ningún useFocusEffect');
  }
  const focusEffect = lastRegistration[0];
  await act(() => {
    focusEffect();
  });
}

describe('MapScreen con useMapIncidents real (refresco por foco)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSession.mockReturnValue(buildSessionValue());
    mockedUseCategories.mockReturnValue(buildCategoriesResult());
    mockedFetchMyMapIncidents.mockResolvedValue({ incidents: [], source: 'backend' });
  });

  afterEach(() => {
    cleanup();
  });

  it('el montaje con su primer foco pide las incidencias exactamente una vez, con civicId y token de la sesión', async () => {
    await render(<MapScreen />);
    await simulateScreenFocus();

    await waitFor(() => expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1));
    expect(mockedFetchMyMapIncidents).toHaveBeenCalledWith(
      mockSessionUser.civicId,
      BACKEND_SESSION_TOKEN,
    );
  });

  it('tras salir y volver a la pestaña, la incidencia nueva aparece en el mapa junto a la existente', async () => {
    // Primera carga: solo existe A. Tras el reenfoque, el backend ya devuelve A y B.
    mockedFetchMyMapIncidents
      .mockResolvedValueOnce({ incidents: [existingIncident], source: 'backend' })
      .mockResolvedValueOnce({
        incidents: [existingIncident, newlyCreatedIncident],
        source: 'backend',
      });

    await render(<MapScreen />);
    await simulateScreenFocus();
    await waitFor(() => expect(screen.getByText(existingIncident.title)).toBeOnTheScreen());
    expect(screen.queryByText(newlyCreatedIncident.title)).not.toBeOnTheScreen();

    await simulateScreenFocus();

    await waitFor(() => expect(screen.getByText(newlyCreatedIncident.title)).toBeOnTheScreen());
    expect(screen.getByText(existingIncident.title)).toBeOnTheScreen();
    expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2);
  });

  it('cada reenfoque posterior al primero genera una petición nueva (montaje + foco inicial = 1, más 1 por reenfoque)', async () => {
    await render(<MapScreen />);
    await simulateScreenFocus();
    await waitFor(() => expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(1));

    await simulateScreenFocus();
    await waitFor(() => expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(2));

    await simulateScreenFocus();
    await waitFor(() => expect(mockedFetchMyMapIncidents).toHaveBeenCalledTimes(3));
  });

  it('sin token en la sesión, ni el montaje ni los reenfoques llaman al servicio', async () => {
    mockedUseSession.mockReturnValue(buildSessionValue({ token: null }));

    await render(<MapScreen />);
    await simulateScreenFocus();
    await simulateScreenFocus();

    expect(mockedFetchMyMapIncidents).not.toHaveBeenCalled();
  });
});
