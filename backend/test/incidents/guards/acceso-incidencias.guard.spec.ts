import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TokenPayloadVerificado } from '../../../src/auth/token-payload.js';
import { profile_role } from '../../../src/generated/prisma/enums.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';
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
  const prisma = { user: { findUnique: vi.fn() } };
  const guard = new AccesoIncidenciasGuard(
    prisma as unknown as PrismaService,
    new Reflector(),
  );

  beforeEach(() => vi.resetAllMocks());

  it('rechaza una petición que no pasó la validación JWT', async () => {
    const { context, request } = contexto(['admin']);
    delete request.user;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.usuarioIncidencias).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza usuarios eliminados', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { context, request } = contexto(['admin']);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.usuarioIncidencias).toBeUndefined();
  });

  it('deniega por defecto sin metadata de roles', async () => {
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      teamMemberships: [],
      id,
      role: 'admin',
      citizen: null,
    });
    await expect(
      guard.canActivate(contexto(undefined).context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(Object.values(profile_role))(
    'usa el rol actual %s de PostgreSQL, no el rol antiguo del JWT',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue({
        isActive: true,
        teamMemberships: [],
        id,
        role,
        citizen: null,
      });
      const { context, request } = contexto(['admin', 'administrative']);
      if (role === 'admin' || role === 'administrative') {
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(request.usuarioIncidencias).toMatchObject({
          id,
          role,
          ciudadanoId: null,
        });
      } else {
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      }
    },
  );

  it('vincula al ciudadano real aunque el token conserve un rol antiguo', async () => {
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      teamMemberships: [],
      id,
      role: 'civic',
      citizen: { user_id: id },
    });
    const { context, request } = contexto(['civic']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.usuarioIncidencias).toMatchObject({
      id,
      role: 'civic',
      ciudadanoId: id,
    });
  });

  it('rechaza un ciudadano sin relación citizens', async () => {
    prisma.user.findUnique.mockResolvedValue({
      isActive: true,
      teamMemberships: [],
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

  it('propaga el fallo de DB sin publicar una identidad', async () => {
    const error = new Error('DB no disponible');
    prisma.user.findUnique.mockRejectedValue(error);
    const { context, request } = contexto(['admin']);
    await expect(guard.canActivate(context)).rejects.toBe(error);
    expect(request.usuarioIncidencias).toBeUndefined();
  });
});

describe('Perfil ciudadano compatible con operario', () => {
  it('permite reportar con perfil ciudadano y rol de técnico', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id,
            role: 'technician',
            isActive: true,
            citizen: { user_id: id },
            departmentMembership: null,
            teamMemberships: [{ teamId: id, isTechnician: true }],
          }),
      },
    };
    const guard = new AccesoIncidenciasGuard(
      prisma as unknown as PrismaService,
      new Reflector(),
    );
    const { context, request } = contexto(['civic']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.usuarioIncidencias).toMatchObject({
      role: 'technician',
      ciudadanoId: id,
      equipoId: id,
    });
  });
  it('rechaza también un token válido si el usuario se desactivó', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id, role: 'admin', isActive: false }),
      },
    };
    const guard = new AccesoIncidenciasGuard(
      prisma as unknown as PrismaService,
      new Reflector(),
    );
    await expect(
      guard.canActivate(contexto(['admin']).context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
