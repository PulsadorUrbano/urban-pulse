import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudinaryService } from '../../src/cloudinary/cloudinary.service.js';

const imagen = 'data:image/png;base64,aG9sYQ==';
const crearServicio = () =>
  new CloudinaryService(
    new ConfigService({
      CLOUDINARY_CLOUD_NAME: 'prueba',
      CLOUDINARY_API_KEY: 'clave',
      CLOUDINARY_API_SECRET: 'secreto',
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('Subida de imágenes a Cloudinary', () => {
  it('rechaza entradas y archivos demasiado grandes antes de llamar a la red', async () => {
    const red = vi.fn();
    vi.stubGlobal('fetch', red);
    for (const entrada of [
      undefined,
      'https://example.com/a.png',
      'data:image/svg+xml;base64,aG9sYQ==',
      'data:image/png;base64,',
      `data:image/png;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}`,
    ]) {
      await expect(crearServicio().subirImagen(entrada)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(red).not.toHaveBeenCalled();
  });

  it('informa de las credenciales ausentes sin intentar subir', async () => {
    await expect(
      new CloudinaryService(new ConfigService()).subirImagen(imagen),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('envía una subida firmada y devuelve solo el identificador y la URL', async () => {
    const red = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            public_id: 'foto',
            secure_url: 'https://res.cloudinary.com/prueba/foto.png',
          }),
        ),
      );
    vi.stubGlobal('fetch', red);
    await expect(crearServicio().subirImagen(imagen)).resolves.toEqual({
      publicId: 'foto',
      url: 'https://res.cloudinary.com/prueba/foto.png',
    });
    const peticion = red.mock.calls[0]?.[1] as { body: FormData };
    expect(peticion.body.get('signature')).toMatch(/^[a-f0-9]{64}$/);
    expect(peticion.body.has('api_secret')).toBe(false);
  });

  it('oculta los detalles de errores del proveedor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('credencial privada')),
    );
    await expect(crearServicio().subirImagen(imagen)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
