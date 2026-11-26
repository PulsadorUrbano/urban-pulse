import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';
import { IncidentPriority, IncidentStatus } from '../generated/prisma/enums.js';
import type {
  CursorIncidencias,
  FiltrosListadoIncidencias,
} from './incident.js';

export interface ConsultaListadoIncidencias extends FiltrosListadoIncidencias {
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
  private readonly validadorCategoria = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('categoryId debe ser un UUID válido'),
  });

  async transform(consulta: unknown): Promise<ConsultaListadoIncidencias> {
    if (
      typeof consulta !== 'object' ||
      consulta === null ||
      Array.isArray(consulta) ||
      Object.keys(consulta).some(
        (campo) =>
          ![
            'civicId',
            'limit',
            'cursor',
            'status',
            'from',
            'to',
            'order',
            'priority',
            'categoryId',
          ].includes(campo),
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
        type: 'query',
        data: 'civicId',
      });
      civicId = consulta.civicId.toLowerCase();
    }

    const limit = 'limit' in consulta ? this.validarLimit(consulta.limit) : 10;
    const cursor =
      'cursor' in consulta
        ? await this.validarCursor(consulta.cursor)
        : undefined;
    const filtros = await this.validarFiltros(
      consulta as Record<string, unknown>,
    );
    if (
      cursor &&
      (cursor.civicId !== (civicId ?? null) ||
        JSON.stringify(cursor.filtros) !== JSON.stringify(filtros))
    ) {
      throw new BadRequestException('Los filtros no coinciden con el cursor');
    }
    return { civicId, limit, cursor, ...filtros };
  }

  private async validarFiltros(
    consulta: Record<string, unknown>,
  ): Promise<FiltrosListadoIncidencias> {
    const permitidos = [
      'status',
      'from',
      'to',
      'order',
      'priority',
      'categoryId',
    ];
    if (
      Object.keys(consulta).some(
        (campo) =>
          !permitidos.includes(campo) &&
          !['civicId', 'limit', 'cursor'].includes(campo),
      )
    ) {
      throw new BadRequestException(
        'La consulta contiene parámetros no permitidos',
      );
    }
    const filtros: FiltrosListadoIncidencias = { order: 'newest' };
    if ('status' in consulta) {
      if (
        typeof consulta.status !== 'string' ||
        !Object.values(IncidentStatus).includes(
          consulta.status as IncidentStatus,
        )
      )
        throw new BadRequestException('status no es válido');
      filtros.status = consulta.status as IncidentStatus;
    }
    if ('from' in consulta)
      filtros.from = this.validarFecha(consulta.from, 'from');
    if ('to' in consulta) filtros.to = this.validarFecha(consulta.to, 'to');
    if (filtros.from && filtros.to && filtros.from > filtros.to)
      throw new BadRequestException('from no puede ser posterior a to');
    if ('order' in consulta) {
      if (consulta.order !== 'newest' && consulta.order !== 'oldest')
        throw new BadRequestException('order no es válido');
      filtros.order = consulta.order;
    }
    if ('priority' in consulta) {
      if (
        typeof consulta.priority !== 'string' ||
        !Object.values(IncidentPriority).includes(
          consulta.priority as IncidentPriority,
        )
      )
        throw new BadRequestException('priority no es válida');
      filtros.priority = consulta.priority as IncidentPriority;
    }
    if ('categoryId' in consulta) {
      if (typeof consulta.categoryId !== 'string')
        throw new BadRequestException('categoryId debe ser un UUID válido');
      await this.validadorCategoria.transform(consulta.categoryId, {
        type: 'query',
        data: 'categoryId',
      });
      filtros.categoryId = consulta.categoryId.toLowerCase();
    }
    return filtros;
  }

  private validarFecha(valor: unknown, campo: 'from' | 'to'): string {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
      throw new BadRequestException(
        `${campo} debe ser una fecha AAAA-MM-DD válida`,
      );
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    if (
      !Number.isFinite(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== valor
    )
      throw new BadRequestException(
        `${campo} debe ser una fecha AAAA-MM-DD válida`,
      );
    return valor;
  }

  private validarLimit(valor: unknown): number {
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    const limit = Number(valor);
    if (limit > 100)
      throw new BadRequestException('limit no puede superar 100');
    return limit;
  }

  private async validarCursor(valor: unknown): Promise<CursorIncidencias> {
    if (typeof valor !== 'string' || valor.length > 512) {
      throw new BadRequestException('cursor no es válido');
    }
    try {
      const contenido: unknown = JSON.parse(
        Buffer.from(valor, 'base64url').toString('utf8'),
      );
      if (
        typeof contenido !== 'object' ||
        contenido === null ||
        !('id' in contenido) ||
        typeof contenido.id !== 'string' ||
        !('createdAt' in contenido) ||
        typeof contenido.createdAt !== 'string' ||
        !('pagina' in contenido) ||
        typeof contenido.pagina !== 'number' ||
        !Number.isSafeInteger(contenido.pagina) ||
        contenido.pagina < 1 ||
        !('civicId' in contenido) ||
        (contenido.civicId !== null && typeof contenido.civicId !== 'string') ||
        !('filtros' in contenido) ||
        typeof contenido.filtros !== 'object' ||
        contenido.filtros === null ||
        Array.isArray(contenido.filtros) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          contenido.id,
        ) ||
        (typeof contenido.civicId === 'string' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            contenido.civicId,
          )) ||
        !Number.isFinite(Date.parse(contenido.createdAt))
      )
        throw new Error('Invalid cursor');
      const filtros = contenido.filtros as Record<string, unknown>;
      if (
        Object.keys(filtros).some(
          (campo) =>
            ![
              'status',
              'from',
              'to',
              'order',
              'priority',
              'categoryId',
            ].includes(campo),
        )
      ) {
        throw new Error('Invalid cursor');
      }
      return {
        id: contenido.id.toLowerCase(),
        createdAt: new Date(contenido.createdAt).toISOString(),
        pagina: contenido.pagina,
        civicId:
          typeof contenido.civicId === 'string'
            ? contenido.civicId.toLowerCase()
            : null,
        filtros: await this.validarFiltros(filtros),
      };
    } catch {
      throw new BadRequestException('cursor no es válido');
    }
  }
}
