import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { CambiarPrioridadIncidenciaInput } from './incident.js';
@Injectable()
export class CambiarPrioridadIncidenciaPipe implements PipeTransform<
  unknown,
  Promise<CambiarPrioridadIncidenciaInput>
> {
  async transform(entrada: unknown): Promise<CambiarPrioridadIncidenciaInput> {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada) ||
      Object.keys(entrada).some(
        (campo) => !['priority', 'cause'].includes(campo),
      ) ||
      !('priority' in entrada) ||
      (entrada.priority !== 'low' &&
        entrada.priority !== 'medium' &&
        entrada.priority !== 'high') ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim()
    ) {
      throw new BadRequestException(
        'Se requieren priority Baja (low), Media (medium) o Alta (high) y cause no vacío, sin otros campos',
      );
    }
    return { priority: entrada.priority, cause: entrada.cause.trim() };
  }
}
