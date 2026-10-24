/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useRegister } from '@/hooks/use-register';
import { register, UsernameOrEmailTakenError } from '@/services/auth.service';
import { createCivic } from '@/services/civic.service';
import { requestToken } from '@/services/token.service';
import type { AuthToken } from '@/types/token';
import type { RegisterUserInput, User } from '@/types/user';

jest.mock('@/services/auth.service', () => {
  // La clase de error se define dentro de la factory para conservar el `instanceof` real.
  class MockedUsernameOrEmailTakenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UsernameOrEmailTakenError';
    }
  }
  return {
    register: jest.fn(),
    UsernameOrEmailTakenError: MockedUsernameOrEmailTakenError,
  };
});

jest.mock('@/services/civic.service', () => ({
  createCivic: jest.fn(),
}));

jest.mock('@/services/token.service', () => ({
  requestToken: jest.fn(),
}));

const mockedRegister = jest.mocked(register);
const mockedCreateCivic = jest.mocked(createCivic);
const mockedRequestToken = jest.mocked(requestToken);

const GENERIC_UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado al crear la cuenta.';

const userFixture: User = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto',
  role: 'civic',
};

const tokenFixture: AuthToken = { accessToken: 'token-abc', source: 'backend' };

const inputWithoutPhoneFixture: RegisterUserInput = {
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto',
};

const inputWithPhoneFixture: RegisterUserInput = {
  ...inputWithoutPhoneFixture,
  phone: '+34600111222',
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

// Promesa controlada manualmente para decidir cuándo "resuelve" el servicio.
function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useRegister', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRegister.mockResolvedValue(userFixture);
    mockedCreateCivic.mockResolvedValue({ id: 'civic-1', userId: userFixture.id, phone: '+34600111222' } as never);
    mockedRequestToken.mockResolvedValue(tokenFixture);
    // Silencia el aviso de __DEV__ cuando falla createCivic.
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('registro exitoso', () => {
    it('no llama a createCivic cuando no hay teléfono, pero solicita el token y devuelve user y token', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(mockedRegister).toHaveBeenCalledWith(inputWithoutPhoneFixture);
      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(mockedRequestToken).toHaveBeenCalledWith(userFixture.id);
      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture });
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });

    it('llama a createCivic con userId y teléfono y devuelve user y token', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).toHaveBeenCalledTimes(1);
      expect(mockedCreateCivic).toHaveBeenCalledWith({
        userId: userFixture.id,
        phone: inputWithPhoneFixture.phone,
      });
      expect(mockedRequestToken).toHaveBeenCalledWith(userFixture.id);
      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture });
      expect(result.current.errorMessage).toBeNull();
    });

    it('trata un teléfono compuesto solo por espacios como ausente y no llama a createCivic', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister({ ...inputWithoutPhoneFixture, phone: '   ' });
      });

      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture });
    });

    it('no falla el registro si createCivic rechaza y sigue devolviendo user y token', async () => {
      mockedCreateCivic.mockRejectedValueOnce(new Error('servidor caído'));
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).toHaveBeenCalledTimes(1);
      expect(submitResult).toEqual({ user: userFixture, token: tokenFixture });
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('devuelve token null cuando requestToken resuelve null', async () => {
      mockedRequestToken.mockResolvedValueOnce(null);
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(submitResult).toEqual({ user: userFixture, token: null });
      expect(submitResult).not.toBeNull();
    });
  });

  describe('errores de registro', () => {
    it('devuelve null y expone el mensaje exacto para UsernameOrEmailTakenError sin crear civic ni token', async () => {
      const takenMessage = 'Ese nombre de usuario ya está en uso.';
      mockedRegister.mockRejectedValueOnce(new UsernameOrEmailTakenError(takenMessage));
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = undefined as never;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(submitResult).toBeNull();
      expect(result.current.errorMessage).toBe(takenMessage);
      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(mockedRequestToken).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('devuelve null y expone error.message para un Error genérico', async () => {
      mockedRegister.mockRejectedValueOnce(new Error('Fallo de red'));
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = undefined as never;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(submitResult).toBeNull();
      expect(result.current.errorMessage).toBe('Fallo de red');
      expect(mockedRequestToken).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('usa el mensaje genérico cuando lo lanzado no es instancia de Error', async () => {
      mockedRegister.mockRejectedValueOnce('x');
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = undefined as never;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(submitResult).toBeNull();
      expect(result.current.errorMessage).toBe(GENERIC_UNEXPECTED_ERROR_MESSAGE);
    });
  });

  describe('llamadas concurrentes', () => {
    it('la segunda llamada devuelve null inmediatamente mientras la primera está en curso', async () => {
      const pendingRegister = createDeferred<User>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);
      const { result } = await renderHook(() => useRegister());

      let firstCall: Promise<unknown> = Promise.resolve(undefined);
      let secondCallResult: unknown = 'sin ejecutar';
      await act(async () => {
        firstCall = result.current.submitRegister(inputWithoutPhoneFixture);
        secondCallResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(secondCallResult).toBeNull();
      expect(mockedRegister).toHaveBeenCalledTimes(1);

      await act(async () => {
        pendingRegister.resolve(userFixture);
        await firstCall;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('estado isSubmitting', () => {
    it('es true durante la operación y vuelve a false tras un éxito', async () => {
      const pendingRegister = createDeferred<User>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);
      const { result } = await renderHook(() => useRegister());

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise =result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        pendingRegister.resolve(userFixture);
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('es true durante la operación y vuelve a false tras un error de registro', async () => {
      const pendingRegister = createDeferred<User>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);
      const { result } = await renderHook(() => useRegister());

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise =result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        pendingRegister.reject(new Error('Fallo'));
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('vuelve a false tras un fallo de requestToken', async () => {
      const pendingToken = createDeferred<AuthToken | null>();
      mockedRequestToken.mockReturnValueOnce(pendingToken.promise);
      const { result } = await renderHook(() => useRegister());

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise =result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        pendingToken.reject(new Error('token caído'));
        await submitPromise.catch(() => undefined);
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('errorMessage', () => {
    it('se resetea a null al iniciar una nueva llamada tras un error previo', async () => {
      mockedRegister.mockRejectedValueOnce(new Error('Primer fallo'));
      const { result } = await renderHook(() => useRegister());

      await act(async () => {
        await result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.errorMessage).toBe('Primer fallo');

      const pendingRegister = createDeferred<User>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise =result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.errorMessage).toBeNull();

      await act(async () => {
        pendingRegister.resolve(userFixture);
        await submitPromise;
      });
      expect(result.current.errorMessage).toBeNull();
    });
  });
});
