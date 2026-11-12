import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { configuracionJwt } from '../../../src/auth/configuracion-jwt.js';
describe('Configuración JWT', () => {
  it.each(['JWT_SECRET', 'JWT_EXPIRES_IN'])(
    'rechaza %s ausente o vacío sin revelar valores',
    (variable) => {
      for (const valor of [undefined, '', '  ']) {
        const valores = {
          JWT_SECRET: 'secreto-exclusivo-de-prueba',
          JWT_EXPIRES_IN: '1h',
          [variable]: valor,
        };
        expect(() => configuracionJwt(new ConfigService(valores))).toThrow(
          variable,
        );
        try {
          configuracionJwt(new ConfigService(valores));
        } catch (error) {
          expect(String(error)).not.toContain('secreto-exclusivo-de-prueba');
        }
      }
    },
  );
  it('firma HS256 con la duración configurada y conserva el secreto exacto', async () => {
    const opciones = configuracionJwt(
      new ConfigService({
        JWT_SECRET: ' secreto-exclusivo-de-prueba ',
        JWT_EXPIRES_IN: '1h',
      }),
    );
    expect(opciones.secret).toBe(' secreto-exclusivo-de-prueba ');
    expect(opciones.signOptions?.algorithm).toBe('HS256');
    const jwt = new JwtService(opciones);
    const token = await jwt.signAsync({ sub: 'persona' });
    const payload = await jwt.verifyAsync<{ iat: number; exp: number }>(token, {
      algorithms: ['HS256'],
    });
    expect(payload.exp - payload.iat).toBe(3600);
  });
  it('una duración no admitida falla en la biblioteca sin token de respaldo', async () => {
    const jwt = new JwtService(
      configuracionJwt(
        new ConfigService({
          JWT_SECRET: 'secreto-exclusivo-de-prueba',
          JWT_EXPIRES_IN: 'duración-inválida',
        }),
      ),
    );
    await expect(jwt.signAsync({ sub: 'persona' })).rejects.toBeInstanceOf(
      Error,
    );
  });
});
