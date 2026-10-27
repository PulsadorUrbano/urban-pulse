/// <reference types="jest" />
import { cleanup, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import LoginScreen from '@/app/login';
import { useLogin, type LoginSuccess, type UseLoginResult } from '@/hooks/use-login';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import type { AuthToken } from '@/types/token';
import type { User } from '@/types/user';

// ---------------------------------------------------------------------------
// Test del FLUJO DE ENVÍO de la pantalla de login (`src/app/login.tsx`).
// Complementa a `login-session-restore.test.tsx` (que solo cubre el gate de
// restauración): aquí se cubre qué pasa tras `submitLogin`, en concreto la
// diferencia entre un login real (navegación inmediata) y uno que cae al
// mock (aviso de fallback retenido hasta confirmar), siguiendo el mismo
// patrón que `register-screen.test.tsx`.
// ---------------------------------------------------------------------------

jest.mock('@/global.css', () => ({}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

jest.mock('@/hooks/use-login', () => ({
  useLogin: jest.fn(),
}));

jest.mock('@/hooks/use-session', () => ({
  useSession: jest.fn(),
}));

const mockedUseLogin = useLogin as jest.MockedFunction<typeof useLogin>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

const usernameInputLabel = 'Usuario o correo';
const passwordInputLabel = 'Contraseña';
const submitButtonLabel = 'Iniciar sesión';

const backendUserFixture: User = {
  id: 'backend-1',
  username: 'ana',
  email: 'ana@example.com',
  role: 'civic',
  civicId: 'backend-1',
  phone: null,
  source: 'backend',
};

const mockUserFixture: User = {
  id: 'mock-1',
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

const tokenFixture: AuthToken = { accessToken: 'token-abc', source: 'backend' };

function buildIdleLoginResult(): UseLoginResult {
  return {
    isSubmitting: false,
    errorMessage: null,
    isLocked: false,
    lockMessage: '',
    remainingMs: 0,
    submitLogin: jest.fn().mockResolvedValue(null),
  };
}

function buildIdleSessionValue(): SessionContextValue {
  return {
    user: null,
    token: null,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
  };
}

async function renderLoginScreen() {
  await render(<LoginScreen />);
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(usernameInputLabel), 'ana');
  await user.type(screen.getByLabelText(passwordInputLabel), 'secreto');
  await user.press(screen.getByRole('button', { name: submitButtonLabel }));
}

describe('LoginScreen: flujo de envío', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLogin.mockReturnValue(buildIdleLoginResult());
    mockedUseSession.mockReturnValue(buildIdleSessionValue());
  });

  afterEach(() => {
    cleanup();
  });

  it('con login exitoso vía backend inicia sesión y navega a "/" sin aviso', async () => {
    const loginSuccess: LoginSuccess = { user: backendUserFixture, token: tokenFixture, source: 'backend' };
    const signInMock = jest.fn().mockResolvedValue(undefined);
    mockedUseLogin.mockReturnValue({
      ...buildIdleLoginResult(),
      submitLogin: jest.fn().mockResolvedValue(loginSuccess),
    });
    mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), signIn: signInMock });
    const user = userEvent.setup();
    await renderLoginScreen();

    await fillAndSubmit(user);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(signInMock).toHaveBeenCalledWith(backendUserFixture, tokenFixture);
  });

  it('con login exitoso vía mock muestra el aviso de fallback y solo navega tras pulsar "Continuar"', async () => {
    const loginSuccess: LoginSuccess = { user: mockUserFixture, token: tokenFixture, source: 'mock' };
    const signInMock = jest.fn().mockResolvedValue(undefined);
    mockedUseLogin.mockReturnValue({
      ...buildIdleLoginResult(),
      submitLogin: jest.fn().mockResolvedValue(loginSuccess),
    });
    mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), signIn: signInMock });
    const user = userEvent.setup();
    await renderLoginScreen();

    await fillAndSubmit(user);

    const fallbackNoticeText = await screen.findByText(
      'No se ha podido conectar al backend, realizando en el mock',
    );
    expect(fallbackNoticeText).toBeOnTheScreen();
    expect(signInMock).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(signInMock).toHaveBeenCalledWith(mockUserFixture, tokenFixture);
  });

  it('con login fallido no inicia sesión ni navega', async () => {
    const signInMock = jest.fn().mockResolvedValue(undefined);
    const submitLoginMock = jest.fn().mockResolvedValue(null);
    mockedUseLogin.mockReturnValue({
      ...buildIdleLoginResult(),
      errorMessage: 'El usuario o contraseña no son correctos, inténtelo de nuevo.',
      submitLogin: submitLoginMock,
    });
    mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), signIn: signInMock });
    const user = userEvent.setup();
    await renderLoginScreen();

    await fillAndSubmit(user);

    await waitFor(() => expect(submitLoginMock).toHaveBeenCalledTimes(1));
    expect(signInMock).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
