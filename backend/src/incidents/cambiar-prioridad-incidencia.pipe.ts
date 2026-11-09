import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';
import type { CambiarPrioridadIncidenciaInput } from './incident.js';

@Injectable()
export class CambiarPrioridadIncidenciaPipe implements PipeTransform<
  unknown,
  Promise<CambiarPrioridadIncidenciaInput>
> {
  private readonly validadorUuid = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('civicId debe ser un UUID válido'),
  });

  async transform(entrada: unknown): Promise<CambiarPrioridadIncidenciaInput> {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada) ||
      Object.keys(entrada).some(
        (campo) => !['priority', 'cause', 'civicId'].includes(campo),
      ) ||
      !('priority' in entrada) ||
      (entrada.priority !== 'low' &&
        entrada.priority !== 'medium' &&
        entrada.priority !== 'high') ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim() ||
      !('civicId' in entrada) ||
      typeof entrada.civicId !== 'string'
    ) {
      throw new BadRequestException(
        'Se requieren priority (Baja: low, Media: medium o Alta: high), cause no vacío y civicId UUID, sin otros campos',
      );
    }
    await this.validadorUuid.transform(entrada.civicId, {
      type: 'body',
      data: 'civicId',
    });
    return {
      priority: entrada.priority,
      cause: entrada.cause.trim(),
      civicId: entrada.civicId.toLowerCase(),
    };
  }
}
