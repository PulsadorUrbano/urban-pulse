import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { AccesoAsignacionesGuard } from '../../../src/incidents/guards/acceso-asignaciones.guard.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';

describe('AccesoAsignacionesGuard', () => {
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const usuario = { sub: id, role: 'admin' };

  function preparar(rol: string | null, identidad: object | null = usuario) {
    const findUnique = vi.fn().mockResolvedValue(rol ? { role: rol } : null);
    const guard = new AccesoAsignacionesGuard({
      users: { findUnique },
    } as unknown as PrismaService);
    const contexto = {
      switchToHttp: () => ({
        getRequest: () => ({ user: identidad ?? undefined }),
      }),
    } as ExecutionContext;
    return { guard, contexto, findUnique };
  }

  it.each(['admin', 'administrative'])('admite rol actual %s', async (rol) => {
    const { guard, contexto, findUnique } = preparar(rol, {
      sub: id,
      role: 'civic',
    });
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id },
      select: { role: true },
    });
  });

  it('rechaza rol actual insuficiente aunque el token diga admin', async () => {
    const { guard, contexto } = preparar('civic');
    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza usuario eliminado o identidad ausente', async () => {
    const borrado = preparar(null);
    await expect(
      borrado.guard.canActivate(borrado.contexto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const ausente = preparar('admin', null);
    await expect(
      ausente.guard.canActivate(ausente.contexto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
