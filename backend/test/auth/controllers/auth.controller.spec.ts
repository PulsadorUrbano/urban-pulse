import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../../src/auth/auth.controller.js';
import type { AuthService } from '../../../src/auth/auth.service.js';
import type { TokenPayload } from '../../../src/auth/token-payload.js';

const ID_CIUDADANO = '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6';

describe('AuthController', () => {
  let auth: {
    registrarCiudadano: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    obtenerUsuarioActual: ReturnType<typeof vi.fn>;
  };
  let controller: AuthController;

  beforeEach(() => {
    auth = {
      registrarCiudadano: vi.fn(),
      login: vi.fn(),
      obtenerUsuarioActual: vi.fn(),
    };
    controller = new AuthController(auth as unknown as AuthService);
  });

  it('register delega en el servicio y devuelve el usuario público', async () => {
    const usuario = {
      userId: ID_CIUDADANO,
      username: 'ciudadano',
      email: 'ciudadano@example.com',
      role: 'civic',
      phone: null,
    };
    auth.registrarCiudadano.mockResolvedValue(usuario);
    const entrada = {
      username: 'ciudadano',
      email: 'ciudadano@example.com',
      password: 'clave-segura-2026',
      phone: null,
    };

    await expect(controller.register(entrada)).resolves.toEqual(usuario);
    expect(auth.registrarCiudadano).toHaveBeenCalledWith(entrada);
  });

  it('login devuelve solo accessToken', async () => {
    auth.login.mockResolvedValue('jwt-firmado');

    await expect(
      controller.login({ usernameOrEmail: 'ciudadano', password: 'clave' }),
    ).resolves.toEqual({ accessToken: 'jwt-firmado' });
    expect(auth.login).toHaveBeenCalledWith('ciudadano', 'clave');
  });

  it('me consulta al servicio con las claims del token', async () => {
    const claims: TokenPayload = {
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      username: 'ciudadano',
      role: 'civic',
    };
    auth.obtenerUsuarioActual.mockResolvedValue({ userId: ID_CIUDADANO });

    await expect(controller.me(claims)).resolves.toEqual({ userId: ID_CIUDADANO });
    expect(auth.obtenerUsuarioActual).toHaveBeenCalledWith(claims);
  });
});
