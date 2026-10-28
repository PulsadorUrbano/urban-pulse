import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEV_ADMIN_ID,
  DEV_CITIZEN_ID,
  DEV_CITIZEN_PASSWORD,
  DevSeedService,
} from '../../../src/dev-seed/dev-seed.service.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';

describe('DevSeedService', () => {
  let prisma: { users: { upsert: ReturnType<typeof vi.fn> } };
  let config: { get: ReturnType<typeof vi.fn> };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    prisma = { users: { upsert: vi.fn().mockResolvedValue({}) } };
    config = { get: vi.fn() };
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function crearServicio(): DevSeedService {
    return new DevSeedService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  }

  it('no crea usuarios fuera de NODE_ENV=development', async () => {
    config.get.mockReturnValue('production');

    await crearServicio().onModuleInit();

    expect(prisma.users.upsert).not.toHaveBeenCalled();
  });

  it('crea el admin y un ciudadano civic con contraseña hasheada en development', async () => {
    config.get.mockReturnValue('development');

    await crearServicio().onModuleInit();

    expect(prisma.users.upsert).toHaveBeenCalledTimes(2);
    const [admin, ciudadano] = prisma.users.upsert.mock.calls.map((call) => call[0]);
    expect(admin.where).toEqual({ id: DEV_ADMIN_ID });
    expect(admin.create.role).toBe('admin');
    expect(ciudadano.where).toEqual({ id: DEV_CITIZEN_ID });
    expect(ciudadano.create).toMatchObject({
      username: 'ciudadano',
      role: 'civic',
      citizen: { create: { phone: null } },
    });
    expect(ciudadano.create.password).not.toBe(DEV_CITIZEN_PASSWORD);
    expect(await compare(DEV_CITIZEN_PASSWORD, ciudadano.create.password)).toBe(true);
  });

  it('registra un aviso y no lanza error si la base de datos falla', async () => {
    config.get.mockReturnValue('development');
    prisma.users.upsert.mockRejectedValue(new Error('sin conexión'));

    await expect(crearServicio().onModuleInit()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
