import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';
import type { CambiarEstadoIncidenciaInput } from './incident.js';

@Injectable()
export class CambiarEstadoIncidenciaPipe implements PipeTransform<
  unknown,
  Promise<CambiarEstadoIncidenciaInput>
> {
  private readonly validadorUuid = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('civicId debe ser un UUID válido'),
  });

  async transform(entrada: unknown): Promise<CambiarEstadoIncidenciaInput> {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada) ||
      Object.keys(entrada).some(
        (campo) => !['status', 'cause', 'civicId'].includes(campo),
      ) ||
      !('status' in entrada) ||
      (entrada.status !== 'validated' && entrada.status !== 'rejected') ||
      !('cause' in entrada) ||
      typeof entrada.cause !== 'string' ||
      !entrada.cause.trim() ||
      !('civicId' in entrada) ||
      typeof entrada.civicId !== 'string'
    ) {
      throw new BadRequestException(
        'Se requieren status validated o rejected, cause no vacío y civicId UUID, sin otros campos',
      );
    }
    await this.validadorUuid.transform(entrada.civicId, {
      type: 'body',
      data: 'civicId',
    });
    return {
      status: entrada.status,
      cause: entrada.cause.trim(),
      civicId: entrada.civicId.toLowerCase(),
    };
  }
}
