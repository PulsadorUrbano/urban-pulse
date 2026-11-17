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
      ![
        'validated',
        'rejected',
        'in_progress',
        'resolved',
        'reopened',
        'closed',
      ].includes(String(entrada.status)) ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'Se requieren status validated o rejected y cause no vacío, sin otros campos',
      );
    }
    return {
      status: entrada.status as CambiarEstadoIncidenciaInput['status'],
      cause: entrada.cause.trim(),
    };
  }
}
