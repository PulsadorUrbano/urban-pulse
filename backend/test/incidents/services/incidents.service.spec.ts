import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { crearPrismaIncidenciasFake } from './prisma-incidencias.fake.js';

describe('IncidentsService', () => {
  const input = {
    title: 'Farola apagada',
    description: 'La farola no ilumina la calle.',
    civicId: randomUUID(),
    categoryId: randomUUID(),
    category: 'Iluminación',
    latitude: 36.7213,
    longitude: -4.4214,
    accuracy: 8.5,
  };

  let service: IncidentsService;
  let prisma: ReturnType<typeof crearPrismaIncidenciasFake>;

  async function crearServicio(fake = crearPrismaIncidenciasFake()) {
    prisma = fake;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
      ],
    }).compile();
    service = module.get(IncidentsService);
    return module;
  }

  it('crea y consulta una incidencia Prisma con images vacío por compatibilidad', async () => {
    const module = await crearServicio();
    const created = await service.create(input);

    expect(created).toMatchObject({
      title: input.title,
      description: input.description,
      civicId: input.civicId.toLowerCase(),
      categoryId: input.categoryId.toLowerCase(),
      category: input.category,
      urbanAssetId: null,
      departmentId: null,
      teamId: null,
      technicianId: null,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
      },
      images: [],
      status: 'reported',
      priority: 'low',
    });
    expect(prisma.imagenes).toHaveLength(0);
    expect(await service.findOne(created.id)).toEqual(created);
    await module.close();
  });

  it('conserva registros confirmados entre instancias con el mismo Prisma', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    const secondService = new IncidentsService(prisma.prisma);

    await expect(secondService.findOne(created.id)).resolves.toEqual(created);
    await module.close();
  });

  it('devuelve 404 cuando la incidencia no existe', async () => {
    const module = await crearServicio();
    await expect(service.findOne(randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await module.close();
  });

  it('no persiste una incidencia si la transacción falla', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCrearIncidencia: new Error('db failure'),
      }),
    );
    await expect(service.create(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('recupera un commit confirmado cuya respuesta se perdió', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
      }),
    );
    const created = await service.create(input);
    expect(await service.findOne(created.id)).toEqual(created);
    await module.close();
  });

  it('devuelve 503 si no puede conciliar el resultado de la transacción', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
        falloLecturaConciliacion: new Error('database unavailable'),
      }),
    );
    await expect(service.create(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await module.close();
  });
});
