/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLogin } from '@/hooks/use-login';
import type { LoginResult } from '@/services/auth.service';
import { InvalidCredentialsError, login } from '@/services/auth.service';
import { loadLockoutState, resetLockout, saveLockoutState } from '@/services/lockout.service';
import { EMPTY_LOCKOUT_STATE } from '@/types/auth';
import type { AuthToken } from '@/types/token';
import type { LoginUserInput, MockUser } from '@/types/user';

jest.mock('@/services/auth.service', () => {
  // La clase de error se define dentro de la factory para conservar el `instanceof` real.
  class MockedInvalidCredentialsError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidCredentialsError';
    }
  }
  return {
    login: jest.fn(),
    InvalidCredentialsError: MockedInvalidCredentialsError,
  };
});

// Se conservan las funciones puras reales (isLocked, registerFailure,
// remainingLockMs, lockMessageFor) y solo se mockean las de I/O (SecureStore).
jest.mock('@/services/lockout.service', () => {
  const actualLockoutModule = jest.requireActual<typeof import('@/services/lockout.service')>(
    '@/services/lockout.service',
  );
  return {
    ...actualLockoutModule,
    loadLockoutState: jest.fn(),
    resetLockout: jest.fn(),
    saveLockoutState: jest.fn(),
  };
});

const mockedLogin = jest.mocked(login);
const mockedLoadLockoutState = jest.mocked(loadLockoutState);
const mockedResetLockout = jest.mocked(resetLockout);
const mockedSaveLockoutState = jest.mocked(saveLockoutState);

const userFixture: MockUser = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

const tokenFixture: AuthToken = { accessToken: 'token-abc', source: 'backend' };
const mockLoginResultFixture: LoginResult = { user: userFixture, token: tokenFixture, source: 'mock' };
const backendLoginResultFixture: LoginResult = { user: userFixture, token: tokenFixture, source: 'backend' };

const inputFixture: LoginUserInput = { username_email: 'ana', password: 'secreto' };

async function renderLoginHook() {
  const renderResult = await renderHook(() => useLogin());
  // Espera a que se cargue el bloqueo persistido al montar.
  await waitFor(() => expect(mockedLoadLockoutState).toHaveBeenCalledTimes(1));
  return renderResult;
}

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadLockoutState.mockResolvedValue({ ...EMPTY_LOCKOUT_STATE, recentFailures: [] });
    mockedResetLockout.mockResolvedValue(undefined);
    mockedSaveLockoutState.mockResolvedValue(undefined);
    mockedLogin.mockResolvedValue(mockLoginResultFixture);
  });

  describe('login exitoso', () => {
    it('devuelve user, token y source, y limpia el bloqueo persistido', async () => {
      const { result } = await renderLoginHook();

      let submitResult: Awaited<ReturnType<typeof result.current.submitLogin>> = null;
      await act(async () => {
        submitResult = await result.current.submitLogin(inputFixture);
      });

      expect(mockedLogin).toHaveBeenCalledWith(inputFixture);
      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture, source: 'mock' });
      expect(mockedResetLockout).toHaveBeenCalledTimes(1);
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('propaga source "backend" cuando el login real tiene éxito', async () => {
      mockedLogin.mockResolvedValueOnce(backendLoginResultFixture);
      const { result } = await renderLoginHook();

      let submitResult: Awaited<ReturnType<typeof result.current.submitLogin>> = null;
      await act(async () => {
        submitResult = await result.current.submitLogin(inputFixture);
      });

      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture, source: 'backend' });
    });
  });

  describe('InvalidCredentialsError cuenta como intento fallido', () => {
    it('devuelve null, expone el mensaje y persiste el fallo', async () => {
      const invalidCredentialsMessage = 'El usuario o contraseña no son correctos, inténtelo de nuevo.';
      mockedLogin.mockRejectedValueOnce(new InvalidCredentialsError(invalidCredentialsMessage));
      const { result } = await renderLoginHook();

      let submitResult: Awaited<ReturnType<typeof result.current.submitLogin>> = undefined as never;
      await act(async () => {
        submitResult = await result.current.submitLogin(inputFixture);
      });

      expect(submitResult).toBeNull();
      expect(result.current.errorMessage).toBe(invalidCredentialsMessage);
      expect(mockedSaveLockoutState).toHaveBeenCalledTimes(1);
      expect(mockedResetLockout).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('errores de conexión no cuentan como intento fallido', () => {
    it('devuelve null, expone error.message y no persiste ningún fallo', async () => {
      mockedLogin.mockRejectedValueOnce(new Error('No se pudo conectar con el servidor.'));
      const { result } = await renderLoginHook();

      let submitResult: Awaited<ReturnType<typeof result.current.submitLogin>> = undefined as never;
      await act(async () => {
        submitResult = await result.current.submitLogin(inputFixture);
      });

      expect(submitResult).toBeNull();
      expect(result.current.errorMessage).toBe('No se pudo conectar con el servidor.');
      expect(mockedSaveLockoutState).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('usa el mensaje genérico cuando lo lanzado no es instancia de Error', async () => {
      mockedLogin.mockRejectedValueOnce('x');
      const { result } = await renderLoginHook();

      await act(async () => {
        await result.current.submitLogin(inputFixture);
      });

      expect(result.current.errorMessage).toBe('Ocurrió un error inesperado al iniciar sesión.');
    });
  });

  describe('estado isSubmitting', () => {
    it('es true durante la operación y vuelve a false tras éxito o error', async () => {
      let resolveLogin!: (value: LoginResult) => void;
      mockedLogin.mockReturnValueOnce(
        new Promise<LoginResult>((resolve) => {
          resolveLogin = resolve;
        }),
      );
      const { result } = await renderLoginHook();

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise = result.current.submitLogin(inputFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        resolveLogin(mockLoginResultFixture);
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
