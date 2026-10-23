/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SessionProvider, useSession } from '@/hooks/use-session';
import { clearSessionUser, loadSessionUser, saveSessionUser } from '@/services/session-user-storage.service';
import { clearToken, loadToken, saveToken } from '@/services/token-storage.service';
import type { AuthToken } from '@/types/token';
import type { SessionUser, User } from '@/types/user';

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

const mockedSaveToken = jest.mocked(saveToken);
const mockedLoadToken = jest.mocked(loadToken);
const mockedClearToken = jest.mocked(clearToken);
const mockedSaveSessionUser = jest.mocked(saveSessionUser);
const mockedLoadSessionUser = jest.mocked(loadSessionUser);
const mockedClearSessionUser = jest.mocked(clearSessionUser);

const userWithPasswordFixture: User = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@example.com',
  password: 'secreto-en-texto-plano',
  role: 'civic',
};

const expectedSessionUserFixture: SessionUser = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@example.com',
  role: 'civic',
};

const tokenFixture: AuthToken = { accessToken: 'token-abc', source: 'backend' };

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

// Promesa controlada manualmente para decidir cuándo "resuelve" el storage.
function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Deja que las cadenas de promesas pendientes (Promise.all, then, finally) se completen.
async function flushPendingPromises(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolveFlush) => setTimeout(resolveFlush, 0));
  });
}

// Renderiza el hook dentro de SessionProvider y espera a que termine la restauración inicial.
async function renderSessionHook() {
  const renderResult = await renderHook(() => useSession(), { wrapper: SessionProvider });

  await waitFor(() => {
    expect(renderResult.result.current.isRestoringSession).toBe(false);
  });

  return renderResult;
}

describe('useSession / SessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSessionUser.mockResolvedValue(null);
    mockedLoadToken.mockResolvedValue(null);
    mockedSaveToken.mockResolvedValue(undefined);
    mockedSaveSessionUser.mockResolvedValue(undefined);
    mockedClearToken.mockResolvedValue(undefined);
    mockedClearSessionUser.mockResolvedValue(undefined);
  });

  describe('signIn', () => {
    it('guarda el usuario de sesión SIN password y el token cuando el token no es nulo', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      expect(mockedSaveSessionUser).toHaveBeenCalledTimes(1);
      expect(mockedSaveSessionUser).toHaveBeenCalledWith(expectedSessionUserFixture);
      expect(mockedSaveSessionUser.mock.calls[0][0]).not.toHaveProperty('password');
      expect(mockedSaveToken).toHaveBeenCalledTimes(1);
      expect(mockedSaveToken).toHaveBeenCalledWith(tokenFixture);
    });

    it('expone user sin password y token en el contexto tras iniciar sesión', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      expect(result.current.user).toEqual(expectedSessionUserFixture);
      expect(result.current.user).not.toHaveProperty('password');
      expect(result.current.token).toEqual(tokenFixture);
    });

    it('con token null no llama a saveToken pero sí a saveSessionUser', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, null);
      });

      expect(mockedSaveToken).not.toHaveBeenCalled();
      expect(mockedSaveSessionUser).toHaveBeenCalledTimes(1);
      expect(mockedSaveSessionUser).toHaveBeenCalledWith(expectedSessionUserFixture);
      expect(result.current.user).toEqual(expectedSessionUserFixture);
      expect(result.current.token).toBeNull();
    });

    it('si saveToken rechaza, saveSessionUser se llama igualmente y el signIn no lanza', async () => {
      mockedSaveToken.mockRejectedValueOnce(new Error('SecureStore caído'));
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      expect(mockedSaveSessionUser).toHaveBeenCalledWith(expectedSessionUserFixture);
      expect(result.current.user).toEqual(expectedSessionUserFixture);
    });

    it('si saveSessionUser rechaza, saveToken se llama igualmente y el signIn no lanza', async () => {
      mockedSaveSessionUser.mockRejectedValueOnce(new Error('SecureStore caído'));
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      expect(mockedSaveToken).toHaveBeenCalledWith(tokenFixture);
      expect(result.current.token).toEqual(tokenFixture);
    });
  });

  describe('signOut', () => {
    it('llama a clearToken y clearSessionUser y deja user/token en null', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockedClearToken).toHaveBeenCalledTimes(1);
      expect(mockedClearSessionUser).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('si clearToken rechaza, clearSessionUser se llama igualmente y user/token quedan en null', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      mockedClearToken.mockRejectedValueOnce(new Error('SecureStore caído'));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockedClearSessionUser).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('si clearSessionUser rechaza, user/token quedan en null y signOut no lanza', async () => {
      const { result } = await renderSessionHook();

      await act(async () => {
        await result.current.signIn(userWithPasswordFixture, tokenFixture);
      });

      mockedClearSessionUser.mockRejectedValueOnce(new Error('SecureStore caído'));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockedClearToken).toHaveBeenCalledTimes(1);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('restauración de sesión al montar', () => {
    it('restaura user y token cuando ambos storages resuelven valores válidos', async () => {
      mockedLoadSessionUser.mockResolvedValueOnce(expectedSessionUserFixture);
      mockedLoadToken.mockResolvedValueOnce(tokenFixture);

      const { result } = await renderSessionHook();

      expect(result.current.user).toEqual(expectedSessionUserFixture);
      expect(result.current.token).toEqual(tokenFixture);
      expect(result.current.isRestoringSession).toBe(false);
    });

    it('restaura user y deja token en null cuando loadToken resuelve null', async () => {
      mockedLoadSessionUser.mockResolvedValueOnce(expectedSessionUserFixture);
      mockedLoadToken.mockResolvedValueOnce(null);

      const { result } = await renderSessionHook();

      expect(result.current.user).toEqual(expectedSessionUserFixture);
      expect(result.current.token).toBeNull();
      expect(result.current.isRestoringSession).toBe(false);
    });

    it('no restaura nada si no hay usuario persistido, aunque haya token, y acaba isRestoringSession en false', async () => {
      mockedLoadSessionUser.mockResolvedValueOnce(null);
      mockedLoadToken.mockResolvedValueOnce(tokenFixture);

      const { result } = await renderSessionHook();

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isRestoringSession).toBe(false);
    });

    it('isRestoringSession es true justo al montar, antes de resolver los storages', async () => {
      const pendingUserLoad = createDeferred<SessionUser | null>();
      const pendingTokenLoad = createDeferred<AuthToken | null>();
      mockedLoadSessionUser.mockReturnValueOnce(pendingUserLoad.promise);
      mockedLoadToken.mockReturnValueOnce(pendingTokenLoad.promise);

      const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

      expect(result.current.isRestoringSession).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();

      await act(async () => {
        pendingUserLoad.resolve(expectedSessionUserFixture);
        pendingTokenLoad.resolve(tokenFixture);
      });

      await waitFor(() => {
        expect(result.current.isRestoringSession).toBe(false);
      });
    });

    it('no produce warnings ni errores en consola si se desmonta antes de resolver la restauración', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const pendingUserLoad = createDeferred<SessionUser | null>();
      const pendingTokenLoad = createDeferred<AuthToken | null>();
      mockedLoadSessionUser.mockReturnValueOnce(pendingUserLoad.promise);
      mockedLoadToken.mockReturnValueOnce(pendingTokenLoad.promise);

      const { unmount } = await renderHook(() => useSession(), { wrapper: SessionProvider });

      expect(mockedLoadSessionUser).toHaveBeenCalledTimes(1);
      expect(mockedLoadToken).toHaveBeenCalledTimes(1);

      await unmount();

      await act(async () => {
        pendingUserLoad.resolve(expectedSessionUserFixture);
        pendingTokenLoad.resolve(tokenFixture);
      });

      await flushPendingPromises();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('si se desmonta antes de resolver, un rechazo posterior tampoco produce errores en consola', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const pendingUserLoad = createDeferred<SessionUser | null>();
      const pendingTokenLoad = createDeferred<AuthToken | null>();
      mockedLoadSessionUser.mockReturnValueOnce(pendingUserLoad.promise);
      mockedLoadToken.mockReturnValueOnce(pendingTokenLoad.promise);

      const { unmount } = await renderHook(() => useSession(), { wrapper: SessionProvider });

      await unmount();

      await act(async () => {
        pendingUserLoad.resolve(null);
        pendingTokenLoad.resolve(null);
      });

      await flushPendingPromises();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
