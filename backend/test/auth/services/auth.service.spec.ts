import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../src/auth/auth.service.js';
import type { RegisterCitizenDto } from '../../../src/auth/dto/register-citizen.dto.js';
import type { TokenPayload } from '../../../src/auth/token-payload.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';

const ID_CIUDADANO = '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6';

describe('AuthService', () => {
  let prisma: {
    users: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    citizens: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let jwt: JwtService;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      users: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      citizens: { create: vi.fn() },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    );
    jwt = new JwtService({
      secret: 'secreto-de-prueba',
      signOptions: { expiresIn: '1h' },
    });
    service = new AuthService(prisma as unknown as PrismaService, jwt);
  });

  describe('registrarCiudadano', () => {
    const entrada: RegisterCitizenDto = {
      username: 'nuevo.ciudadano',
      email: 'nuevo@example.com',
      password: 'clave-segura-2026',
      phone: '+34612345678',
    };

    it('crea el usuario civic con contraseña hasheada y su registro de ciudadano', async () => {
      prisma.users.create.mockResolvedValue({
        id: ID_CIUDADANO,
        username: entrada.username,
        email: entrada.email,
        role: 'civic',
        citizen: null,
      });

      const resultado = await service.registrarCiudadano(entrada);

      const datosUsuario = prisma.users.create.mock.calls[0][0].data;
      expect(datosUsuario.role).toBe('civic');
      expect(datosUsuario.password).not.toBe(entrada.password);
      expect(await compare(entrada.password, datosUsuario.password)).toBe(true);
      expect(prisma.citizens.create).toHaveBeenCalledWith({
        data: { user_id: ID_CIUDADANO, phone: '+34612345678' },
      });
      expect(resultado).toEqual({
        userId: ID_CIUDADANO,
        username: entrada.username,
        email: entrada.email,
        role: 'civic',
        phone: '+34612345678',
      });
      expect(resultado).not.toHaveProperty('password');
    });

    it('guarda phone como null cuando no se indica', async () => {
      prisma.users.create.mockResolvedValue({
        id: ID_CIUDADANO,
        username: entrada.username,
        email: entrada.email,
        role: 'civic',
        citizen: null,
      });

      const resultado = await service.registrarCiudadano({
        ...entrada,
        phone: undefined,
      });

      expect(prisma.citizens.create).toHaveBeenCalledWith({
        data: { user_id: ID_CIUDADANO, phone: null },
      });
      expect(resultado.phone).toBeNull();
    });

    it('responde con conflicto cuando la base de datos rechaza un valor único duplicado', async () => {
      prisma.users.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      );

      await expect(service.registrarCiudadano(entrada)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.citizens.create).not.toHaveBeenCalled();
    });

    it('propaga errores que no son de unicidad', async () => {
      prisma.users.create.mockRejectedValue(new Error('conexión perdida'));

      await expect(service.registrarCiudadano(entrada)).rejects.toThrow(
        'conexión perdida',
      );
    });
  });

  describe('login', () => {
    it('devuelve un JWT con las claims del usuario cuando las credenciales son válidas', async () => {
      prisma.users.findFirst.mockResolvedValue({
        id: ID_CIUDADANO,
        username: 'ciudadano',
        role: 'civic',
        password: await hash('clave-correcta', 4),
      });

      const token = await service.login(' ciudadano ', 'clave-correcta');
      const claims = await jwt.verifyAsync<TokenPayload>(token);

      expect(claims).toMatchObject({
        sub: ID_CIUDADANO,
        userId: ID_CIUDADANO,
        username: 'ciudadano',
        role: 'civic',
      });
    });

    it('busca por email en minúsculas cuando el identificador contiene una arroba', async () => {
      prisma.users.findFirst.mockResolvedValue(null);

      await service.login('Ciudadano@Example.com', 'x').catch(() => undefined);

      expect(prisma.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { username: 'Ciudadano@Example.com' },
              { email: 'ciudadano@example.com' },
            ],
          },
        }),
      );
    });

    it('rechaza una contraseña incorrecta con el mensaje genérico', async () => {
      prisma.users.findFirst.mockResolvedValue({
        id: ID_CIUDADANO,
        username: 'ciudadano',
        role: 'civic',
        password: await hash('clave-correcta', 4),
      });

      await expect(service.login('ciudadano', 'otra')).rejects.toThrow(
        new UnauthorizedException('Usuario o contraseña incorrectos'),
      );
    });

    it('rechaza un usuario inexistente con el mismo mensaje genérico', async () => {
      prisma.users.findFirst.mockResolvedValue(null);

      await expect(service.login('nadie', 'clave')).rejects.toThrow(
        new UnauthorizedException('Usuario o contraseña incorrectos'),
      );
    });
  });

  describe('obtenerUsuarioActual', () => {
    const payload: TokenPayload = {
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      username: 'ciudadano',
      role: 'civic',
    };

    it('devuelve los datos actuales del usuario, incluido el teléfono', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: ID_CIUDADANO,
        username: 'ciudadano',
        email: 'ciudadano@example.com',
        role: 'civic',
        citizen: { phone: '+34612345678' },
      });

      await expect(service.obtenerUsuarioActual(payload)).resolves.toEqual({
        userId: ID_CIUDADANO,
        username: 'ciudadano',
        email: 'ciudadano@example.com',
        role: 'civic',
        phone: '+34612345678',
      });
    });

    it('responde 401 cuando el usuario del token ya no existe', async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      await expect(service.obtenerUsuarioActual(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
