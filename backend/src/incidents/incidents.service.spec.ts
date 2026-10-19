import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { IncidentsService } from './incidents.service.js';
import { UploadStorageService } from './upload-storage.service.js';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidentsService, UploadStorageService],
    }).compile();

    service = module.get(IncidentsService);
  });

  it('creates an isolated reported incident with server-owned fields', async () => {
    const created = await service.create(input, []);

    expect(created).toMatchObject({
      title: input.title,
      description: input.description,
      civicId: input.civicId,
      categoryId: input.categoryId,
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
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    expect(new Date(created.location.createdAt).toISOString()).toBe(
      created.location.createdAt,
    );

    created.location.latitude = 0;
    expect(service.findOne(created.id).location.latitude).toBe(input.latitude);
  });

  it('keeps identical locations as independent incidents', async () => {
    const first = await service.create(input, []);
    const second = await service.create(input, []);

    expect(second.id).not.toBe(first.id);
    expect(second.location).toMatchObject({
      latitude: first.location.latitude,
      longitude: first.location.longitude,
    });
  });

  it('stores an omitted description as null', async () => {
    const { description: _description, ...withoutDescription } = input;

    await expect(service.create(withoutDescription, [])).resolves.toMatchObject({
      description: null,
    });
  });

  it('starts each service instance empty and rejects missing incidents', async () => {
    const freshModule = await Test.createTestingModule({
      providers: [IncidentsService, UploadStorageService],
    }).compile();
    const freshService = freshModule.get(IncidentsService);

    expect(() => freshService.findOne(randomUUID())).toThrow(NotFoundException);
  });

  it('removes a failed upload and does not store a partial incident', async () => {
    const save = vi.fn().mockRejectedValue(new Error('disk unavailable'));
    const remove = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: UploadStorageService, useValue: { save, remove } },
      ],
    }).compile();
    const failingService = module.get(IncidentsService);

    await expect(failingService.create(input, [])).rejects.toThrow(
      'disk unavailable',
    );
    expect(remove).toHaveBeenCalledWith(expect.any(String));
    expect(() => failingService.findOne(randomUUID())).toThrow(NotFoundException);
  });
});
