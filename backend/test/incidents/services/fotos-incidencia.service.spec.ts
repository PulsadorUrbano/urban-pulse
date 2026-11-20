import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FotosIncidenciaService } from '../../../src/incidents/services/fotos-incidencia.service.js';
import type { AlmacenamientoFotosS3Service } from '../../../src/incidents/services/almacenamiento-fotos-s3.service.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';

const id = randomUUID();
const ciudadanoId = randomUUID();
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const foto = {
  contenido: jpeg,
  mimeType: 'image/jpeg',
  extension: 'jpg',
} as const;

function preparar(
  opciones: {
    propietario?: boolean;
    falloGuardar?: boolean;
    limiteEnTransaccion?: number;
    falloSubir?: boolean;
    perderRespuestaCommit?: boolean;
    loteConfirmadoConcurrentemente?: string;
  } = {},
) {
  const filas: Array<{
    id: string;
    incidentId: string;
    objectKey: string;
    mimeType: string;
    idempotencyKey: string | null;
    createdAt: Date;
  }> = [];
  const incidencia =
    opciones.propietario === false
      ? { id, civicId: randomUUID() }
      : { id, civicId: ciudadanoId };
  let enTransaccion = false;
  const findUnique = vi.fn().mockResolvedValue(incidencia);
  const count = vi
    .fn()
    .mockImplementation(() =>
      enTransaccion
        ? (opciones.limiteEnTransaccion ?? filas.length)
        : filas.length,
    );
  const createMany = vi
    .fn()
    .mockImplementation(({ data }: { data: typeof filas }) => {
      if (opciones.falloGuardar) throw new Error('fallo SQL');
      filas.push(...data);
      return { count: data.length };
    });
  const findMany = vi.fn().mockImplementation(() => [...filas]);
  const findFirst = vi
    .fn()
    .mockImplementation(
      ({
        where,
      }: {
        where: { incidentId: string; idempotencyKey: string };
      }) => {
        if (
          enTransaccion &&
          where.idempotencyKey === opciones.loteConfirmadoConcurrentemente
        ) {
          const confirmada = {
            id: randomUUID(),
            incidentId: where.incidentId,
            objectKey: 'incidents/confirmada.jpg',
            mimeType: foto.mimeType,
            idempotencyKey: where.idempotencyKey,
            createdAt: new Date(),
          };
          filas.push(confirmada);
          return confirmada;
        }
        return (
          filas.find(
            (fila) =>
              fila.incidentId === where.incidentId &&
              fila.idempotencyKey === where.idempotencyKey,
          ) ?? null
        );
      },
    );
  const queryRaw = vi.fn().mockResolvedValue([{ id }]);
  const prisma = {
    incident: { findUnique },
    incidentImage: { count, createMany, findFirst, findMany },
    $queryRaw: queryRaw,
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      enTransaccion = true;
      try {
        const resultado = await callback(prisma);
        if (opciones.perderRespuestaCommit)
          throw new Error('Respuesta de commit perdida');
        return resultado;
      } finally {
        enTransaccion = false;
      }
    },
  } as unknown as PrismaService;
  const subir = vi.fn().mockResolvedValue(undefined);
  if (opciones.falloSubir) subir.mockRejectedValueOnce(new Error('fallo S3'));
  const borrar = vi.fn().mockResolvedValue(undefined);
  const firmarLectura = vi.fn().mockResolvedValue('https://s3.example/foto');
  const s3 = {
    subir,
    borrar,
    firmarLectura,
  } as unknown as AlmacenamientoFotosS3Service;
  return {
    servicio: new FotosIncidenciaService(prisma, s3),
    filas,
    subir,
    borrar,
    firmarLectura,
    queryRaw,
  };
}

describe('FotosIncidenciaService', () => {
  it('sube una foto propia y devuelve su URL temporal sin exponer la clave', async () => {
    const { servicio, filas, subir, queryRaw } = preparar();

    const resultado = await servicio.subir(id, ciudadanoId, [foto]);

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(subir).toHaveBeenCalledOnce();
    expect(filas).toHaveLength(1);
    expect(filas[0].objectKey).toMatch(
      new RegExp(`^incidents/${id}/[0-9a-f-]+\\.jpg$`),
    );
    expect(resultado).toEqual([
      {
        id: filas[0].id,
        url: 'https://s3.example/foto',
        mimeType: 'image/jpeg',
        createdAt: filas[0].createdAt.toISOString(),
      },
    ]);
  });

  it('devuelve la galería al repetir una tanda aunque ya se haya alcanzado el límite', async () => {
    const { servicio, subir, filas, firmarLectura } = preparar();
    const clave = randomUUID();
    const tanda = Array.from({ length: 8 }, () => foto);
    const primera = await servicio.subir(id, ciudadanoId, tanda, clave);
    firmarLectura.mockResolvedValue('https://s3.example/nueva-firma');

    const reintento = await servicio.subir(id, ciudadanoId, tanda, clave);

    expect(reintento.map((imagen) => imagen.id)).toEqual(
      primera.map((imagen) => imagen.id),
    );
    expect(
      reintento.every(
        (imagen) => imagen.url === 'https://s3.example/nueva-firma',
      ),
    ).toBe(true);
    expect(subir).toHaveBeenCalledTimes(8);
    expect(filas).toHaveLength(8);
    await expect(
      servicio.subir(id, ciudadanoId, [foto], randomUUID()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('descarta sus objetos provisionales si otra petición confirma la misma tanda', async () => {
    const clave = randomUUID();
    const { servicio, subir, borrar, filas } = preparar({
      loteConfirmadoConcurrentemente: clave,
      limiteEnTransaccion: 8,
    });

    const resultado = await servicio.subir(id, ciudadanoId, [foto], clave);

    expect(subir).toHaveBeenCalledOnce();
    expect(borrar).toHaveBeenCalledWith(subir.mock.calls[0][0]);
    expect(filas).toHaveLength(1);
    expect(resultado.map((imagen) => imagen.id)).toEqual([filas[0].id]);
  });

  it('no sube fotos a una incidencia ajena', async () => {
    const { servicio, subir } = preparar({ propietario: false });
    await expect(
      servicio.subir(id, ciudadanoId, [foto]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(subir).not.toHaveBeenCalled();
  });

  it('revalida el límite bajo bloqueo y limpia lo subido si otra solicitud llenó la incidencia', async () => {
    const { servicio, borrar, filas } = preparar({ limiteEnTransaccion: 8 });
    await expect(
      servicio.subir(id, ciudadanoId, [foto]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(borrar).toHaveBeenCalledOnce();
    expect(filas).toHaveLength(0);
  });

  it('limpia la foto si PostgreSQL rechaza la inserción', async () => {
    const { servicio, borrar, filas } = preparar({ falloGuardar: true });
    await expect(
      servicio.subir(id, ciudadanoId, [foto]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(borrar).toHaveBeenCalledOnce();
    expect(filas).toHaveLength(0);
  });

  it('intenta borrar el objeto de una subida cuyo resultado es incierto', async () => {
    const { servicio, borrar, filas } = preparar({ falloSubir: true });
    await expect(servicio.subir(id, ciudadanoId, [foto])).rejects.toThrow(
      'fallo S3',
    );
    expect(borrar).toHaveBeenCalledOnce();
    expect(filas).toHaveLength(0);
  });

  it('conserva los objetos si la escritura se confirmó pero se perdió la respuesta SQL', async () => {
    const { servicio, borrar, filas } = preparar({
      perderRespuestaCommit: true,
    });
    const resultado = await servicio.subir(id, ciudadanoId, [foto]);
    expect(resultado).toHaveLength(1);
    expect(filas).toHaveLength(1);
    expect(borrar).not.toHaveBeenCalled();
  });
});
