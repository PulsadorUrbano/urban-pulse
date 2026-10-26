/// <reference types="jest" />
import { act, cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import MyIncidentsScreen from '@/app/(tabs)/my-incidents';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import { fetchMyIncidents } from '@/services/incident.service';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN del refresco por foco de "Mis incidencias" con el hook
// REAL `useMyIncidents`. A diferencia de `my-incidents-screen.test.tsx` (que
// mockea el hook), aquí se cuentan las peticiones reales al servicio, que es
// lo que protege la guarda `hasFocusedOnceRef` frente a la petición duplicada
// en el montaje inicial.
//
// `useFocusEffect` se sustituye: no hay NavigationContainer en Jest. El test
// dispara el callback registrado para simular el foco inicial y los reenfoques.
// ---------------------------------------------------------------------------

jest.mock('@/global.css', () => ({}));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

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

// Solo se sustituye la frontera de red: el hook `useMyIncidents` es real.
jest.mock('@/services/incident.service', () => ({
  fetchMyIncidents: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseFocusEffect = jest.mocked(useFocusEffect);
const mockedFetchMyIncidents = jest.mocked(fetchMyIncidents);

const EMPTY_STATE_TEXT = 'Todavía no has registrado ninguna incidencia.';

const mockSessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
};

function buildSessionValue(): SessionContextValue {
  return {
    user: mockSessionUser,
    token: null,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
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

describe('MyIncidentsScreen con useMyIncidents real (refresco por foco)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSession.mockReturnValue(buildSessionValue());
    mockedFetchMyIncidents.mockResolvedValue({ incidents: [], source: 'backend' });
  });

  afterEach(async () => {
    await cleanup();
  });

  it('con civicId disponible, el montaje con su primer foco pide las incidencias exactamente una vez', async () => {
    await render(<MyIncidentsScreen />);
    await simulateScreenFocus();

    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());
    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(1);
    // Se pide por civicId de la sesión, no por el id numérico del usuario ('1').
    expect(mockedFetchMyIncidents).toHaveBeenCalledWith(mockSessionUser.civicId);
    expect(mockedFetchMyIncidents).not.toHaveBeenCalledWith(mockSessionUser.id);
  });

  it('un reenfoque posterior al montaje vuelve a pedir las incidencias (2 peticiones en total)', async () => {
    await render(<MyIncidentsScreen />);
    await simulateScreenFocus();
    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());

    await simulateScreenFocus();

    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());
  });

  it('cada reenfoque posterior genera una petición nueva, sin quedarse bloqueado', async () => {
    await render(<MyIncidentsScreen />);
    await simulateScreenFocus();
    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());

    await simulateScreenFocus();
    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());

    await simulateScreenFocus();
    expect(mockedFetchMyIncidents).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen());
  });
});
