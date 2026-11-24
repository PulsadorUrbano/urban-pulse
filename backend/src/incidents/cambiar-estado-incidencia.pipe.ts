import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { CambiarEstadoIncidenciaInput } from './incident.js';

const estadosPermitidos: readonly string[] = [
  'validated',
  'rejected',
  'in_progress',
  'resolved',
  'reopened',
  'closed',
];

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
      typeof entrada.status !== 'string' ||
      !estadosPermitidos.includes(entrada.status) ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        `Se requiere status con uno de estos valores: ${estadosPermitidos.join(', ')}. cause debe ser no vacío y el cuerpo no admite otros campos.`,
      );
    }
    return {
      status: entrada.status as CambiarEstadoIncidenciaInput['status'],
      cause: entrada.cause.trim(),
    };
  }
}
