/// <reference types="jest" />
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, type AlertButton } from 'react-native';
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/index';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { clearToken } from '@/services/token-storage.service';
import type { User } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN de la pantalla de inicio (HomeScreen) con el flujo de
// cierre de sesión. Se monta el componente real dentro de un `SessionProvider`
// real; solo se sustituyen los límites externos (navegación, almacenamiento
// seguro del token, estilos y safe area). El hook `useSession` y el
// `SessionProvider` corren con su implementación real.
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test (mismo patrón
// que `new-incident-screen.test.tsx`).
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// La pantalla usa `router.push` (registrar incidencia), `router.replace`
// (cierre de sesión) y el componente `Redirect` cuando no hay usuario.
// `Redirect` debe existir en el stub: HomeScreen lo renderiza tras cerrar sesión.
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  Redirect: () => null,
}));

// Insets del área segura a cero; el resto del módulo (SafeAreaView nativo)
// se conserva real vía `requireActual`, igual que hace el mock oficial.
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

// Frontera real con SecureStore: el token se simula, la sesión no.
jest.mock('@/services/token-storage.service', () => ({
  saveToken: jest.fn().mockResolvedValue(undefined),
  loadToken: jest.fn().mockResolvedValue(null),
  clearToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/session-user-storage.service', () => ({
  saveSessionUser: jest.fn().mockResolvedValue(undefined),
  loadSessionUser: jest.fn().mockResolvedValue(null),
  clearSessionUser: jest.fn().mockResolvedValue(undefined),
}));

const mockedClearToken = clearToken as jest.MockedFunction<typeof clearToken>;

// Usuario mínimo válido según el contrato `User` de `src/types/user.ts`.
const mockUser: User = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  password: 'password-test',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
};

// Texto de la pantalla que indica que el contenido normal sigue visible.
const registerIncidentButtonLabel = 'Registrar incidencia';

// Pulsa el botón del último `Alert.alert` que coincida con el texto indicado.
// El diálogo nativo no existe en Jest: se ejecuta directamente su `onPress`.
// El botón "Cancelar" no tiene `onPress` (solo cierra el diálogo), por lo que
// la búsqueda exige únicamente que el botón exista y ejecuta su `onPress` si lo tiene.
async function pressLastAlertButton(
  alertSpy: jest.SpyInstance,
  buttonText: string,
): Promise<void> {
  const lastAlertCall = alertSpy.mock.calls.at(-1) as Parameters<typeof Alert.alert> | undefined;
  if (!lastAlertCall) {
    throw new Error('Alert.alert no fue llamado.');
  }

  const alertButtons: AlertButton[] = lastAlertCall[2] ?? [];
  const targetButton = alertButtons.find((button) => button.text === buttonText);
  if (!targetButton) {
    throw new Error(`No hay un botón de Alert con el texto "${buttonText}".`);
  }

  await act(async () => {
    targetButton.onPress?.();
  });
}

// Arnés de montaje: `SessionProvider` no acepta un estado inicial por prop, así
// que la sesión se inicia desde dentro. Los hijos solo se montan cuando la
// sesión ya está en memoria, para que HomeScreen calcule su saludo con el
// nombre del usuario. Tras cerrar sesión, HomeScreen sigue montada (renderiza
// su `Redirect`), por lo que este gate solo actúa en el arranque.
function SignedInSessionGate({ children }: { children: ReactNode }) {
  const { signIn } = useSession();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    signIn(mockUser, null).then(() => setIsSessionReady(true));
  }, [signIn]);

  if (!isSessionReady) {
    return null;
  }

  return <>{children}</>;
}

// Monta HomeScreen real dentro del SessionProvider real con sesión activa.
// `render` de RNTL 14 es asíncrono: hay que esperarlo para que `screen` quede
// enlazado a este montaje antes de consultarlo.
async function renderHomeScreenWithActiveSession() {
  await render(
    <SessionProvider>
      <SignedInSessionGate>
        <HomeScreen />
      </SignedInSessionGate>
    </SessionProvider>,
  );

  // Espera a que la pantalla esté montada con contenido real antes de interactuar.
  await screen.findByLabelText(registerIncidentButtonLabel);
}

describe('HomeScreen: cierre de sesión', () => {
  // Espía de Alert.alert: evita el diálogo nativo y permite pulsar sus botones.
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    // Los fake timers evitan que el intervalo de TypewriterText (saludo) dispare
    // setState fuera de act; userEvent.press los acelera de forma compatible.
    jest.useFakeTimers();

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    mockedClearToken.mockReset();
    mockedClearToken.mockResolvedValue(undefined);
    jest.mocked(router.replace).mockReset();
  });

  afterEach(() => {
    // Desmonta antes de restaurar los timers para no dejar intervalos vivos entre tests.
    cleanup();
    jest.useRealTimers();
    alertSpy.mockRestore();
  });

  it('con sesión activa muestra el botón de cierre de sesión', async () => {
    await renderHomeScreenWithActiveSession();

    expect(screen.getByLabelText('Cerrar sesión')).toBeOnTheScreen();
  });

  it('al pulsar el botón de cierre de sesión abre el Alert de confirmación', async () => {
    const user = userEvent.setup();
    await renderHomeScreenWithActiveSession();

    await user.press(screen.getByLabelText('Cerrar sesión'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Cerrar sesión');
  });

  it('al cancelar el Alert no limpia el token, no navega y mantiene el contenido de la pantalla', async () => {
    const user = userEvent.setup();
    await renderHomeScreenWithActiveSession();

    await user.press(screen.getByLabelText('Cerrar sesión'));
    await pressLastAlertButton(alertSpy, 'Cancelar');

    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText(registerIncidentButtonLabel)).toBeOnTheScreen();
  });

  it('al confirmar el cierre de sesión limpia el token una vez y navega a /login una vez', async () => {
    const user = userEvent.setup();
    await renderHomeScreenWithActiveSession();

    await user.press(screen.getByLabelText('Cerrar sesión'));
    await pressLastAlertButton(alertSpy, 'Cerrar sesión');

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledTimes(1);
    });

    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
