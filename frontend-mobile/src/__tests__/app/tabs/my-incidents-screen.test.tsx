/// <reference types="jest" />
import { cleanup, render, screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import MyIncidentsScreen from '@/app/(tabs)/my-incidents';
import { useMyIncidents, type UseMyIncidentsResult } from '@/hooks/use-my-incidents';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import type { IncidentSummary } from '@/types/incident';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN de la pantalla "Mis incidencias" (tab my-incidents).
// Se monta la pantalla real y se sustituyen los límites externos: la sesión
// (`useSession`), el hook de carga (`useMyIncidents`, sin fetch real) y la
// navegación (`router` y `Redirect` de `expo-router`). Los componentes
// presentacionales (`IncidentListItem`, `IncidentStatusBadge`) son reales.
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test.
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// `Redirect` se sustituye por un stub que pinta el `href` recibido, para
// distinguir "se redirigió a /login" por contenido visible.
jest.mock('expo-router', () => {
  // `jest.mock` no permite referenciar variables externas fuera de un scope
  // permitido; se usa `jest.requireActual` en vez de `require()` directo
  // para evitar también el warning de lint `no-require-imports` (mismo
  // patrón que `incident-detail-screen.test.tsx`).
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
  };
});

// Insets del área segura a cero; el resto del módulo se conserva real.
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

jest.mock('@/hooks/use-my-incidents', () => ({
  useMyIncidents: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseMyIncidents = jest.mocked(useMyIncidents);

const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';
const EMPTY_STATE_TEXT = 'Todavía no has registrado ninguna incidencia.';
const RETRY_BUTTON_LABEL = 'Reintentar';

const mockSessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
};

// Incidencias en un orden deliberadamente distinto al de id y al de título,
// para comprobar que la pantalla respeta el orden recibido del hook.
const incidentsInReceivedOrder: IncidentSummary[] = [
  {
    id: 'inc-3',
    title: 'Bache en Calle Mayor',
    status: 'reported',
    createdAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'inc-1',
    title: 'Farola fundida',
    status: 'validated',
    createdAt: '2026-10-22T10:00:00.000Z',
  },
  {
    id: 'inc-2',
    title: 'Contenedor desbordado',
    status: 'resolved',
    createdAt: '2026-10-18T10:00:00.000Z',
  },
];

// Construye un valor de sesión completo; por defecto hay un ciudadano activo.
function buildSessionValue(
  overrides: Partial<SessionContextValue> = {},
): SessionContextValue {
  return {
    user: mockSessionUser,
    token: null,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Construye el resultado del hook con estado vacío y sin avisos por defecto.
function buildMyIncidentsResult(
  overrides: Partial<UseMyIncidentsResult> = {},
): UseMyIncidentsResult {
  return {
    incidents: [],
    isLoading: false,
    errorMessage: null,
    backendFallbackNotice: null,
    reload: jest.fn(),
    ...overrides,
  };
}

// Monta la pantalla real. `render` de RNTL 14 es asíncrono: se espera.
async function renderMyIncidentsScreen() {
  return await render(<MyIncidentsScreen />);
}

// Indica si el árbol JSON renderizado contiene algún nodo host de
// `ActivityIndicator`. RNTL 14 no expone `UNSAFE_queryByType` ni `findAll`
// en el `root`, así que se recorre el JSON de `toJSON()` buscando el nombre
// del host. El caso de control de la carga inicial valida este predicado.
function treeContainsActivityIndicator(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some((child) => treeContainsActivityIndicator(child));
  }
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  if ('type' in node && typeof node.type === 'string' && /ActivityIndicator/.test(node.type)) {
    return true;
  }
  return 'children' in node && treeContainsActivityIndicator(node.children);
}

// Devuelve los títulos en el orden en que aparecen los items de la lista.
function getRenderedIncidentTitlesInOrder(expectedTitles: string[]): string[] {
  return screen
    .getAllByRole('button')
    .map((itemButton) => expectedTitles.find((title) => within(itemButton).queryByText(title) !== null))
    .filter((title): title is string => title !== undefined);
}

describe('MyIncidentsScreen (tab Mis incidencias)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSession.mockReturnValue(buildSessionValue());
    mockedUseMyIncidents.mockReturnValue(buildMyIncidentsResult());
  });

  afterEach(async () => {
    await cleanup();
  });

  it('sin sesión activa y ya resuelta redirige a /login', async () => {
    mockedUseSession.mockReturnValue(
      buildSessionValue({ user: null, isRestoringSession: false }),
    );

    await renderMyIncidentsScreen();

    expect(screen.getByText('redirect:/login')).toBeOnTheScreen();
    expect(screen.queryByText('Mis incidencias')).toBeNull();
  });

  it('mientras se restaura la sesión (user null) no redirige a /login', async () => {
    mockedUseSession.mockReturnValue(
      buildSessionValue({ user: null, isRestoringSession: true }),
    );

    await renderMyIncidentsScreen();

    expect(screen.queryByText('redirect:/login')).toBeNull();
  });

  it('con incidencias muestra los items en el mismo orden recibido del hook', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ incidents: incidentsInReceivedOrder }),
    );

    await renderMyIncidentsScreen();

    const expectedTitles = incidentsInReceivedOrder.map((incident) => incident.title);
    expect(getRenderedIncidentTitlesInOrder(expectedTitles)).toEqual(expectedTitles);
    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
  });

  it('sin incidencias, sin carga y sin error muestra el estado vacío exacto', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ incidents: [], isLoading: false, errorMessage: null }),
    );

    await renderMyIncidentsScreen();

    expect(screen.getByText(EMPTY_STATE_TEXT)).toBeOnTheScreen();
  });

  it('al pulsar un item navega con router.push una vez al detalle de esa incidencia', async () => {
    const user = userEvent.setup();
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ incidents: incidentsInReceivedOrder }),
    );
    await renderMyIncidentsScreen();

    await user.press(screen.getByText('Farola fundida'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/incidents/inc-1');
  });

  it('con errorMessage muestra el texto del error y el botón Reintentar, que llama a reload una vez', async () => {
    const user = userEvent.setup();
    const reloadSpy = jest.fn();
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ errorMessage: 'Fallo de red al cargar', reload: reloadSpy }),
    );
    await renderMyIncidentsScreen();

    expect(screen.getByText('Fallo de red al cargar')).toBeOnTheScreen();
    expect(screen.getByLabelText(RETRY_BUTTON_LABEL)).toBeOnTheScreen();

    await user.press(screen.getByLabelText(RETRY_BUTTON_LABEL));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('con backendFallbackNotice muestra el aviso junto a la lista de incidencias', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({
        incidents: incidentsInReceivedOrder,
        backendFallbackNotice: BACKEND_FALLBACK_NOTICE,
      }),
    );

    await renderMyIncidentsScreen();

    expect(screen.getByText(BACKEND_FALLBACK_NOTICE)).toBeOnTheScreen();
    expect(screen.getByText('Farola fundida')).toBeOnTheScreen();
  });

  it('con backendFallbackNotice y errorMessage a la vez muestra ambos', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({
        errorMessage: 'Fallo de red al cargar',
        backendFallbackNotice: BACKEND_FALLBACK_NOTICE,
      }),
    );

    await renderMyIncidentsScreen();

    expect(screen.getByText(BACKEND_FALLBACK_NOTICE)).toBeOnTheScreen();
    expect(screen.getByText('Fallo de red al cargar')).toBeOnTheScreen();
    expect(screen.getByLabelText(RETRY_BUTTON_LABEL)).toBeOnTheScreen();
  });

  it('recarga en curso con incidencias ya cargadas no muestra el indicador de pantalla completa y mantiene la lista', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ incidents: incidentsInReceivedOrder, isLoading: true }),
    );

    const view = await renderMyIncidentsScreen();

    expect(treeContainsActivityIndicator(view.toJSON())).toBe(false);
    expect(screen.getByText('Farola fundida')).toBeOnTheScreen();
    expect(screen.getByText('Bache en Calle Mayor')).toBeOnTheScreen();
  });

  it('carga inicial sin incidencias muestra el indicador de carga (control del caso anterior)', async () => {
    mockedUseMyIncidents.mockReturnValue(
      buildMyIncidentsResult({ incidents: [], isLoading: true }),
    );

    const view = await renderMyIncidentsScreen();

    expect(treeContainsActivityIndicator(view.toJSON())).toBe(true);
    expect(screen.queryByText(EMPTY_STATE_TEXT)).toBeNull();
  });
});
