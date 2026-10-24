/// <reference types="jest" />
import { cleanup, render, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import RegisterScreen from '@/app/register';
import { router } from 'expo-router';
import { useRegister, type RegisterSuccess, type UseRegisterResult } from '@/hooks/use-register';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import type { AuthToken } from '@/types/token';
import type { SessionUser, User } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de la pantalla de registro (`src/app/register.tsx`). Se monta la pantalla
// real con sus componentes reales (CountryCodePicker, PasswordInput,
// PasswordStrengthMeter) y se sustituyen solo las fronteras externas:
// navegación (expo-router), hook de registro, sesión, estilos y safe area.
//
// Casos cubiertos:
//   - render inicial: campos visibles y país por defecto (España)
//   - validación del botón "Crear cuenta" (habilitado / deshabilitado)
//   - mensaje de contraseñas no coincidentes
//   - normalización del teléfono antes de enviar (prefijo + número)
//   - flujo de éxito (signIn + navegación a "/") y de fallo (sin navegar)
//   - estado de envío (inputs bloqueados y spinner en el botón)
//   - gate de restauración de sesión y redirección si ya hay usuario
//   - enlace "Ya tienes cuenta" -> router.back()
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// `PasswordInput` renderiza un icono; se sustituye para no cargar la fuente.
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// `Redirect` se sustituye por un stub que pinta el `href` recibido, igual que
// en el test de login, para distinguir "redirigió a /" por contenido visible.
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

// El hook de registro no es la frontera que se testea aquí: se sustituye completo.
jest.mock('@/hooks/use-register', () => ({
  useRegister: jest.fn(),
}));

// La sesión se controla desde cada test (usuario, restauración y signIn).
jest.mock('@/hooks/use-session', () => ({
  useSession: jest.fn(),
}));

const mockedUseRegister = useRegister as jest.MockedFunction<typeof useRegister>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

const triggerLabelDefaultCountry = 'Cambiar prefijo de país, actual: España +34';
const defaultCountryText = '🇪🇸 ES +34';
const restoringIndicatorTestId = 'session-restoring-indicator';
const submitButtonLabel = 'Crear cuenta';
const alreadyHaveAccountLinkLabel = 'Ya tienes cuenta, inicia sesión';
const passwordsDoNotMatchMessage = 'Las contraseñas no coinciden.';

const fieldLabelByKey = {
  username: 'Nombre de usuario',
  email: 'Correo electrónico',
  phone: 'Teléfono',
  password: 'Contraseña',
  confirmPassword: 'Confirmar contraseña',
} as const;

type RegisterFieldKey = keyof typeof fieldLabelByKey;
type RegisterFormValues = Partial<Record<RegisterFieldKey, string>>;

// Formulario completamente válido (contraseña de nivel "acceptable").
const validFormValues: Required<Omit<RegisterFormValues, 'phone'>> = {
  username: 'ciudadano_test',
  email: 'ciudadano@example.com',
  password: 'Abcdefg1',
  confirmPassword: 'Abcdefg1',
};

// Usuario y token devueltos por el registro exitoso.
const registeredUser: User = {
  id: '2',
  username: 'ciudadano_test',
  email: 'ciudadano@example.com',
  password: 'Abcdefg1',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
};

const registeredAuthToken: AuthToken = {
  accessToken: 'token-test',
  source: 'mock',
};

// Forma persistible del usuario en sesión (sin password).
const registeredSessionUser: SessionUser = {
  id: registeredUser.id,
  username: registeredUser.username,
  email: registeredUser.email,
  role: registeredUser.role,
  civicId: registeredUser.civicId,
};

// Valor por defecto del hook de registro: formulario en estado inicial, sin errores.
function buildIdleRegisterResult(): UseRegisterResult {
  return {
    isSubmitting: false,
    errorMessage: null,
    submitRegister: jest.fn().mockResolvedValue(null),
  };
}

// Valor por defecto de la sesión: sin usuario y sin restauración pendiente.
function buildIdleSessionValue(): SessionContextValue {
  return {
    user: null,
    token: null,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
  };
}

// Monta la pantalla real. `render` de RNTL 14 es asíncrono: se espera para que `screen` quede enlazado.
async function renderRegisterScreen() {
  await render(<RegisterScreen />);
}

// Escribe en los campos indicados. Los valores vacíos o ausentes se omiten.
async function fillRegisterForm(
  user: ReturnType<typeof userEvent.setup>,
  formValues: RegisterFormValues,
) {
  const fieldKeys = Object.keys(formValues) as RegisterFieldKey[];

  for (const fieldKey of fieldKeys) {
    const fieldValue = formValues[fieldKey];
    if (!fieldValue) continue;
    await user.type(screen.getByLabelText(fieldLabelByKey[fieldKey]), fieldValue);
  }
}

function getSubmitButton() {
  return screen.getByRole('button', { name: submitButtonLabel });
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRegister.mockReturnValue(buildIdleRegisterResult());
    mockedUseSession.mockReturnValue(buildIdleSessionValue());
  });

  afterEach(() => {
    cleanup();
  });

  describe('render inicial', () => {
    it('muestra los cinco campos del formulario', async () => {
      await renderRegisterScreen();

      expect(screen.getByLabelText(fieldLabelByKey.username)).toBeOnTheScreen();
      expect(screen.getByLabelText(fieldLabelByKey.email)).toBeOnTheScreen();
      expect(screen.getByLabelText(fieldLabelByKey.phone)).toBeOnTheScreen();
      expect(screen.getByLabelText(fieldLabelByKey.password)).toBeOnTheScreen();
      expect(screen.getByLabelText(fieldLabelByKey.confirmPassword)).toBeOnTheScreen();
    });

    it('preselecciona España (+34) como país por defecto', async () => {
      await renderRegisterScreen();

      expect(screen.getByRole('button', { name: triggerLabelDefaultCountry })).toBeOnTheScreen();
      expect(screen.getByText(defaultCountryText)).toBeOnTheScreen();
    });
  });

  describe('habilitación del botón "Crear cuenta"', () => {
    it.each<[string, RegisterFormValues]>([
      ['username vacío', { ...validFormValues, username: '' }],
      ['email vacío', { ...validFormValues, email: '' }],
      ['email con formato inválido', { ...validFormValues, email: 'sin-arroba' }],
      ['contraseña vacía', { ...validFormValues, password: '', confirmPassword: '' }],
      ['contraseña de nivel "invalid"', { ...validFormValues, password: 'abc', confirmPassword: 'abc' }],
      ['confirmación distinta de la contraseña', { ...validFormValues, confirmPassword: 'Abcdefg2' }],
    ])('está deshabilitado cuando %s', async (_caseDescription, formValues) => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, formValues);

      expect(getSubmitButton()).toBeDisabled();
    });

    it('está habilitado con contraseña de nivel "acceptable" y confirmación coincidente', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, validFormValues);

      expect(getSubmitButton()).toBeEnabled();
    });

    it('está habilitado con contraseña de nivel "strong" y confirmación coincidente', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, {
        ...validFormValues,
        password: 'Abcdefg1!',
        confirmPassword: 'Abcdefg1!',
      });

      expect(getSubmitButton()).toBeEnabled();
    });
  });

  describe('mensaje de contraseñas no coincidentes', () => {
    it('aparece cuando ambos campos tienen contenido y no coinciden', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, { password: 'Abcdefg1', confirmPassword: 'Abcdefg2' });

      expect(screen.getByText(passwordsDoNotMatchMessage)).toBeOnTheScreen();
    });

    it('no aparece mientras solo uno de los dos campos tiene contenido', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, { password: 'Abcdefg1' });

      expect(screen.queryByText(passwordsDoNotMatchMessage)).toBeNull();
    });

    it('no aparece cuando ambas contraseñas coinciden', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, validFormValues);

      expect(screen.queryByText(passwordsDoNotMatchMessage)).toBeNull();
    });

    it('tiene prioridad sobre el errorMessage del hook de registro', async () => {
      mockedUseRegister.mockReturnValue({
        ...buildIdleRegisterResult(),
        errorMessage: 'Ya existe una cuenta con ese correo.',
      });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, { password: 'Abcdefg1', confirmPassword: 'Abcdefg2' });

      expect(screen.getByText(passwordsDoNotMatchMessage)).toBeOnTheScreen();
      expect(screen.queryByText('Ya existe una cuenta con ese correo.')).toBeNull();
    });
  });

  describe('normalización del teléfono al enviar', () => {
    it('envía phone undefined cuando el teléfono está vacío', async () => {
      const submitRegisterMock = jest.fn().mockResolvedValue(null);
      mockedUseRegister.mockReturnValue({ ...buildIdleRegisterResult(), submitRegister: submitRegisterMock });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, validFormValues);
      await user.press(getSubmitButton());

      await waitFor(() => expect(submitRegisterMock).toHaveBeenCalledTimes(1));
      expect(submitRegisterMock).toHaveBeenCalledWith({
        username: validFormValues.username,
        email: validFormValues.email,
        password: validFormValues.password,
        phone: undefined,
      });
    });

    it('envía phone undefined cuando el teléfono solo contiene espacios', async () => {
      const submitRegisterMock = jest.fn().mockResolvedValue(null);
      mockedUseRegister.mockReturnValue({ ...buildIdleRegisterResult(), submitRegister: submitRegisterMock });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, { ...validFormValues, phone: '   ' });
      await user.press(getSubmitButton());

      await waitFor(() => expect(submitRegisterMock).toHaveBeenCalledTimes(1));
      expect(submitRegisterMock.mock.calls[0][0].phone).toBeUndefined();
    });

    it('antepone el prefijo del país por defecto al teléfono informado', async () => {
      const submitRegisterMock = jest.fn().mockResolvedValue(null);
      mockedUseRegister.mockReturnValue({ ...buildIdleRegisterResult(), submitRegister: submitRegisterMock });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, { ...validFormValues, phone: '612345678' });
      await user.press(getSubmitButton());

      await waitFor(() => expect(submitRegisterMock).toHaveBeenCalledTimes(1));
      expect(submitRegisterMock.mock.calls[0][0].phone).toBe('+34612345678');
    });
  });

  describe('flujo de envío', () => {
    it('con registro exitoso inicia sesión con el usuario y token devueltos y navega a "/"', async () => {
      const registerSuccess: RegisterSuccess = { user: registeredUser, token: registeredAuthToken };
      const signInMock = jest.fn().mockResolvedValue(undefined);
      mockedUseRegister.mockReturnValue({
        ...buildIdleRegisterResult(),
        submitRegister: jest.fn().mockResolvedValue(registerSuccess),
      });
      mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), signIn: signInMock });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, validFormValues);
      await user.press(getSubmitButton());

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
      expect(signInMock).toHaveBeenCalledWith(registeredUser, registeredAuthToken);
    });

    it('con registro fallido no inicia sesión, no navega y muestra el errorMessage del hook', async () => {
      const signInMock = jest.fn().mockResolvedValue(undefined);
      const submitRegisterMock = jest.fn().mockResolvedValue(null);
      mockedUseRegister.mockReturnValue({
        isSubmitting: false,
        errorMessage: 'Ya existe una cuenta con ese correo.',
        submitRegister: submitRegisterMock,
      });
      mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), signIn: signInMock });
      const user = userEvent.setup();
      await renderRegisterScreen();

      await fillRegisterForm(user, validFormValues);
      await user.press(getSubmitButton());

      await waitFor(() => expect(submitRegisterMock).toHaveBeenCalledTimes(1));
      expect(signInMock).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.getByText('Ya existe una cuenta con ese correo.')).toBeOnTheScreen();
    });
  });

  describe('estado de envío', () => {
    beforeEach(() => {
      mockedUseRegister.mockReturnValue({ ...buildIdleRegisterResult(), isSubmitting: true });
    });

    it('bloquea los inputs mientras se envía el registro', async () => {
      await renderRegisterScreen();

      expect(screen.getByLabelText(fieldLabelByKey.username).props.editable).toBe(false);
      expect(screen.getByLabelText(fieldLabelByKey.email).props.editable).toBe(false);
      expect(screen.getByLabelText(fieldLabelByKey.phone).props.editable).toBe(false);
      expect(screen.getByLabelText(fieldLabelByKey.password).props.editable).toBe(false);
      expect(screen.getByLabelText(fieldLabelByKey.confirmPassword).props.editable).toBe(false);
    });

    it('muestra el ActivityIndicator en el botón y lo deshabilita', async () => {
      await renderRegisterScreen();

      const submitButton = getSubmitButton();
      // RNTL v14 eliminó UNSAFE_getByType; se recorre el árbol raíz buscando el
      // host nativo del ActivityIndicator. En esta pantalla es el único renderizado.
      const root = screen.root;
      expect(root).not.toBeNull();
      const indicatorNodes = (root ?? screen.container).queryAll((instance) =>
        instance.type.includes('ActivityIndicator'),
      );
      expect(indicatorNodes).toHaveLength(1);
      expect(within(submitButton).queryByText(submitButtonLabel)).toBeNull();
      expect(submitButton).toBeBusy();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('gate de restauración de sesión', () => {
    it('muestra solo el loader mientras se restaura la sesión', async () => {
      mockedUseSession.mockReturnValue({ ...buildIdleSessionValue(), isRestoringSession: true });
      await renderRegisterScreen();

      expect(screen.getByTestId(restoringIndicatorTestId)).toBeOnTheScreen();
      expect(screen.queryByLabelText(fieldLabelByKey.username)).toBeNull();
    });

    it('redirige a "/" cuando ya hay un usuario en sesión, sin mostrar el formulario', async () => {
      mockedUseSession.mockReturnValue({
        ...buildIdleSessionValue(),
        user: registeredSessionUser,
        token: registeredAuthToken,
      });
      await renderRegisterScreen();

      expect(screen.getByText('redirect:/')).toBeOnTheScreen();
      expect(screen.queryByLabelText(fieldLabelByKey.username)).toBeNull();
    });
  });

  describe('navegación de vuelta a login', () => {
    it('el enlace "Ya tienes cuenta" invoca router.back()', async () => {
      const user = userEvent.setup();
      await renderRegisterScreen();

      await user.press(screen.getByRole('button', { name: alreadyHaveAccountLinkLabel }));

      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });
});
