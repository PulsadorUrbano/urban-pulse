import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { CambiarEstadoIncidenciaInput } from './incident.js';
@Injectable()
export class CambiarEstadoIncidenciaPipe implements PipeTransform<
  unknown,
  Promise<CambiarEstadoIncidenciaInput>
> {
  async transform(entrada: unknown): Promise<CambiarEstadoIncidenciaInput> {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada) ||
      Object.keys(entrada).some(
        (campo) => !['status', 'cause'].includes(campo),
      ) ||
      !('status' in entrada) ||
      (entrada.status !== 'validated' && entrada.status !== 'rejected') ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'Se requieren status validated o rejected y cause no vacío, sin otros campos',
      );
    }
    return { status: entrada.status, cause: entrada.cause.trim() };
  }
}
