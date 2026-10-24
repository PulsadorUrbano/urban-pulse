/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

import {
  clearSessionUser,
  loadSessionUser,
  saveSessionUser,
} from '@/services/session-user-storage.service';
import type { SessionUser } from '@/types/user';

// Mock de SecureStore: los tests no tocan el almacenamiento nativo.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Clave de storage usada internamente por el servicio (no exportada).
const SESSION_USER_STORAGE_KEY = 'urbanpulse.auth.user';

const getItemAsyncMock = jest.mocked(SecureStore.getItemAsync);
const setItemAsyncMock = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsyncMock = jest.mocked(SecureStore.deleteItemAsync);

const civicSessionUser: SessionUser = {
  id: 'user-42',
  username: 'ciudadana42',
  email: 'ciudadana42@urbanpulse.test',
  role: 'civic',
  civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
};

describe('session-user-storage.service', () => {
  beforeEach(() => {
    getItemAsyncMock.mockReset();
    setItemAsyncMock.mockReset();
    deleteItemAsyncMock.mockReset();
  });

  describe('round trip saveSessionUser -> loadSessionUser', () => {
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

    it('recupera el mismo SessionUser (id, username, email, role) que se guardó', async () => {
      await saveSessionUser(civicSessionUser);

      await expect(loadSessionUser()).resolves.toEqual(civicSessionUser);
    });
  });

  describe('saveSessionUser', () => {
    it('guarda el sessionUser serializado como JSON bajo la clave del usuario de sesión', async () => {
      setItemAsyncMock.mockResolvedValueOnce(undefined);

      await saveSessionUser(civicSessionUser);

      expect(setItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(setItemAsyncMock).toHaveBeenCalledWith(
        SESSION_USER_STORAGE_KEY,
        JSON.stringify(civicSessionUser),
      );
    });

    it('propaga el error si SecureStore.setItemAsync rechaza', async () => {
      setItemAsyncMock.mockRejectedValueOnce(new Error('keychain no disponible'));

      await expect(saveSessionUser(civicSessionUser)).rejects.toThrow('keychain no disponible');
    });
  });

  describe('loadSessionUser', () => {
    it('lee la clave del usuario de sesión de SecureStore', async () => {
      getItemAsyncMock.mockResolvedValueOnce(null);

      await loadSessionUser();

      expect(getItemAsyncMock).toHaveBeenCalledWith(SESSION_USER_STORAGE_KEY);
    });

    it('devuelve null cuando no hay valor guardado', async () => {
      getItemAsyncMock.mockResolvedValueOnce(null);

      await expect(loadSessionUser()).resolves.toBeNull();
    });

    it('devuelve null sin lanzar cuando SecureStore.getItemAsync rechaza', async () => {
      getItemAsyncMock.mockRejectedValueOnce(new Error('keychain bloqueado'));

      await expect(loadSessionUser()).resolves.toBeNull();
    });

    it.each([
      ['JSON malformado', '{no es json'],
      ['cadena vacía', ''],
      ['valor null tras parsear', 'null'],
      ['valor string', '"x"'],
      ['valor array', '[]'],
      ['sin id', JSON.stringify({ username: 'a', email: 'a@a.com', role: 'civic' })],
      ['id no string (número)', JSON.stringify({ id: 1, username: 'a', email: 'a@a.com', role: 'civic' })],
      ['id null', JSON.stringify({ id: null, username: 'a', email: 'a@a.com', role: 'civic' })],
      ['sin username', JSON.stringify({ id: '1', email: 'a@a.com', role: 'civic' })],
      ['username no string (número)', JSON.stringify({ id: '1', username: 7, email: 'a@a.com', role: 'civic' })],
      ['username null', JSON.stringify({ id: '1', username: null, email: 'a@a.com', role: 'civic' })],
      ['sin email', JSON.stringify({ id: '1', username: 'a', role: 'civic' })],
      ['email no string (booleano)', JSON.stringify({ id: '1', username: 'a', email: true, role: 'civic' })],
      ['email null', JSON.stringify({ id: '1', username: 'a', email: null, role: 'civic' })],
      ['sin role', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com' })],
      ['role no string (número)', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com', role: 2 })],
      ['role null', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com', role: null })],
      ['sin civicId', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com', role: 'civic' })],
      ['civicId no string (número)', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com', role: 'civic', civicId: 5 })],
      ['civicId null', JSON.stringify({ id: '1', username: 'a', email: 'a@a.com', role: 'civic', civicId: null })],
    ])('devuelve null cuando el valor guardado es inválido: %s', async (_caseName, storedValue) => {
      getItemAsyncMock.mockResolvedValueOnce(storedValue);

      await expect(loadSessionUser()).resolves.toBeNull();
    });

    it('nunca devuelve la propiedad password aunque el JSON guardado la contenga', async () => {
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({
          id: '1',
          username: 'a',
          email: 'a@a.com',
          role: 'civic',
          civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
          password: 'secret',
        }),
      );

      const loadedSessionUser = await loadSessionUser();

      expect(loadedSessionUser).not.toHaveProperty('password');
      expect(Object.keys(loadedSessionUser ?? {}).sort()).toEqual([
        'civicId',
        'email',
        'id',
        'role',
        'username',
      ]);
    });

    it('devuelve solo id, username, email y role aunque el JSON guardado tenga campos extra', async () => {
      getItemAsyncMock.mockResolvedValueOnce(
        JSON.stringify({
          id: '1',
          username: 'a',
          email: 'a@a.com',
          role: 'admin',
          civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
          extra: true,
        }),
      );

      const loadedSessionUser = await loadSessionUser();

      expect(loadedSessionUser).toEqual({
        id: '1',
        username: 'a',
        email: 'a@a.com',
        role: 'admin',
        civicId: '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b',
      });
      expect(Object.keys(loadedSessionUser ?? {}).sort()).toEqual([
        'civicId',
        'email',
        'id',
        'role',
        'username',
      ]);
    });
  });

  describe('clearSessionUser', () => {
    it('llama a deleteItemAsync con la clave correcta del usuario de sesión', async () => {
      deleteItemAsyncMock.mockResolvedValueOnce(undefined);

      await clearSessionUser();

      expect(deleteItemAsyncMock).toHaveBeenCalledTimes(1);
      expect(deleteItemAsyncMock).toHaveBeenCalledWith(SESSION_USER_STORAGE_KEY);
    });
  });
});
