import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { profile_role } from '../../generated/prisma/enums.js';
import type { TokenPayloadVerificado } from '../../auth/token-payload.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsuarioIncidencias } from '../types/usuario-incidencias.js';

@Injectable()
export class AccesoIncidenciasGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        user?: TokenPayloadVerificado;
        usuarioIncidencias?: UsuarioIncidencias;
      }>();
    delete request.usuarioIncidencias;
    if (!request.user)
      throw new UnauthorizedException('Se requiere una identidad verificada');
    const roles = this.reflector.getAllAndOverride<readonly profile_role[]>(
      'rolesIncidencias',
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length)
      throw new ForbiddenException(
        'Esta operación no tiene permisos definidos',
      );
    const usuario = await this.prisma.users.findUnique({
      where: { id: request.user.userId.toLowerCase() },
      select: { id: true, role: true, citizen: { select: { user_id: true } } },
    });
    if (!usuario)
      throw new UnauthorizedException('El usuario autenticado ya no existe');
    if (
      !roles.includes(usuario.role) ||
      (usuario.role === 'civic' && !usuario.citizen)
    ) {
      throw new ForbiddenException(
        'El usuario no tiene permiso para esta operación',
      );
    }
    request.usuarioIncidencias = {
      id: usuario.id.toLowerCase(),
      role: usuario.role,
      ciudadanoId: usuario.citizen?.user_id.toLowerCase() ?? null,
    };
    return true;
  }
}
