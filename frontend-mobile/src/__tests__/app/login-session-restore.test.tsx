/// <reference types="jest" />
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import LoginScreen from '@/app/login';
import { useLogin, type UseLoginResult } from '@/hooks/use-login';
import { SessionProvider } from '@/hooks/use-session';
import { loadSessionUser } from '@/services/session-user-storage.service';
import { loadToken } from '@/services/token-storage.service';
import type { AuthToken } from '@/types/token';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN de la pantalla de login, limitado al GATE de restauración
// de sesión. Se monta `LoginScreen` real dentro de un `SessionProvider` real;
// solo se sustituyen los límites externos (navegación, almacenamiento seguro,
// hook de login, estilos y safe area). El flujo de envío del formulario y las
// credenciales NO se testea aquí.
//
// Casos cubiertos:
//   - sesión persistida completa -> redirige a "/" sin mostrar el formulario
//   - sin sesión persistida      -> muestra el formulario
//   - usuario sin token          -> también redirige (sesión restaurable)
//   - mientras se restaura       -> muestra el loader y no el formulario
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// `PasswordInput` renderiza un icono; se sustituye para no cargar la fuente.
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// `Redirect` se sustituye por un stub que pinta el `href` recibido. Así el test
// distingue "se redirigió a /" del loader o del formulario por contenido visible,
// sin depender de que la navegación ocurra de verdad.
jest.mock('expo-router', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');

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

// Insets del área segura a cero; el resto del módulo (SafeAreaView nativo)
// se conserva real vía `requireActual`, igual que en `home-screen-logout.test.tsx`.
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

// El hook de login no es la frontera que se testea aquí: se sustituye completo.
jest.mock('@/hooks/use-login', () => ({
  useLogin: jest.fn(),
}));

// Frontera real con SecureStore: la restauración se controla desde cada test.
jest.mock('@/services/token-storage.service', () => ({
  saveToken: jest.fn(),
  loadToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('@/services/session-user-storage.service', () => ({
  saveSessionUser: jest.fn(),
  loadSessionUser: jest.fn(),
  clearSessionUser: jest.fn(),
}));

// Defensivo: los fixtures de este archivo usan token source "mock", así que
// use-session.ts no debería llamar a esto, pero se mockea para blindar el
// test contra una llamada de red real si algún fixture cambiara a "backend".
jest.mock('@/services/auth.service', () => ({
  validateBackendSession: jest.fn().mockResolvedValue('valid'),
}));

const mockedUseLogin = useLogin as jest.MockedFunction<typeof useLogin>;
const mockedLoadSessionUser = loadSessionUser as jest.MockedFunction<typeof loadSessionUser>;
const mockedLoadToken = loadToken as jest.MockedFunction<typeof loadToken>;

// Usuario de sesión válido (sin password, forma persistible).
const persistedSessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

// Token válido según el contrato `AuthToken` de `src/types/token.ts`.
const persistedAuthToken: AuthToken = {
  accessToken: 'token-test',
  source: 'mock',
};

const redirectToHomeText = 'redirect:/';
const usernameInputLabel = 'Usuario o correo';
const restoringIndicatorTestId = 'session-restoring-indicator';

// Valor por defecto del hook de login: formulario en estado inicial y sin bloqueo.
function buildIdleLoginResult(): UseLoginResult {
  return {
    isSubmitting: false,
    errorMessage: null,
    isLocked: false,
    lockMessage: '',
    remainingMs: 0,
    submitLogin: jest.fn(),
  };
}

// Monta LoginScreen real dentro del SessionProvider real.
// `render` de RNTL 14 es asíncrono: se espera para que `screen` quede enlazado.
async function renderLoginScreenWithSessionProvider() {
  await render(
    <SessionProvider>
      <LoginScreen />
    </SessionProvider>,
  );
}

describe('LoginScreen: gate de restauración de sesión', () => {
  beforeEach(() => {
    mockedUseLogin.mockReturnValue(buildIdleLoginResult());

    mockedLoadSessionUser.mockReset();
    mockedLoadToken.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('con sesión persistida completa redirige a "/" y nunca muestra el campo de usuario', async () => {
    mockedLoadSessionUser.mockResolvedValue(persistedSessionUser);
    mockedLoadToken.mockResolvedValue(persistedAuthToken);

    await renderLoginScreenWithSessionProvider();

    expect(await screen.findByText(redirectToHomeText)).toBeOnTheScreen();
    expect(screen.queryByLabelText(usernameInputLabel)).toBeNull();
  });

  it('sin sesión persistida muestra el formulario normal y no redirige', async () => {
    mockedLoadSessionUser.mockResolvedValue(null);
    mockedLoadToken.mockResolvedValue(persistedAuthToken);

    await renderLoginScreenWithSessionProvider();

    expect(await screen.findByLabelText(usernameInputLabel)).toBeOnTheScreen();
    expect(screen.queryByText(redirectToHomeText)).toBeNull();
  });

  it('con usuario persistido pero sin token redirige a "/" (sesión restaurable)', async () => {
    mockedLoadSessionUser.mockResolvedValue(persistedSessionUser);
    mockedLoadToken.mockResolvedValue(null);

    await renderLoginScreenWithSessionProvider();

    expect(await screen.findByText(redirectToHomeText)).toBeOnTheScreen();
    expect(screen.queryByLabelText(usernameInputLabel)).toBeNull();
  });

  it('mientras la restauración está pendiente muestra solo el loader, sin formulario ni redirección', async () => {
    // La promesa se controla a mano: el loader se verifica de forma determinista,
    // sin depender del timing real de la resolución.
    let resolveSessionUser: (value: SessionUser | null) => void = () => undefined;
    mockedLoadSessionUser.mockReturnValue(
      new Promise<SessionUser | null>((resolve) => {
        resolveSessionUser = resolve;
      }),
    );
    mockedLoadToken.mockResolvedValue(null);

    await renderLoginScreenWithSessionProvider();

    expect(screen.getByTestId(restoringIndicatorTestId)).toBeOnTheScreen();
    expect(screen.queryByLabelText(usernameInputLabel)).toBeNull();
    expect(screen.queryByText(redirectToHomeText)).toBeNull();

    await act(async () => {
      resolveSessionUser(null);
    });

    expect(await screen.findByLabelText(usernameInputLabel)).toBeOnTheScreen();
    expect(screen.queryByTestId(restoringIndicatorTestId)).toBeNull();
  });

  it('el enlace "¿No tienes cuenta? Créate una" navega a /register', async () => {
    mockedLoadSessionUser.mockResolvedValue(null);
    mockedLoadToken.mockResolvedValue(null);
    jest.mocked(router.push).mockClear();

    await renderLoginScreenWithSessionProvider();

    fireEvent.press(await screen.findByRole('button', { name: 'No tienes cuenta, créate una' }));

    expect(router.push).toHaveBeenCalledWith('/register');
  });
});
