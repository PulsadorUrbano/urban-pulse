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

  it('starts without DATABASE_URL, serves health, and registers incidents', async () => {
    const input = {
      title: 'Farola apagada',
      description: 'La farola no ilumina la calle.',
      categoryId: randomUUID(),
      latitude: 36.7213,
      longitude: -4.4214,
    };

    await request(app!.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });

    const created = await request(app!.getHttpServer())
      .post('/incidents')
      .send(input)
      .expect(201);
    await request(app!.getHttpServer())
      .get(`/incidents/${created.body.id}`)
      .expect(200, created.body);
  });

  afterEach(async () => {
    await app?.close();
  });
});
