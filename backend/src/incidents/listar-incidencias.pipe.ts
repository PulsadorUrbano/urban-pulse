import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';
import type { CursorIncidencias } from './incident.js';

export interface ConsultaListadoIncidencias {
  civicId?: string;
  limit: number;
  cursor?: CursorIncidencias;
}

@Injectable()
export class ListarIncidenciasPipe implements PipeTransform<
  unknown,
  Promise<ConsultaListadoIncidencias>
> {
  private readonly validadorUuid = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('civicId debe ser un UUID válido'),
  });

  async transform(consulta: unknown): Promise<ConsultaListadoIncidencias> {
    if (
      typeof consulta !== 'object' ||
      consulta === null ||
      Array.isArray(consulta) ||
      Object.keys(consulta).some(
        (campo) => !['civicId', 'limit', 'cursor'].includes(campo),
      )
    ) {
      throw new BadRequestException(
        'La consulta contiene parámetros no permitidos',
      );
    }

    let civicId: string | undefined;
    if ('civicId' in consulta) {
      if (typeof consulta.civicId !== 'string') {
        throw new BadRequestException('civicId debe ser un UUID válido');
      }
      await this.validadorUuid.transform(consulta.civicId, {
        type: 'query', data: 'civicId',
      });
      civicId = consulta.civicId.toLowerCase();
    }

    const limit = 'limit' in consulta ? this.validarLimit(consulta.limit) : 10;
    const cursor = 'cursor' in consulta ? this.validarCursor(consulta.cursor) : undefined;
    return { civicId, limit, cursor };
  }

  private validarLimit(valor: unknown): number {
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    const limit = Number(valor);
    if (limit > 100) throw new BadRequestException('limit no puede superar 100');
    return limit;
  }

  private validarCursor(valor: unknown): CursorIncidencias {
    if (typeof valor !== 'string' || valor.length > 512) {
      throw new BadRequestException('cursor no es válido');
    }
    try {
      const contenido: unknown = JSON.parse(Buffer.from(valor, 'base64url').toString('utf8'));
      if (
        typeof contenido !== 'object' || contenido === null ||
        !('id' in contenido) || typeof contenido.id !== 'string' ||
        !('createdAt' in contenido) || typeof contenido.createdAt !== 'string' ||
        !('pagina' in contenido) || typeof contenido.pagina !== 'number' ||
        !Number.isSafeInteger(contenido.pagina) || contenido.pagina < 1 ||
        !('civicId' in contenido) ||
        (contenido.civicId !== null && typeof contenido.civicId !== 'string') ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contenido.id) ||
        (typeof contenido.civicId === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contenido.civicId)) ||
        !Number.isFinite(Date.parse(contenido.createdAt))
      ) throw new Error('Invalid cursor');
      return {
        id: contenido.id.toLowerCase(),
        createdAt: new Date(contenido.createdAt).toISOString(),
        pagina: contenido.pagina,
        civicId: typeof contenido.civicId === 'string' ? contenido.civicId.toLowerCase() : null,
      };
    } catch {
      throw new BadRequestException('cursor no es válido');
    }
  }
}
