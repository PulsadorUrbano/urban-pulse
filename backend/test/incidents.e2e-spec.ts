import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { IncidentsModule } from './../src/incidents/incidents.module.js';

describe('Incidents (e2e)', () => {
  let app: INestApplication<App>;

  const input = () => ({
    title: 'Farola apagada',
    description: 'La farola no ilumina la calle.',
    categoryId: randomUUID(),
    latitude: 36.7213,
    longitude: -4.4214,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [IncidentsModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates, locates, and documents an incident resource', async () => {
    const created = await request(app.getHttpServer())
      .post('/incidents')
      .send(input())
      .expect(201);

    expect(created.headers.location).toBe(`/incidents/${created.body.id}`);
    expect(created.body).toMatchObject({
      urbanAssetId: null,
      status: 'reported',
      priority: 'low',
    });
    expect(new Date(created.body.createdAt).toISOString()).toBe(
      created.body.createdAt,
    );
    await request(app.getHttpServer())
      .get(created.headers.location)
      .expect(200, created.body);

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );
    expect(document.paths).toHaveProperty('/incidents');
    expect(document.paths).toHaveProperty('/incidents/{id}');
  });

  it('rejects forged fields and distinguishes invalid from absent ids', async () => {
    await request(app.getHttpServer())
      .post('/incidents')
      .send({ ...input(), id: randomUUID() })
      .expect(400);
    await request(app.getHttpServer()).get('/incidents/not-a-uuid').expect(400);
    await request(app.getHttpServer())
      .get(`/incidents/${randomUUID()}`)
      .expect(404);
  });
});
