import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { profile_role } from '../../../src/generated/prisma/enums.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';
import type { TokenPayloadVerificado } from '../../../src/auth/token-payload.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const claims: TokenPayloadVerificado = {
  sub: id,
  userId: id,
  username: 'persona',
  role: 'admin',
  iat: 1000,
  exp: 4600,
};
function contexto(
  roles: readonly profile_role[] | undefined,
  user: TokenPayloadVerificado | undefined = claims,
) {
  const handler = () => undefined;
  if (roles) Reflect.defineMetadata('rolesIncidencias', roles, handler);
  const request: {
    user?: TokenPayloadVerificado;
    usuarioIncidencias?: UsuarioIncidencias;
  } = { user };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Object,
  } as unknown as ExecutionContext;
  return { context, request };
}
describe('Acceso a incidencias con identidad actual', () => {
  const prisma = { users: { findUnique: vi.fn() } };
  const guard = new AccesoIncidenciasGuard(
    prisma as unknown as PrismaService,
    new Reflector(),
  );
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it('rechaza una petición que no pasó la validación JWT', async () => {
    const { context, request } = contexto(['admin']);
    delete request.user;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.usuarioIncidencias).toBeUndefined();
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });
  it('rechaza usuarios eliminados', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const { context, request } = contexto(['admin']);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.usuarioIncidencias).toBeUndefined();
  });
  it('deniega por defecto sin metadata de roles', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id,
      role: 'admin',
      citizen: null,
    });
    await expect(
      guard.canActivate(contexto(undefined).context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(Object.values(profile_role))(
    'permiso de operador con rol actual %s, no el del JWT',
    async (role) => {
      prisma.users.findUnique.mockResolvedValue({ id, role, citizen: null });
      const { context, request } = contexto(['admin', 'administrative']);
      if (role === 'admin' || role === 'administrative') {
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(request.usuarioIncidencias).toEqual({
          id,
          role,
          ciudadanoId: null,
        });
      } else {
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(request.usuarioIncidencias).toBeUndefined();
      }
    },
  );
  it('vincula al ciudadano real incluso si el token conserva un rol antiguo', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id,
      role: 'civic',
      citizen: { user_id: id },
    });
    const { context, request } = contexto(['civic']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.usuarioIncidencias).toEqual({
      id,
      role: 'civic',
      ciudadanoId: id,
    });
    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { id },
      select: { id: true, role: true, citizen: { select: { user_id: true } } },
    });
  });
  it('rechaza un ciudadano sin relación citizens', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id,
      role: 'civic',
      citizen: null,
    });
    const { context, request } = contexto(['civic']);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request.usuarioIncidencias).toBeUndefined();
  });
  it('propaga el fallo DB sin publicar identidad ni recurrir al JWT antiguo', async () => {
    const error = new Error('DB no disponible');
    prisma.users.findUnique.mockRejectedValue(error);
    const { context, request } = contexto(['admin']);
    await expect(guard.canActivate(context)).rejects.toBe(error);
    expect(request.usuarioIncidencias).toBeUndefined();
  });
});
