import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { anunciarArranqueCoordinado } from './configuracion/arranque-coordinado.js';
import { registrarPeticion } from './configuracion/registro-conexion-web.js';

function obtenerPuertoSolicitado(): number {
  const valor = process.env.PORT;
  const puerto = valor === undefined ? 3000 : Number(valor);

  if (
    (valor !== undefined && valor.trim() === '') ||
    !Number.isInteger(puerto) ||
    puerto < 0 ||
    puerto > 65535
  ) {
    throw new Error('PORT debe ser un entero entre 0 y 65535.');
  }

  return puerto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    cors: {
      origin: ['http://localhost:8081', 'http://127.0.0.1:8081'],
    },
  });
  app.use(registrarPeticion);

  const config = new DocumentBuilder()
    .setTitle('Urban Pulse Backend API')
    .setDescription('Documentaci�n de la API de Urban Pulse')
    .setVersion('development')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, documentFactory);

  await app.listen(obtenerPuertoSolicitado(), '0.0.0.0');
  const servidor = app.getHttpServer();
  const direccion = servidor.address();
  const puertoReal = typeof direccion === 'object' && direccion !== null ? direccion.port : undefined;

  if (puertoReal === undefined) {
    throw new Error('No se pudo determinar el puerto real del backend.');
  }

  anunciarArranqueCoordinado(puertoReal);
}
await bootstrap();
