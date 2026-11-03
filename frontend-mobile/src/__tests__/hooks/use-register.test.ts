/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useRegister } from '@/hooks/use-register';
import type { RegisterResult } from '@/services/auth.service';
import { register, UsernameOrEmailTakenError } from '@/services/auth.service';
import { createCivic } from '@/services/civic.service';
import type { AuthToken } from '@/types/token';
import type { BackendUser, MockUser, RegisterUserInput } from '@/types/user';

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

const mockedRegister = jest.mocked(register);
const mockedCreateCivic = jest.mocked(createCivic);

const GENERIC_UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado al crear la cuenta.';

const mockUserFixture: MockUser = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
  source: 'mock',
};

const backendUserFixture: BackendUser = {
  id: 'backend-user-1',
  username: 'ana',
  email: 'ana@example.com',
  role: 'civic',
  civicId: 'backend-user-1',
  phone: '+34600111222',
  source: 'backend',
};

const tokenFixture: AuthToken = { accessToken: 'token-abc', source: 'backend' };

const mockRegisterResultFixture: RegisterResult = { user: mockUserFixture, token: tokenFixture, source: 'mock' };
const backendRegisterResultFixture: RegisterResult = {
  user: backendUserFixture,
  token: tokenFixture,
  source: 'backend',
};

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
    mockedRegister.mockResolvedValue(mockRegisterResultFixture);
    mockedCreateCivic.mockResolvedValue({ id: 'civic-1', userId: mockUserFixture.id, phone: '+34600111222' } as never);
    // Silencia el aviso de __DEV__ cuando falla createCivic.
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('registro exitoso vía mock', () => {
    it('no llama a createCivic cuando no hay teléfono y devuelve user, token y source', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithoutPhoneFixture);
      });

      expect(mockedRegister).toHaveBeenCalledWith(inputWithoutPhoneFixture);
      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(submitResult).toEqual({
        user: mockUserFixture,
        token: tokenFixture,
        source: 'mock',
        autoLoginFailed: false,
      });
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });

    it('llama a createCivic con userId y teléfono cuando el registro cae al mock', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).toHaveBeenCalledTimes(1);
      expect(mockedCreateCivic).toHaveBeenCalledWith({
        userId: mockUserFixture.id,
        phone: inputWithPhoneFixture.phone,
      });
      expect(submitResult).toMatchObject({ user: mockUserFixture, token: tokenFixture, source: 'mock' });
    });

    it('trata un teléfono compuesto solo por espacios como ausente y no llama a createCivic', async () => {
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister({ ...inputWithoutPhoneFixture, phone: '   ' });
      });

      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(submitResult).toMatchObject({ user: mockUserFixture, token: tokenFixture, source: 'mock' });
    });

    it('no falla el registro si createCivic rechaza y sigue devolviendo user y token', async () => {
      mockedCreateCivic.mockRejectedValueOnce(new Error('servidor caído'));
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).toHaveBeenCalledTimes(1);
      expect(submitResult).toMatchObject({ user: mockUserFixture, token: tokenFixture, source: 'mock' });
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('registro exitoso vía backend', () => {
    it('no llama a createCivic (el teléfono ya viajó en /auth/register) y devuelve source "backend"', async () => {
      mockedRegister.mockResolvedValueOnce(backendRegisterResultFixture);
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(submitResult).toEqual({
        user: backendUserFixture,
        token: tokenFixture,
        source: 'backend',
        autoLoginFailed: false,
      });
    });

    it('propaga autoLoginFailed: true sin llamar a createCivic ni lanzar', async () => {
      mockedRegister.mockResolvedValueOnce({
        user: backendUserFixture,
        token: null,
        source: 'backend',
        autoLoginFailed: true,
      });
      const { result } = await renderHook(() => useRegister());

      let submitResult: Awaited<ReturnType<typeof result.current.submitRegister>> = null;
      await act(async () => {
        submitResult = await result.current.submitRegister(inputWithPhoneFixture);
      });

      expect(mockedCreateCivic).not.toHaveBeenCalled();
      expect(submitResult).toEqual({
        user: backendUserFixture,
        token: null,
        source: 'backend',
        autoLoginFailed: true,
      });
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('errores de registro', () => {
    it('devuelve null y expone el mensaje exacto para UsernameOrEmailTakenError sin crear civic', async () => {
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
      const pendingRegister = createDeferred<RegisterResult>();
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
        pendingRegister.resolve(mockRegisterResultFixture);
        await firstCall;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('estado isSubmitting', () => {
    it('es true durante la operación y vuelve a false tras un éxito', async () => {
      const pendingRegister = createDeferred<RegisterResult>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);
      const { result } = await renderHook(() => useRegister());

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise = result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        pendingRegister.resolve(mockRegisterResultFixture);
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('es true durante la operación y vuelve a false tras un error de registro', async () => {
      const pendingRegister = createDeferred<RegisterResult>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);
      const { result } = await renderHook(() => useRegister());

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise = result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        pendingRegister.reject(new Error('Fallo'));
        await submitPromise;
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

      const pendingRegister = createDeferred<RegisterResult>();
      mockedRegister.mockReturnValueOnce(pendingRegister.promise);

      let submitPromise: Promise<unknown> = Promise.resolve(undefined);
      await act(async () => {
        submitPromise = result.current.submitRegister(inputWithoutPhoneFixture);
      });
      expect(result.current.errorMessage).toBeNull();

      await act(async () => {
        pendingRegister.resolve(mockRegisterResultFixture);
        await submitPromise;
      });
      expect(result.current.errorMessage).toBeNull();
    });
  });
});
