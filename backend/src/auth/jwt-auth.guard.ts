import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  esTokenPayloadValido,
  type TokenPayloadVerificado,
} from './token-payload.js';

/** Valida el Bearer token y deja sus claims en `request.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayloadVerificado }>();

    delete request.user;
    const partes = request.headers.authorization?.split(' ') ?? [];
    const [scheme, token] = partes;
    if (partes.length !== 2 || scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token Bearer');
    }

    try {
      const payload: unknown = await this.jwt.verifyAsync(token, {
        algorithms: ['HS256'],
      });
      if (!esTokenPayloadValido(payload)) {
        throw new UnauthorizedException('Token inválido o expirado');
      }
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }
}
