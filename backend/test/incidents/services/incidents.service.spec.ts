import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  const operador = {
    id: randomUUID(),
    role: 'admin',
    ciudadanoId: null,
  } as const;
  const propietario = {
    id: input.civicId,
    role: 'civic',
    ciudadanoId: input.civicId,
  } as const;

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
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
      },
      images: [],
      status: 'reported',
      priority: 'low',
    });
    expect(await service.findOne(created.id, propietario)).toEqual(created);
    await module.close();
  });

  it('conserva registros confirmados entre instancias con el mismo Prisma', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    const secondService = new IncidentsService(prisma.prisma);

    await expect(secondService.findOne(created.id, operador)).resolves.toEqual(
      created,
    );
    await module.close();
  });

  it('devuelve 404 cuando la incidencia no existe', async () => {
    const module = await crearServicio();
    await expect(
      service.findOne(randomUUID(), operador),
    ).rejects.toBeInstanceOf(NotFoundException);
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
    expect(await service.findOne(created.id, operador)).toEqual(created);
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

  it('oculta con 404 una incidencia ajena al ciudadano autenticado', async () => {
    const module = await crearServicio();
    const created = await service.create(input);
    await expect(
      service.findOne(created.id, {
        id: randomUUID(),
        role: 'civic',
        ciudadanoId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await module.close();
  });

  it('rechaza un ciudadano autenticado sin vínculo ciudadano', async () => {
    const module = await crearServicio();
    await expect(
      service.findOne(randomUUID(), {
        id: randomUUID(),
        role: 'civic',
        ciudadanoId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await module.close();
  });
});
