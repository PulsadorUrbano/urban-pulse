import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TokenPayload } from '../../auth/token-payload.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AccesoAsignacionesGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();
    const id = request.user?.sub;
    if (!id) throw new UnauthorizedException('Falta identidad vigente');
    let user;
    try {
      user = await this.prisma.users.findUnique({
        where: { id },
        select: { role: true },
      });
    } catch {
      throw new ServiceUnavailableException(
        'La autorización no está disponible',
      );
    }
    if (!user) throw new UnauthorizedException('El usuario ya no existe');
    if (user.role !== 'admin' && user.role !== 'administrative') {
      throw new ForbiddenException('No tiene permiso para asignar incidencias');
    }
    return true;
  }
}
