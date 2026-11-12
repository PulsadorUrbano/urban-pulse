import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
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
      title: 'Farola apagada',
      civicId: idCiudadano,
    });
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'));
    const reciente = await servicio.create({
      title: 'Banco roto',
      civicId: idCiudadano,
    });
    await servicio.create({ title: 'Otra incidencia', civicId: otroCiudadano });

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
    await servicio.create({ title: 'Otra incidencia', civicId: otroCiudadano });
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
          provide: UploadStorageService,
          useValue: { save: vi.fn().mockResolvedValue([]), eliminarImagenes: vi.fn() },
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
    const antigua = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano },
      [],
    );
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'));
    const reciente = await servicio.create(
      { title: 'Banco roto', civicId: otroCiudadano },
      [],
    );

    await expect(servicio.listarPagina(10)).resolves.toMatchObject({ items:
      [reciente, antigua].map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt,
      })),
    });
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({ take: 11 });
  });

  it('devuelve un array vacío si no hay incidencias', async () => {
    await expect(servicio.listarPagina(10)).resolves.toMatchObject({ items: [], nextCursor: null });
  });

  it('devuelve resúmenes aislados que no permiten alterar el almacenamiento', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano },
      [],
    );
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
    const primera = await servicio.create({ title: 'Primera incidencia', civicId: idCiudadano }, []);
    vi.setSystemTime(new Date('2026-11-08T09:00:00Z'));
    const segunda = await servicio.create({ title: 'Segunda incidencia', civicId: otroCiudadano }, []);
    vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
    const tercera = await servicio.create({ title: 'Tercera incidencia', civicId: idCiudadano }, []);

    const paginaCero = await servicio.listarPagina(2);
    expect(paginaCero.pagina).toBe(0);
    expect(paginaCero.items.map(({ id }) => id)).toEqual([tercera.id, segunda.id]);
    expect(paginaCero.nextCursor).toBeTypeOf('string');

    const cursor = JSON.parse(Buffer.from(paginaCero.nextCursor!, 'base64url').toString('utf8')) as {
      id: string; createdAt: string; pagina: number; civicId: string | null;
    };
    const paginaUno = await servicio.listarPagina(2, cursor);
    expect(paginaUno.pagina).toBe(1);
    expect(paginaUno.items.map(({ id }) => id)).toEqual([primera.id]);
    expect(paginaUno.nextCursor).toBeNull();
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({
      take: 3,
      where: { OR: [{ createdAt: { lt: expect.any(Date) } }, { createdAt: expect.any(Date), id: { gt: segunda.id } }] },
    });
  });

  it('mantiene el filtro por ciudadano al paginar', async () => {
    await servicio.create({ title: 'Ciudadano A', civicId: idCiudadano }, []);
    await servicio.create({ title: 'Ciudadano B', civicId: otroCiudadano }, []);
    expect((await servicio.listarPagina(10, undefined, idCiudadano)).items).toHaveLength(1);
    expect(prisma.consultasIncidencias.at(-1)).toMatchObject({ where: { civicId: idCiudadano }, take: 11 });
  });

  it('rechaza reutilizar un cursor con otro filtro', async () => {
    await expect(servicio.listarPagina(10, {
      id: idCiudadano,
      createdAt: new Date().toISOString(),
      pagina: 1,
      civicId: idCiudadano,
    }, otroCiudadano)).rejects.toThrow(BadRequestException);
  });

  it('traduce un fallo de PostgreSQL a 503', async () => {
    vi.spyOn(prisma.prisma.incident, 'findMany').mockRejectedValueOnce(new Error('base de datos inaccesible'));
    await expect(servicio.listarPagina(10)).rejects.toThrow(ServiceUnavailableException);
  });
});
