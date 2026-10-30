/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

import { clearToken, loadToken, saveToken } from '@/services/token-storage.service';
import type { AuthToken } from '@/types/token';

// Mock de SecureStore: los tests no tocan el almacenamiento nativo.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Clave de storage usada internamente por el servicio (no exportada).
const TOKEN_STORAGE_KEY = 'urbanpulse.auth.token';

const getItemAsyncMock = jest.mocked(SecureStore.getItemAsync);
const setItemAsyncMock = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsyncMock = jest.mocked(SecureStore.deleteItemAsync);

const backendToken: AuthToken = { accessToken: 'backend-jwt-abc', source: 'backend' };
const mockToken: AuthToken = {
  accessToken: 'mock.eyJ1c2VySWQiOiI0MiJ9.simulated',
  source: 'mock',
};

describe('token-storage.service', () => {
  beforeEach(() => {
    getItemAsyncMock.mockReset();
    setItemAsyncMock.mockReset();
    deleteItemAsyncMock.mockReset();
  });

  describe('round trip saveToken -> loadToken', () => {
    // Almacén en memoria que simula SecureStore entre llamadas.
    let secureStoreContents: Map<string, string>;

    beforeEach(() => {
      secureStoreContents = new Map<string, string>();
      setItemAsyncMock.mockImplementation(async (key: string, value: string) => {
        secureStoreContents.set(key, value);
      });
      getItemAsyncMock.mockImplementation(async (key: string) => {
        return secureStoreContents.get(key) ?? null;
      });
    });

    it('recupera un token con source "backend" tal cual se guardó', async () => {
      await saveToken(backendToken);

      await expect(loadToken()).resolves.toEqual(backendToken);
    });

    it('recupera un token con source "mock" tal cual se guardó', async () => {
      await saveToken(mockToken);

      await expect(loadToken()).resolves.toEqual(mockToken);
    });
  });

  describe('saveToken', () => {
    it('guarda el token serializado como JSON bajo la clave del token', async () => {
      setItemAsyncMock.mockResolvedValueOnce(undefined);

      await saveToken(backendToken);

      expect(setItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(setItemAsyncMock).toHaveBeenCalledWith(
        TOKEN_STORAGE_KEY,
        JSON.stringify(backendToken),
      );
    });

    it('propaga el error si SecureStore.setItemAsync rechaza', async () => {
      setItemAsyncMock.mockRejectedValueOnce(new Error('keychain no disponible'));

      await expect(saveToken(backendToken)).rejects.toThrow('keychain no disponible');
    });
  });

  describe('loadToken', () => {
    it('lee la clave del token de SecureStore', async () => {
      getItemAsyncMock.mockResolvedValueOnce(null);

      await loadToken();

      expect(getItemAsyncMock).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    });

    it('devuelve null cuando no hay valor guardado', async () => {
      getItemAsyncMock.mockResolvedValueOnce(null);

      await expect(loadToken()).resolves.toBeNull();
    });

    it.each([
      ['JSON inválido', '{no es json'],
      ['cadena vacía', ''],
      ['valor null', 'null'],
      ['valor string', '"x"'],
      ['valor array', '[]'],
      ['sin accessToken', JSON.stringify({ source: 'backend' })],
      ['accessToken no string (número)', JSON.stringify({ accessToken: 123, source: 'backend' })],
      ['accessToken null', JSON.stringify({ accessToken: null, source: 'mock' })],
      ['source inválido', JSON.stringify({ accessToken: 'abc', source: 'other' })],
      ['sin source', JSON.stringify({ accessToken: 'abc' })],
    ])('devuelve null cuando el valor guardado es inválido: %s', async (_caseName, storedValue) => {
      getItemAsyncMock.mockResolvedValueOnce(storedValue);

      await expect(loadToken()).resolves.toBeNull();
    });

    it('devuelve null sin lanzar cuando SecureStore.getItemAsync rechaza', async () => {
      getItemAsyncMock.mockRejectedValueOnce(new Error('keychain bloqueado'));

      await expect(loadToken()).resolves.toBeNull();
    });

    it('devuelve solo accessToken y source aunque el JSON guardado tenga campos extra', async () => {
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({ accessToken: 'abc', source: 'backend', role: 'admin', extra: true }),
      );

      const loadedToken = await loadToken();

      expect(loadedToken).toEqual({ accessToken: 'abc', source: 'backend' });
      expect(Object.keys(loadedToken ?? {}).sort()).toEqual(['accessToken', 'source']);
    });
  });

  describe('clearToken', () => {
    it('llama a deleteItemAsync con la clave correcta del token', async () => {
      deleteItemAsyncMock.mockResolvedValueOnce(undefined);

      await clearToken();

      expect(deleteItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(deleteItemAsyncMock).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    });
  });
});
