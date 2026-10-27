import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import type { TokenPayload } from '../../../src/auth/token-payload.js';

const ID_CIUDADANO = '8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6';

function contextoCon(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: TokenPayload };
} {
  const request: { headers: Record<string, string>; user?: TokenPayload } = {
    headers,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({
    secret: 'secreto-de-prueba',
    signOptions: { expiresIn: '1h' },
  });
  const guard = new JwtAuthGuard(jwt);

  it('rechaza una petición sin cabecera Authorization', async () => {
    const { context } = contextoCon({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un esquema distinto de Bearer', async () => {
    const { context } = contextoCon({ authorization: 'Basic abc' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token con firma no válida con 401', async () => {
    const { context } = contextoCon({
      authorization: 'Bearer token.no.valido',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token expirado con 401', async () => {
    const expirado = await jwt.signAsync(
      {
        sub: ID_CIUDADANO,
        userId: ID_CIUDADANO,
        username: 'ciudadano',
        role: 'civic',
      },
      { expiresIn: -10 },
    );
    const { context } = contextoCon({ authorization: `Bearer ${expirado}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deja las claims del token válido en request.user', async () => {
    const token = await jwt.signAsync({
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      username: 'ciudadano',
      role: 'civic',
    });
    const { context, request } = contextoCon({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      role: 'civic',
    });
  });

  it.each(['exp', 'sub', 'userId', 'username', 'role'] as const)(
    'rechaza JWT firmado sin %s',
    async (campo) => {
      const emisor = new JwtService({ secret: 'secreto-de-prueba' });
      const claims: Record<string, unknown> = {
        sub: ID_CIUDADANO,
        userId: ID_CIUDADANO,
        username: 'persona',
        role: 'civic',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      delete claims[campo];
      const token = await emisor.signAsync(claims);
      const { context, request } = contextoCon({
        authorization: 'Bearer ' + token,
      });
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(request.user).toBeUndefined();
    },
  );
  it.each([
    { userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { role: 'inventado' },
    { username: '   ' },
    { userId: 'no-es-uuid' },
  ])('rechaza identidad inválida con firma correcta %#', async (cambio) => {
    const token = await jwt.signAsync({
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      username: 'persona',
      role: 'civic',
      ...cambio,
    });
    const { context, request } = contextoCon({
      authorization: 'Bearer ' + token,
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
  it('rechaza algoritmos distintos de HS256', async () => {
    const token = await jwt.signAsync(
      {
        sub: ID_CIUDADANO,
        userId: ID_CIUDADANO,
        username: 'persona',
        role: 'civic',
      },
      { algorithm: 'HS384' },
    );
    const { context, request } = contextoCon({
      authorization: 'Bearer ' + token,
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
  it.each([
    '',
    'Bearer',
    'Bearer ',
    'Basic TOKEN',
    'Bearer TOKEN extra',
    'Bearer TOKEN ',
  ])('rechaza cabecera ambigua %s', async (plantilla) => {
    const token = await jwt.signAsync({
      sub: ID_CIUDADANO,
      userId: ID_CIUDADANO,
      username: 'persona',
      role: 'civic',
    });
    const { context, request } = contextoCon({
      authorization: plantilla.replace('TOKEN', token),
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
});
