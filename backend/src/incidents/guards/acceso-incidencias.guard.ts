import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TokenPayloadVerificado } from '../../auth/token-payload.js';
import type { profile_role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsuarioIncidencias } from '../types/usuario-incidencias.js';

@Injectable()
export class AccesoIncidenciasGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: TokenPayloadVerificado;
      usuarioIncidencias?: UsuarioIncidencias;
    }>();
    delete request.usuarioIncidencias;

    if (!request.user) {
      throw new UnauthorizedException('Se requiere una identidad verificada');
    }

    const roles = this.reflector.getAllAndOverride<readonly profile_role[]>(
      'rolesIncidencias',
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) {
      throw new ForbiddenException(
        'Esta operación no tiene permisos definidos',
      );
    }

    const usuario = await this.prisma.users.findUnique({
      where: { id: request.user.userId.toLowerCase() },
      select: {
        id: true,
        role: true,
        citizen: { select: { user_id: true } },
        isActive: true,
        departmentMembership: {
          include: { department: { select: { isActive: true } } },
        },
        teamMemberships: {
          where: {
            isActive: true,
            team: { isActive: true, department: { isActive: true } },
          },
          select: { teamId: true, isTechnician: true },
        },
      },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException('El usuario autenticado ya no existe');
    }
    if (
      !(
        roles.includes(usuario.role) ||
        (roles.length === 1 && roles[0] === 'civic' && usuario.citizen)
      ) ||
      (usuario.role === 'civic' && !usuario.citizen)
    ) {
      throw new ForbiddenException(
        'El usuario no tiene permiso para esta operación',
      );
    }

    request.usuarioIncidencias = {
      id: usuario.id.toLowerCase(),
      role: usuario.role,
      departamentoId: usuario.departmentMembership?.department.isActive
        ? usuario.departmentMembership.departmentId
        : null,
      equipoId: usuario.teamMemberships?.[0]?.teamId ?? null,
      esTecnico: usuario.teamMemberships?.[0]?.isTechnician ?? false,
      ciudadanoId: usuario.citizen?.user_id.toLowerCase() ?? null,
    };
    return true;
  }
}
