/// <reference types="jest" />
import { InvalidCredentialsError, USERS_ENDPOINT, login } from '@/services/auth.service';
import { RequestTimeoutError } from '@/services/http';
import type { User } from '@/types/user';

// Usuario de referencia que devuelve el servidor mock (json-server).
const ana: User = {
  id: '1',
  username: 'ana_garcia',
  email: 'ana@example.com',
  password: 'Secreta123',
  role: 'civic',
};

// Respuesta mínima compatible con lo que usa `fetchUsersByField`.
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

// Captura el error lanzado por una promesa rechazada para inspeccionarlo.
async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba que la promesa rechazara, pero resolvió');
}

describe('login', () => {
  const fetchMock = jest.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('usa el endpoint de usuarios del servidor mock', () => {
    expect(USERS_ENDPOINT).toMatch(/\/users$/);
  });

  it('resuelve el usuario cuando el identificador coincide por username y la contraseña es correcta', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ana]));

    const loggedUser = await login({ username_email: 'ana_garcia', password: 'Secreta123' });

    expect(loggedUser).toEqual(ana);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${USERS_ENDPOINT}?username=ana_garcia`);
  });

  it('si no hay match por username, busca por email y resuelve con el usuario correcto', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([ana]));

    const loggedUser = await login({ username_email: 'ana@example.com', password: 'Secreta123' });

    expect(loggedUser).toEqual(ana);
    // Dos peticiones: primero username, después email.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(`${USERS_ENDPOINT}?username=ana%40example.com`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${USERS_ENDPOINT}?email=ana%40example.com`);
  });

  it('lanza InvalidCredentialsError con mensaje genérico cuando la contraseña no coincide', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ana]));

    const error = await captureRejection(
      login({ username_email: 'ana_garcia', password: 'otra-contraseña' }),
    );

    expect(error).toBeInstanceOf(InvalidCredentialsError);
    expect((error as Error).message).toBe(
      'El usuario o contraseña no son correctos, inténtelo de nuevo.',
    );
  });

  it('con contraseña incorrecta no reintenta la búsqueda por email', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ana]));

    await expect(
      login({ username_email: 'ana_garcia', password: 'mal' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lanza InvalidCredentialsError cuando el usuario no existe (ambas búsquedas vacías)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    const error = await captureRejection(
      login({ username_email: 'fantasma', password: 'cualquiera' }),
    );

    expect(error).toBeInstanceOf(InvalidCredentialsError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('el InvalidCredentialsError tiene name "InvalidCredentialsError"', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    const error = await captureRejection(login({ username_email: 'nadie', password: 'x' }));

    expect((error as Error).name).toBe('InvalidCredentialsError');
  });

  it('recorta espacios alrededor del identificador antes de consultar', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([ana]));

    const loggedUser = await login({ username_email: '   ana_garcia  ', password: 'Secreta123' });

    expect(loggedUser).toEqual(ana);
    expect(fetchMock.mock.calls[0][0]).toBe(`${USERS_ENDPOINT}?username=ana_garcia`);
  });

  it('descarta usuarios devueltos cuyo campo no coincide exactamente con el identificador', async () => {
    // El servidor devuelve un usuario con username distinto: no debe aceptarse.
    const otherUser: User = { ...ana, id: '2', username: 'ana_garcia_2' };
    fetchMock
      .mockResolvedValueOnce(jsonResponse([otherUser]))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(
      login({ username_email: 'ana_garcia', password: 'Secreta123' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('un fallo de red NO se trata como credenciales incorrectas', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await captureRejection(
      login({ username_email: 'ana_garcia', password: 'Secreta123' }),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(InvalidCredentialsError);
    expect((error as Error).message).toBe(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('un timeout (AbortError traducido a RequestTimeoutError) NO se trata como credenciales incorrectas', async () => {
    // fetchWithTimeout convierte un AbortError en RequestTimeoutError.
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortError);

    const error = await captureRejection(
      login({ username_email: 'ana_garcia', password: 'Secreta123' }),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(InvalidCredentialsError);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect((error as Error).message).toContain('El servidor tardó demasiado en responder.');
  });

  it('una respuesta HTTP no ok NO se trata como credenciales incorrectas', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));

    const error = await captureRejection(
      login({ username_email: 'ana_garcia', password: 'Secreta123' }),
    );

    expect(error).not.toBeInstanceOf(InvalidCredentialsError);
    expect((error as Error).message).toBe('No se pudo iniciar sesión. Inténtalo de nuevo más tarde.');
  });
});
