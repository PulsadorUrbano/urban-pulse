import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';

const idCiudadano = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otroCiudadano = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Listado de incidencias por ciudadano', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: UploadStorageService,
          useValue: { save: vi.fn().mockResolvedValue([]), remove: vi.fn() },
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  });

  afterEach(async () => {
    await modulo.close();
    vi.useRealTimers();
  });

  it('filtra por ciudadano, ordena del más reciente y devuelve solo el resumen', async () => {
    vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
    const antigua = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano },
      [],
    );
    vi.setSystemTime(new Date('2026-10-23T09:00:00Z'));
    const reciente = await servicio.create(
      { title: 'Banco roto', civicId: idCiudadano },
      [],
    );
    await servicio.create(
      { title: 'Otra incidencia', civicId: otroCiudadano },
      [],
    );

    expect(servicio.listarPorCiudadano(idCiudadano)).toEqual(
      [reciente, antigua].map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt,
      })),
    );
  });

  it('devuelve una lista vacía si no hay coincidencias, aunque existan otras incidencias', async () => {
    expect(servicio.listarPorCiudadano(idCiudadano)).toEqual([]);
    await servicio.create(
      { title: 'Otra incidencia', civicId: otroCiudadano },
      [],
    );
    expect(servicio.listarPorCiudadano(idCiudadano)).toEqual([]);
  });

  it('compara UUID sin distinguir mayúsculas al registrar o consultar', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano.toUpperCase() },
      [],
    );
    expect(
      servicio.listarPorCiudadano(idCiudadano).map(({ id }) => id),
    ).toEqual([creada.id]);
    expect(
      servicio
        .listarPorCiudadano(idCiudadano.toUpperCase())
        .map(({ id }) => id),
    ).toEqual([creada.id]);
  });

  it('desempata por identificador cuando las fechas son iguales', async () => {
    vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
    const primera = await servicio.create(
      { title: 'Primera incidencia', civicId: idCiudadano },
      [],
    );
    const segunda = await servicio.create(
      { title: 'Segunda incidencia', civicId: idCiudadano },
      [],
    );
    expect(
      servicio.listarPorCiudadano(idCiudadano).map(({ id }) => id),
    ).toEqual([primera.id, segunda.id].sort());
  });

  it('aísla las respuestas y no comparte registros entre instancias del servicio', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano },
      [],
    );
    const listado = servicio.listarPorCiudadano(idCiudadano);
    listado[0].title = 'Título modificado';
    listado.length = 0;
    expect(servicio.listarPorCiudadano(idCiudadano)[0].title).toBe(
      creada.title,
    );
    expect(servicio.findOne(creada.id).title).toBe(creada.title);
    const nuevaInstancia = new IncidentsService(
      modulo.get(UploadStorageService),
    );
    expect(nuevaInstancia.listarPorCiudadano(idCiudadano)).toEqual([]);
  });
});

describe('Listado de todas las incidencias', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: UploadStorageService,
          useValue: { save: vi.fn().mockResolvedValue([]), remove: vi.fn() },
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

    expect(servicio.listarTodas()).toEqual(
      [reciente, antigua].map(({ id, title, status, createdAt }) => ({
        id,
        title,
        status,
        createdAt,
      })),
    );
  });

  it('devuelve un array vacío si no hay incidencias', () => {
    expect(servicio.listarTodas()).toEqual([]);
  });

  it('devuelve resúmenes aislados que no permiten alterar el almacenamiento', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: idCiudadano },
      [],
    );
    const listado = servicio.listarTodas();
    listado[0].title = 'Título modificado';
    listado.length = 0;

    expect(servicio.listarTodas()).toEqual([
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

    const paginaCero = servicio.listarPagina(2);
    expect(paginaCero.pagina).toBe(0);
    expect(paginaCero.items.map(({ id }) => id)).toEqual([tercera.id, segunda.id]);
    expect(paginaCero.nextCursor).toBeTypeOf('string');

    const cursor = JSON.parse(Buffer.from(paginaCero.nextCursor!, 'base64url').toString('utf8')) as {
      id: string; createdAt: string; pagina: number; civicId: string | null;
    };
    const paginaUno = servicio.listarPagina(2, cursor);
    expect(paginaUno.pagina).toBe(1);
    expect(paginaUno.items.map(({ id }) => id)).toEqual([primera.id]);
    expect(paginaUno.nextCursor).toBeNull();
  });

  it('mantiene el filtro por ciudadano al paginar', async () => {
    await servicio.create({ title: 'Ciudadano A', civicId: idCiudadano }, []);
    await servicio.create({ title: 'Ciudadano B', civicId: otroCiudadano }, []);
    expect(servicio.listarPagina(10, undefined, idCiudadano).items).toHaveLength(1);
  });
});
