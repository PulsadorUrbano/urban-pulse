import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
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
  const imagen = {
    id: randomUUID(),
    cloudinaryId: 'urban-pulse/incidents/example/image',
    url: 'https://res.cloudinary.com/demo/image/upload/image.png',
    mimeType: 'image/png' as const,
    createdAt: '2026-10-21T08:00:00.000Z',
  };

  let service: IncidentsService;
  let prisma: ReturnType<typeof crearPrismaIncidenciasFake>;
  let eliminarImagenes: ReturnType<typeof vi.fn>;
  let storage: {
    save: ReturnType<typeof vi.fn>;
    eliminarImagenes: typeof eliminarImagenes;
  };

  async function crearServicio(
    fake = crearPrismaIncidenciasFake(),
    guardar = vi.fn().mockResolvedValue([imagen]),
  ) {
    prisma = fake;
    eliminarImagenes = vi.fn().mockResolvedValue([]);
    storage = { save: guardar, eliminarImagenes };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
        { provide: UploadStorageService, useValue: storage },
      ],
    }).compile();
    service = module.get(IncidentsService);
    return module;
  }

  it('creates and reads a persisted incident without exposing internal image metadata', async () => {
    const module = await crearServicio();
    const created = await service.create(input, []);

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
      images: [
        {
          id: imagen.id,
          url: imagen.url,
          mimeType: imagen.mimeType,
          createdAt: imagen.createdAt,
        },
      ],
      status: 'reported',
      priority: 'low',
    });
    expect(created.images[0]).not.toHaveProperty('cloudinaryId');
    expect(created.location).not.toHaveProperty('incidentId');
    expect(await service.findOne(created.id)).toEqual(created);
    await module.close();
  });

  it('retains committed records across service instances sharing the same Prisma store', async () => {
    const module = await crearServicio();
    const created = await service.create(input, []);
    const secondService = new IncidentsService(
      prisma.prisma,
      storage as unknown as UploadStorageService,
    );

    await expect(secondService.findOne(created.id)).resolves.toEqual(created);
    await module.close();
  });

  it('returns 404 when a requested incident does not exist', async () => {
    const module = await crearServicio();
    await expect(service.findOne(randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await module.close();
  });

  it('compensates uploaded images after confirmed database rollback', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCrearIncidencia: new Error('db failure'),
      }),
    );
    await expect(service.create(input, [])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(eliminarImagenes).toHaveBeenCalledWith([imagen.cloudinaryId]);
    expect(prisma.incidencias).toHaveLength(0);
    await module.close();
  });

  it('recovers a commit whose acknowledgement was lost without deleting referenced images', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
      }),
    );
    const created = await service.create(input, []);
    expect(await service.findOne(created.id)).toEqual(created);
    expect(eliminarImagenes).not.toHaveBeenCalled();
    await module.close();
  });

  it('preserves images when the commit outcome cannot be reconciled', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake({
        falloCommitDespuesDeGuardar: new Error('lost acknowledgement'),
        falloLecturaConciliacion: new Error('database unavailable'),
      }),
    );
    await expect(service.create(input, [])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(eliminarImagenes).not.toHaveBeenCalled();
    await module.close();
  });

  it('does not persist an incident when image upload fails', async () => {
    const module = await crearServicio(
      crearPrismaIncidenciasFake(),
      vi.fn().mockRejectedValue(new Error('Cloudinary failed')),
    );
    await expect(service.create(input, [])).rejects.toThrow(
      'Cloudinary failed',
    );
    expect(prisma.incidencias).toHaveLength(0);
    expect(eliminarImagenes).not.toHaveBeenCalled();
    await module.close();
  });
});
