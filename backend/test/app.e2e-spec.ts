import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: (key: string) => {
          throw new Error(`Unexpected configuration lookup: ${key}`);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('serves the category catalog with stable ids and Swagger documentation', async () => {
    const response = await request(app!.getHttpServer())
      .get('/categories')
      .expect(200);
    expect(
      response.body.map((category: { name: string }) => category.name),
    ).toEqual([
      'Iluminación',
      'Limpieza',
      'Vía pública',
      'Movilidad',
      'Zonas verdes',
    ]);
    for (const category of response.body) {
      expect(category.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(new Date(category.createdAt).toISOString()).toBe(
        category.createdAt,
      );
    }
    await request(app!.getHttpServer())
      .get('/categories')
      .expect(200, response.body);
    const document = SwaggerModule.createDocument(
      app!,
      new DocumentBuilder().setTitle('test').build(),
    );
    expect(
      document.paths['/categories']?.get?.responses?.['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              required: ['id', 'name', 'createdAt'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    });
  });

  it('starts without DATABASE_URL, serves health, and registers incidents', async () => {
    const input = {
      title: 'Farola apagada',
      description: 'La farola no ilumina la calle.',
      civicId: randomUUID(),
      categoryId: randomUUID(),
      category: 'Iluminación',
      latitude: '36.7213',
      longitude: '-4.4214',
    };

    await request(app!.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });

    const created = await request(app!.getHttpServer())
      .post('/incidents')
      .field(input)
      .expect(201);
    await request(app!.getHttpServer())
      .get(`/incidents/${created.body.id}`)
      .expect(200, created.body);
  });

  afterEach(async () => {
    await app?.close();
  });
});
