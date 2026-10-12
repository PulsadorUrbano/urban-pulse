import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { profile_role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Id fijo del administrador de desarrollo (el del ejemplo de Swagger). */
export const DEV_ADMIN_ID = '3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c';
/** Credenciales del administrador de desarrollo (password hasheado con bcrypt). */
export const DEV_ADMIN_USERNAME = 'admin';
export const DEV_ADMIN_PASSWORD = 'admin';

/** Garantiza un usuario administrador de prueba al arrancar en modo development.
 *  Por defecto (sin NODE_ENV) la app se considera producción y no se ejecuta. */
@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get('NODE_ENV') !== 'development') return;

    const password = await hash(DEV_ADMIN_PASSWORD, 10);

    try {
      await this.prisma.users.upsert({
        where: { id: DEV_ADMIN_ID },
        update: { role: profile_role.admin, password },
        create: {
          id: DEV_ADMIN_ID,
          username: DEV_ADMIN_USERNAME,
          email: 'admin@urbanpulse.dev',
          password,
          role: profile_role.admin,
        },
      });
      this.logger.log(
        `Admin de desarrollo disponible (${DEV_ADMIN_ID} / ${DEV_ADMIN_USERNAME})`,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo crear el admin de desarrollo: ${String(error)}`,
      );
    }
  }
}
