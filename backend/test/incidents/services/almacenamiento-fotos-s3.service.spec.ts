import { generateKeyPairSync } from 'node:crypto';
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
    get: () => undefined,
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

  it('firma una URL privada de CloudFront durante quince minutos', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const datos: Record<string, string> = {
      CLOUDFRONT_DOMAIN: 'd111111abcdef8.cloudfront.net',
      CLOUDFRONT_KEY_PAIR_ID: 'KTEST',
      CLOUDFRONT_PRIVATE_KEY_BASE64: Buffer.from(pem).toString('base64'),
    };
    const configuracion = {
      get: (clave: string) => datos[clave],
      getOrThrow: (clave: string) => config.getOrThrow(clave),
    } as unknown as ConfigService;
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    try {
      const servicio = new AlmacenamientoFotosS3Service(client, configuracion);
      const url = new URL(
        await servicio.firmarLectura('incidents/1/foto uno.jpg'),
      );
      expect(url.origin).toBe('https://d111111abcdef8.cloudfront.net');
      expect(url.pathname).toBe('/incidents/1/foto%20uno.jpg');
      expect(url.searchParams.get('Key-Pair-Id')).toBe('KTEST');
      expect(url.searchParams.get('Expires')).toBe('1794744900');
      expect(url.searchParams.get('Signature')).toBeTruthy();
      expect(getSignedUrl).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rechaza CloudFront incompleto sin volver a una URL directa de S3', async () => {
    const configuracion = {
      get: (clave: string) =>
        clave === 'CLOUDFRONT_DOMAIN'
          ? 'd111111abcdef8.cloudfront.net'
          : undefined,
      getOrThrow: (clave: string) => config.getOrThrow(clave),
    } as unknown as ConfigService;
    const servicio = new AlmacenamientoFotosS3Service(client, configuracion);
    await expect(
      servicio.firmarLectura('incidents/1/2.jpg'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(getSignedUrl).not.toHaveBeenCalled();
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
