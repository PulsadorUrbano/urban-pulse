import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { IncidentsModule } from './../src/incidents/incidents.module.js';

describe('Incidents (e2e)', () => {
  let app: NestExpressApplication<App>;
  const uploadRoot = resolve(process.cwd(), '.test-uploads-incidents');

  const input = () => ({
    title: 'Farola apagada',
    description: 'La farola no ilumina la calle.',
    civicId: randomUUID(),
    categoryName: 'Iluminación',
    latitude: '36.7213',
    longitude: '-4.4214',
    accuracy: '8.5',
  });

  beforeEach(async () => {
    process.env.UPLOADS_DIRECTORY = uploadRoot;
    await rm(uploadRoot, { recursive: true, force: true });
    const module = await Test.createTestingModule({
      imports: [IncidentsModule],
    }).compile();

    app = module.createNestApplication<NestExpressApplication<App>>();
    app.useStaticAssets(uploadRoot, { prefix: '/uploads/' });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(uploadRoot, { recursive: true, force: true });
    delete process.env.UPLOADS_DIRECTORY;
  });

  it('creates, locates, and serves a multipart incident image', async () => {
    const created = await request(app.getHttpServer())
      .post('/incidents')
      .field(input())
      .attach('images', Buffer.from('image data'), {
        filename: 'lamp.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(created.headers.location).toBe(`/incidents/${created.body.id}`);
    expect(created.body).toMatchObject({
      urbanAssetId: null,
      description: input().description,
      civicId: expect.any(String),
      category: { name: 'Iluminación' },
      location: {
        latitude: 36.7213,
        longitude: -4.4214,
        accuracy: 8.5,
        createdAt: expect.any(String),
      },
      images: [
        {
          url: expect.stringMatching(/^\/uploads\/incidents\//),
          mimeType: 'image/png',
        },
      ],
      status: 'reported',
      priority: 'low',
    });
    expect(new Date(created.body.createdAt).toISOString()).toBe(
      created.body.createdAt,
    );
    await request(app.getHttpServer())
      .get(created.headers.location)
      .expect(200, created.body);

    const image = await request(app.getHttpServer())
      .get(created.body.images[0].url)
      .expect('Content-Type', /image\/png/)
      .expect(200);
    expect(image.body).toEqual(Buffer.from('image data'));

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('test').build(),
    );
    expect(document.paths).toHaveProperty('/incidents');
    expect(document.paths).toHaveProperty('/incidents/{id}');
    expect(document.paths['/incidents']?.post?.requestBody).toMatchObject({
      content: {
        'multipart/form-data': {
          schema: {
            required: expect.arrayContaining([
              'title',
              'civicId',
              'categoryName',
              'latitude',
              'longitude',
            ]),
            properties: {
              title: { type: 'string', minLength: 4, maxLength: 50 },
              civicId: { format: 'uuid' },
              categoryName: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              accuracy: { type: 'number' },
              images: {
                type: 'array',
                items: { format: 'binary' },
              },
            },
          },
        },
      },
    });
    expect(document.paths['/incidents']?.post?.responses?.['201']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              category: { type: 'object' },
              location: { type: 'object' },
              images: { type: 'array' },
            },
          },
        },
      },
    });
  });

  it('rejects forged fields and distinguishes invalid from absent ids', async () => {
    await request(app.getHttpServer())
      .post('/incidents')
      .field({ ...input(), id: randomUUID() })
      .expect(400);
    await request(app.getHttpServer()).get('/incidents/not-a-uuid').expect(400);
    await request(app.getHttpServer())
      .get(`/incidents/${randomUUID()}`)
      .expect(404);
  });

  it('creates an incident with no description or images and reuses a category', async () => {
    const { description: _description, ...withoutDescription } = input();
    const first = await request(app.getHttpServer())
      .post('/incidents')
      .field(withoutDescription)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/incidents')
      .field({ ...withoutDescription, categoryName: ' iluminación ' })
      .expect(201);

    expect(first.body).toMatchObject({ description: null, images: [] });
    expect(second.body.category).toEqual(first.body.category);
  });

  it.each([
    ['a sixth image', (requestBuilder: request.Test) => requestBuilder.attach('images', Buffer.from('x'), { filename: '6.png', contentType: 'image/png' })],
    ['an oversized image', (requestBuilder: request.Test) => requestBuilder.attach('images', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' })],
    ['an unsupported image type', (requestBuilder: request.Test) => requestBuilder.attach('images', Buffer.from('x'), { filename: 'file.gif', contentType: 'image/gif' })],
  ])('rejects %s without creating an incident', async (_label, addInvalidFile) => {
    let upload = request(app.getHttpServer()).post('/incidents').field(input());
    if (_label === 'a sixth image') {
      for (let index = 0; index < 5; index += 1) {
        upload = upload.attach('images', Buffer.from('x'), { filename: `${index}.png`, contentType: 'image/png' });
      }
    }
    await addInvalidFile(upload).expect(400);
  });

  it.each([
    ['accuracy', '-1'],
    ['latitude', 'NaN'],
    ['id', randomUUID()],
  ])('rejects invalid multipart field %s', async (field, value) => {
    await request(app.getHttpServer())
      .post('/incidents')
      .field({ ...input(), [field]: value })
      .expect(400);
  });
});
