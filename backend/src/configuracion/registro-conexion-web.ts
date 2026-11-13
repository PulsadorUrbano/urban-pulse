import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export function registrarPeticion(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const inicio = Date.now();
  response.once('finish', () => {
    const ruta: unknown = request.route?.path;
    if (
      typeof ruta === 'string' &&
      !['/health', '/', '/api-json'].includes(ruta) &&
      !ruta.startsWith('/swagger')
    ) {
      logger.log(
        `${request.method} ${ruta} ${response.statusCode} ${Date.now() - inicio}ms`,
      );
    }
  });
  next();
}
