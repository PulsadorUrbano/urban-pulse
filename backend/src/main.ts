import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { uploadsRoot } from './incidents/upload-storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useStaticAssets(uploadsRoot(), { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('Urban Pulse Backend API')
    .setDescription('Documentación de la API de Urban Pulse')
    .setVersion('development')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
