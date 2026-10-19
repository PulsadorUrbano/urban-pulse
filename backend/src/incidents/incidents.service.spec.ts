import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { IncidentsService } from './incidents.service.js';

describe('IncidentsService', () => {
  const input = {
    title: 'Farola apagada',
    description: 'La farola no ilumina la calle.',
    categoryId: randomUUID(),
    latitude: 36.7213,
    longitude: -4.4214,
  };

  let service: IncidentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidentsService],
    }).compile();

    service = module.get(IncidentsService);
  });

  it('creates an isolated reported incident with server-owned fields', () => {
    const created = service.create(input);

    expect(created).toMatchObject({
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      urbanAssetId: null,
      location: { latitude: input.latitude, longitude: input.longitude },
      status: 'reported',
      priority: 'low',
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);

    created.location.latitude = 0;
    expect(service.findOne(created.id).location.latitude).toBe(input.latitude);
  });

  it('keeps identical locations as independent incidents', () => {
    const first = service.create(input);
    const second = service.create(input);

    expect(second.id).not.toBe(first.id);
    expect(second.location).toEqual(first.location);
  });

  it('starts each service instance empty and rejects missing incidents', async () => {
    const freshModule = await Test.createTestingModule({
      providers: [IncidentsService],
    }).compile();
    const freshService = freshModule.get(IncidentsService);

    expect(() => freshService.findOne(randomUUID())).toThrow(NotFoundException);
  });
});
