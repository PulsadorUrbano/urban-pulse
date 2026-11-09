import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
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
        {
          provide: UploadStorageService,
          useValue: {
            save: vi.fn().mockResolvedValue([]),
            eliminarImagenes: vi.fn(),
          },
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
    await servicio.create(
      { title: 'Otra incidencia', civicId: otroCiudadano },
      [],
    );
    await expect(servicio.listarPorCiudadano(idCiudadano)).resolves.toEqual([]);
  });
});
