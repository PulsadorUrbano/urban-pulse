import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Comandos del CLI de Prisma disponibles en DB_SYNC. */
const SYNC_COMMANDS = {
  dbpush: ['db', 'push'],
  deploy: ['migrate', 'deploy'],
} as const;
export type DbSyncMode = keyof typeof SYNC_COMMANDS;

const exec = promisify(execFile);

/** Aplica el esquema de Prisma a la BD al arrancar (según DB_SYNC). */
@Injectable()
export class DbSyncService implements OnModuleInit {
  private readonly logger = new Logger(DbSyncService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mode = this.config.get<DbSyncMode>('DB_SYNC');
    if (mode !== 'dbpush' && mode !== 'deploy') return;

    const cli = join('node_modules', 'prisma', 'build', 'index.js');
    if (!existsSync(cli)) {
      throw new Error(`DB_SYNC=${mode}: no se encontró el CLI de Prisma`);
    }

    const { stdout } = await exec(
      process.execPath,
      [cli, ...SYNC_COMMANDS[mode], '--config', 'prisma7.config.ts'],
      { cwd: process.cwd() },
    );
    this.logger.log(`DB_SYNC=${mode}: ${stdout.trim().split('\n').pop()}`);
  }
}
