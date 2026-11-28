import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { GeocodificacionInversaService } from '../../../src/incidents/services/geocodificacion-inversa.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { crearGeocodificadorInversoFalso } from './geocodificador-inverso.fake.js';
import { crearPrismaIncidenciasFake } from './prisma-incidencias.fake.js';

const idCiudadano = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otroCiudadano = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Listado de incidencias por ciudadano', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const prisma = crearPrismaIncidenciasFake();
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
        {
          provide: GeocodificacionInversaService,
          useValue: crearGeocodificadorInversoFalso(),
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  });

  afterEach(async () => {
    await modulo.close();
    vi.useRealTimers();
  });

  it('filtra por ciudadano normalizado, ordena y devuelve únicamente el resumen', async () => {
    vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
    const antigua = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Farola apagada',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'));
    const reciente = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Banco roto',
      civicId: idCiudadano,
    });
    await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Otra incidencia',
      civicId: otroCiudadano,
    });

    await expect(
      servicio.listarPorCiudadano(idCiudadano.toUpperCase()),
    ).resolves.toEqual(
      [reciente, antigua].map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt,
      })),
    );
  });

  it('devuelve una lista vacía si no hay coincidencias', async () => {
    await expect(servicio.listarPorCiudadano(idCiudadano)).resolves.toEqual([]);
    await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Otra incidencia',
      civicId: otroCiudadano,
    });
    await expect(servicio.listarPorCiudadano(idCiudadano)).resolves.toEqual([]);
  });
});

describe('Listado de todas las incidencias', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;
  let prisma: ReturnType<typeof crearPrismaIncidenciasFake>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    prisma = crearPrismaIncidenciasFake();
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
        {
          provide: GeocodificacionInversaService,
          useValue: crearGeocodificadorInversoFalso(),
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  });

  afterEach(async () => {
    await modulo.close();
    vi.useRealTimers();
  });

  it('devuelve resúmenes de todos los ciudadanos, ordenados del más reciente', async () => {
    vi.setSystemTime(new Date('2026-11-08T08:00:00Z'));
    const antigua = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Farola apagada',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'));
    const reciente = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Banco roto',
      civicId: otroCiudadano,
    });

    await expect(servicio.listarPagina(10)).resolves.toMatchObject({
      items: [reciente, antigua].map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt,
      })),
    });
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({ take: 11 });
  });

  it('devuelve un array vacío si no hay incidencias', async () => {
    await expect(servicio.listarPagina(10)).resolves.toMatchObject({
      items: [],
      nextCursor: null,
    });
  });

  it('devuelve resúmenes aislados que no permiten alterar el almacenamiento', async () => {
    const creada = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Farola apagada',
      civicId: idCiudadano,
    });
    const listado = await servicio.listarPagina(10);
    listado.items[0].title = 'Título modificado';
    listado.items.length = 0;

    expect((await servicio.listarPagina(10)).items).toEqual([
      {
        id: creada.id,
        title: creada.title,
        status: creada.status,
        createdAt: creada.createdAt,
      },
    ]);
  });

  it('pagina con cursor keyset sin repetir registros y considera la primera página la 0', async () => {
    vi.setSystemTime(new Date('2026-11-08T08:00:00Z'));
    const primera = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Primera incidencia',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'));
    const segunda = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Segunda incidencia',
      civicId: otroCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
    const tercera = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Tercera incidencia',
      civicId: idCiudadano,
    });

    const paginaCero = await servicio.listarPagina(2);
    expect(paginaCero.pagina).toBe(0);
    expect(paginaCero.items.map(({ id }) => id)).toEqual([
      tercera.id,
      segunda.id,
    ]);
    expect(paginaCero.nextCursor).toBeTypeOf('string');

    const cursor = JSON.parse(
      Buffer.from(paginaCero.nextCursor!, 'base64url').toString('utf8'),
    ) as {
      id: string;
      createdAt: string;
      pagina: number;
      civicId: string | null;
      filtros: { order: 'newest' | 'oldest' };
    };
    const paginaUno = await servicio.listarPagina(2, cursor);
    expect(paginaUno.pagina).toBe(1);
    expect(paginaUno.items.map(({ id }) => id)).toEqual([primera.id]);
    expect(paginaUno.nextCursor).toBeNull();
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({
      take: 3,
      where: {
        OR: [
          { createdAt: { lt: expect.any(Date) } },
          { createdAt: expect.any(Date), id: { gt: segunda.id } },
        ],
      },
    });
  });

  it('mantiene el filtro por ciudadano al paginar', async () => {
    await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Ciudadano A',
      civicId: idCiudadano,
    });
    await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Ciudadano B',
      civicId: otroCiudadano,
    });
    expect(
      (await servicio.listarPagina(10, undefined, idCiudadano)).items,
    ).toHaveLength(1);
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({
      where: { civicId: idCiudadano },
      take: 11,
    });
  });

  it('aplica estado, prioridad, categoría y fechas en la consulta antes de paginar', async () => {
    const categoria = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    vi.setSystemTime(new Date('2026-11-25T00:00:00.000Z'));
    const primera = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Primera válida',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-25T23:59:59.999Z'));
    const segunda = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Segunda válida',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-26T00:00:00.000Z'));
    await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Fuera de fecha',
      civicId: idCiudadano,
    });
    for (const row of prisma.incidencias.slice(0, 2)) {
      row.status = 'validated';
      row.priority = 'high';
      row.categoryId = categoria;
    }
    const filtros = {
      order: 'newest' as const,
      status: 'validated' as const,
      from: '2026-11-25',
      to: '2026-11-25',
      priority: 'high' as const,
      categoryId: categoria,
    };
    const pagina = await servicio.listarPagina(
      1,
      undefined,
      idCiudadano,
      filtros,
    );
    expect(pagina.items.map(({ id }) => id)).toEqual([segunda.id]);
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({
      where: {
        civicId: idCiudadano,
        status: 'validated',
        priority: 'high',
        categoryId: categoria,
        createdAt: {
          gte: new Date('2026-11-25T00:00:00.000Z'),
          lt: new Date('2026-11-26T00:00:00.000Z'),
        },
      },
      take: 2,
    });
    const cursor = JSON.parse(
      Buffer.from(pagina.nextCursor!, 'base64url').toString('utf8'),
    ) as import('../../../src/incidents/incident.js').CursorIncidencias;
    expect(cursor.filtros).toEqual(filtros);
    const siguiente = await servicio.listarPagina(
      1,
      cursor,
      idCiudadano,
      filtros,
    );
    expect(siguiente.items.map(({ id }) => id)).toEqual([primera.id]);
    await expect(
      servicio.listarPagina(1, cursor, idCiudadano, {
        ...filtros,
        priority: 'low',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cada filtro individual limita el resultado y oldest pagina con desempate por id', async () => {
    vi.setSystemTime(new Date('2026-11-24T12:00:00.000Z'));
    const primera = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Primera',
      civicId: idCiudadano,
    });
    const segunda = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Segunda',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-11-25T12:00:00.000Z'));
    const tercera = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Tercera',
      civicId: idCiudadano,
    });
    const categoria = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    Object.assign(prisma.incidencias[2], {
      status: 'validated',
      priority: 'high',
      categoryId: categoria,
    });
    for (const filtro of [
      { status: 'validated' as const },
      { priority: 'high' as const },
      { categoryId: categoria },
      { from: '2026-11-25' },
      { to: '2026-11-25', from: '2026-11-25' },
    ]) {
      expect(
        (
          await servicio.listarPagina(10, undefined, undefined, {
            order: 'newest',
            ...filtro,
          })
        ).items.map(({ id }) => id),
      ).toEqual([tercera.id]);
    }
    expect(
      (await servicio.listarPagina(10, undefined, undefined, {
        order: 'newest',
        to: '2026-11-24',
      })).items.map(({ id }) => id),
    ).toEqual([primera.id, segunda.id].sort());
    const pagina = await servicio.listarPagina(1, undefined, undefined, {
      order: 'oldest',
    });
    const empatadas = [primera.id, segunda.id].sort();
    expect(pagina.items.map(({ id }) => id)).toEqual([empatadas[0]]);
    const cursor = JSON.parse(
      Buffer.from(pagina.nextCursor!, 'base64url').toString('utf8'),
    ) as import('../../../src/incidents/incident.js').CursorIncidencias;
    const siguiente = await servicio.listarPagina(1, cursor, undefined, {
      order: 'oldest',
    });
    expect(siguiente.items.map(({ id }) => id)).toEqual([empatadas[1]]);
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      where: {
        OR: [
          { createdAt: { gt: expect.any(Date) } },
          { createdAt: expect.any(Date), id: { gt: empatadas[0] } },
        ],
      },
    });
  });

  it('rechaza reutilizar un cursor con otro filtro', async () => {
    await expect(
      servicio.listarPagina(
        10,
        {
          id: idCiudadano,
          createdAt: new Date().toISOString(),
          pagina: 1,
          civicId: idCiudadano,
          filtros: { order: 'newest' },
        },
        otroCiudadano,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('traduce un fallo de PostgreSQL a 503', async () => {
    vi.spyOn(prisma.prisma.incident, 'findMany').mockRejectedValueOnce(
      new Error('base de datos inaccesible'),
    );
    await expect(servicio.listarPagina(10)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
