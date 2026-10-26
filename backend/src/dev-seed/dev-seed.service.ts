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

/** Id fijo del ciudadano de desarrollo. */
export const DEV_CITIZEN_ID = '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6';
/** Credenciales del ciudadano de desarrollo (solo NODE_ENV=development). */
export const DEV_CITIZEN_USERNAME = 'ciudadano';
export const DEV_CITIZEN_PASSWORD = 'ciudadano';

/** Garantiza usuarios de prueba (admin y ciudadano) al arrancar en modo development.
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

    try {
      await this.sembrarAdmin();
      await this.sembrarCiudadano();
    } catch (error) {
      this.logger.warn(
        `No se pudieron crear los usuarios de desarrollo: ${String(error)}`,
      );
    }
  }

  private async sembrarAdmin(): Promise<void> {
    const password = await hash(DEV_ADMIN_PASSWORD, 10);

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
  }

  private async sembrarCiudadano(): Promise<void> {
    const password = await hash(DEV_CITIZEN_PASSWORD, 10);

    await this.prisma.users.upsert({
      where: { id: DEV_CITIZEN_ID },
      update: { role: profile_role.civic, password },
      create: {
        id: DEV_CITIZEN_ID,
        username: DEV_CITIZEN_USERNAME,
        email: 'ciudadano@urbanpulse.dev',
        password,
        role: profile_role.civic,
        citizen: { create: { phone: null } },
      },
    });
    this.logger.log(
      `Ciudadano de desarrollo disponible (${DEV_CITIZEN_ID} / ${DEV_CITIZEN_USERNAME})`,
    );
  }
}
