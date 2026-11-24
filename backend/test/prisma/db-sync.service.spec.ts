import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DbSyncService } from '../../src/prisma/db-sync.service.js';

const ejecutar = vi.hoisted(() => vi.fn());
const existeCli = vi.hoisted(() => vi.fn());
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: existeCli,
}));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFile(
    archivo: string,
    args: string[],
    opciones: { cwd: string },
    listo: (error: Error | null, salida?: { stdout: string }) => void,
  ) {
    ejecutar(archivo, args, opciones);
    listo(null, { stdout: 'Migraciones aplicadas' });
  },
}));

describe('DbSyncService', () => {
  beforeEach(() => {
    ejecutar.mockReset();
    existeCli.mockReset().mockReturnValue(true);
  });

  it('ejecuta migrate deploy con la configuración de Prisma 7 del proyecto', async () => {
    await new DbSyncService(new ConfigService({ DB_SYNC: 'deploy' })).onModuleInit();

    expect(ejecutar).toHaveBeenCalledWith(
      process.execPath,
      [join('node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy', '--config', 'prisma7.config.ts'],
      { cwd: process.cwd() },
    );
  });

  it('impide arrancar si se solicitaron migraciones y el CLI no está disponible', async () => {
    existeCli.mockReturnValue(false);
    const servicio = new DbSyncService(new ConfigService({ DB_SYNC: 'deploy' }));

    await expect(servicio.onModuleInit()).rejects.toThrow('no se encontró el CLI de Prisma');
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('propaga los fallos de migración y evita arrancar con un esquema incompleto', async () => {
    ejecutar.mockImplementationOnce(() => { throw new Error('Migración fallida'); });
    const servicio = new DbSyncService(new ConfigService({ DB_SYNC: 'deploy' }));

    await expect(servicio.onModuleInit()).rejects.toThrow('Migración fallida');
  });
});
