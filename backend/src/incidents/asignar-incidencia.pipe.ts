import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';
import type { CambioAsignacionIncidencia } from './incident.js';

const campos = ['departmentId', 'teamId', 'technicianId'] as const;

@Injectable()
export class AsignarIncidenciaPipe implements PipeTransform<
  unknown,
  Promise<CambioAsignacionIncidencia>
> {
  private readonly validadorUuid = new ParseUUIDPipe();

  async transform(entrada: unknown): Promise<CambioAsignacionIncidencia> {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada)
    ) {
      throw new BadRequestException('Se requiere un objeto de asignación');
    }
    const claves = Object.keys(entrada);
    if (
      claves.length === 0 ||
      claves.some((clave) => !campos.includes(clave as (typeof campos)[number]))
    ) {
      throw new BadRequestException(
        'Se requiere al menos un campo de asignación, sin campos desconocidos',
      );
    }
    const cambio: CambioAsignacionIncidencia = {};
    for (const campo of campos) {
      if (!(campo in entrada)) continue;
      const valor = (entrada as Record<string, unknown>)[campo];
      if (valor !== null && typeof valor !== 'string') {
        throw new BadRequestException(`${campo} debe ser un UUID o null`);
      }
      if (valor !== null) {
        await this.validadorUuid.transform(valor, {
          type: 'body',
          data: campo,
        });
      }
      cambio[campo] = valor?.toLowerCase() ?? null;
    }
    return cambio;
  }
}
