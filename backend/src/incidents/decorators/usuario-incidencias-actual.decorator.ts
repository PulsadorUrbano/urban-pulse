import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { UsuarioIncidencias } from '../types/usuario-incidencias.js';
export const UsuarioIncidenciasActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioIncidencias => {
    const usuario = context
      .switchToHttp()
      .getRequest<{
        usuarioIncidencias?: UsuarioIncidencias;
      }>().usuarioIncidencias;
    if (!usuario)
      throw new UnauthorizedException(
        'Se requiere una identidad actual autorizada',
      );
    return usuario;
  },
);
