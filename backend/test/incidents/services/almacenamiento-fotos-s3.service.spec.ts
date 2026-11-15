import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlmacenamientoFotosS3Service } from '../../../src/incidents/services/almacenamiento-fotos-s3.service.js';

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }));

describe('AlmacenamientoFotosS3Service', () => {
  const send = vi.fn();
  const client = { send } as unknown as S3Client;
  const config = {
    getOrThrow: (clave: string) => {
      if (clave === 'S3_BUCKET') return 'fotos-urban-pulse';
      if (clave === 'S3_REGION') return 'eu-south-2';
      throw new Error(`Variable no configurada: ${clave}`);
    },
  } as ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({});
  });

  it('sube el contenido al bucket privado con la clave y el tipo recibidos', async () => {
    const servicio = new AlmacenamientoFotosS3Service(client, config);
    const contenido = Buffer.from('foto');

    await servicio.subir('incidents/1/2.jpg', contenido, 'image/jpeg');

    expect(send).toHaveBeenCalledOnce();
    const comando = send.mock.calls[0][0] as PutObjectCommand;
    expect(comando).toBeInstanceOf(PutObjectCommand);
    expect(comando.input).toMatchObject({
      Bucket: 'fotos-urban-pulse',
      Key: 'incidents/1/2.jpg',
      Body: contenido,
      ContentType: 'image/jpeg',
    });
  });

  it('borra solo la clave solicitada', async () => {
    const servicio = new AlmacenamientoFotosS3Service(client, config);

    await servicio.borrar('incidents/1/2.jpg');

    const comando = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(comando).toBeInstanceOf(DeleteObjectCommand);
    expect(comando.input).toMatchObject({
      Bucket: 'fotos-urban-pulse',
      Key: 'incidents/1/2.jpg',
    });
  });

  it('firma una URL de lectura con caducidad de quince minutos', async () => {
    vi.mocked(getSignedUrl).mockResolvedValue(
      'https://s3.example/foto-firmada',
    );
    const servicio = new AlmacenamientoFotosS3Service(client, config);

    await expect(servicio.firmarLectura('incidents/1/2.jpg')).resolves.toBe(
      'https://s3.example/foto-firmada',
    );

    const [, comando, opciones] = vi.mocked(getSignedUrl).mock.calls[0];
    expect(comando).toBeInstanceOf(GetObjectCommand);
    expect((comando as GetObjectCommand).input).toMatchObject({
      Bucket: 'fotos-urban-pulse',
      Key: 'incidents/1/2.jpg',
    });
    expect(opciones).toEqual({ expiresIn: 900 });
  });

  it('rechaza configuración vacía antes de llamar a S3', async () => {
    const vacia = { getOrThrow: () => '' } as unknown as ConfigService;
    const servicio = new AlmacenamientoFotosS3Service(client, vacia);

    await expect(
      servicio.subir('incidents/1/2.jpg', Buffer.from('foto'), 'image/jpeg'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('oculta el error original de S3 en la respuesta', async () => {
    send.mockRejectedValueOnce(new Error('secret-key-interna'));
    const servicio = new AlmacenamientoFotosS3Service(client, config);

    const operacion = servicio.subir(
      'incidents/1/2.jpg',
      Buffer.from('foto'),
      'image/jpeg',
    );
    await expect(operacion).rejects.toBeInstanceOf(BadGatewayException);
    await expect(operacion).rejects.not.toThrow('secret-key-interna');
  });
});
