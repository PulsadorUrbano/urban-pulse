import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Comandos del CLI de Prisma disponibles en DB_SYNC. */
const SYNC_COMMANDS = { dbpush: 'db push', deploy: 'migrate deploy' } as const;
export type DbSyncMode = keyof typeof SYNC_COMMANDS;

const exec = promisify(execFile);

/** Aplica el esquema de Prisma a la BD al arrancar (según DB_SYNC). */
@Injectable()
export class DbSyncService implements OnModuleInit {
  private readonly logger = new Logger(DbSyncService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mode = this.config.get<string>('DB_SYNC') as DbSyncMode | undefined;
    if (!mode || !(mode in SYNC_COMMANDS)) return;

    const cli = join('node_modules', 'prisma', 'build', 'index.js');
    if (!existsSync(cli)) {
      this.logger.warn(`DB_SYNC=${mode}: no se encontró el CLI de Prisma`);
      return;
    }

    try {
      const { stdout } = await exec(
        process.execPath,
        [cli, ...SYNC_COMMANDS[mode].split(' ')],
        { cwd: process.cwd() },
      );
      this.logger.log(`DB_SYNC=${mode}: ${stdout.trim().split('\n').pop()}`);
    } catch (error) {
      this.logger.error(`DB_SYNC=${mode} falló: ${String(error)}`);
    }
  }
}
