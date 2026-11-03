import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';

/** Configuración obligatoria; no incorpora secretos ni valores de respaldo. */
export function configuracionJwt(config: ConfigService): JwtModuleOptions {
  const secreto = config.get<unknown>('JWT_SECRET');
  const duracion = config.get<unknown>('JWT_EXPIRES_IN');
  if (typeof secreto !== 'string' || !secreto.trim()) {
    throw new Error('JWT_SECRET debe ser una cadena no vacía');
  }
  if (typeof duracion !== 'string' || !duracion.trim()) {
    throw new Error('JWT_EXPIRES_IN debe ser una cadena no vacía');
  }
  return {
    secret: secreto,
    signOptions: {
      algorithm: 'HS256',
      // La biblioteca valida la sintaxis de la duración al firmar.
      expiresIn: duracion.trim() as JwtSignOptions['expiresIn'],
    },
  };
}
