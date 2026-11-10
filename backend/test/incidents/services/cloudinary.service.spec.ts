import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudinaryService } from '../../../src/incidents/cloudinary.service.js';

const credenciales = {
  CLOUDINARY_CLOUD_NAME: 'nube-pruebas',
  CLOUDINARY_API_KEY: 'clave-pruebas',
  CLOUDINARY_API_SECRET: 'secreto-ficticio',
};

function crearServicio(
  valores: Record<string, string | undefined> = credenciales,
): CloudinaryService {
  const config = new ConfigService(valores);
  return new CloudinaryService(config);
}

describe('CloudinaryService', () => {
  const fetchOriginal = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_735_689_600_000);
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    vi.restoreAllMocks();
  });

  it('sube bytes con parámetros firmados, HTTPS y valida public_id y secure_url', async () => {
    let solicitud: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = vi.fn(async (input, init) => {
      solicitud = { url: String(input), init };
      return Response.json({
        public_id: 'urban-pulse/incidents/i1/img1',
        secure_url: 'https://res.cloudinary.com/nube/image/upload/img1.jpg',
      });
    });
    const archivo = { buffer: Buffer.from('imagen de prueba'), mimetype: 'image/png' } as const;

    const resultado = await crearServicio().subirImagen(
      'urban-pulse/incidents/i1/img1',
      archivo,
    );

    expect(resultado).toEqual({
      cloudinaryId: 'urban-pulse/incidents/i1/img1',
      url: 'https://res.cloudinary.com/nube/image/upload/img1.jpg',
    });
    expect(solicitud?.url).toBe(
      'https://api.cloudinary.com/v1_1/nube-pruebas/image/upload',
    );
    const formulario = solicitud?.init?.body as FormData;
    expect(formulario.get('public_id')).toBe('urban-pulse/incidents/i1/img1');
    expect(formulario.get('overwrite')).toBe('false');
    expect(formulario.get('timestamp')).toBe('1735689600');
    expect(formulario.get('api_key')).toBe('clave-pruebas');
    expect(formulario.get('signature')).toBe(
      '1937434b01c78538efb420cda0b8c0edc4eb8d00dbc533ed75499b11ca51bf5e',
    );
    const blob = formulario.get('file');
    expect(blob).toBeInstanceOf(Blob);
    expect(Buffer.from(await (blob as Blob).arrayBuffer())).toEqual(archivo.buffer);
    expect(solicitud?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rechaza respuesta inválida o con URL insegura', async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        public_id: 'otro-id',
        secure_url: 'http://res.cloudinary.com/nube/img.jpg',
      }),
    );

    await expect(
      crearServicio().subirImagen('id-solicitado', {
        buffer: Buffer.from('x'),
        mimetype: 'image/jpeg',
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it.each([400, 500])('traduce HTTP %i a 502 sin propagar el payload', async (status) => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({ error: { message: 'detalle privado' } }, { status }),
    );

    await expect(
      crearServicio().eliminarImagen('id'),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('traduce JSON inválido a 502', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{', { status: 200 }));

    await expect(crearServicio().eliminarImagen('id')).rejects.toMatchObject({
      status: 502,
    });
  });

  it('traduce timeout a 504', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });

    await expect(crearServicio().eliminarImagen('id')).rejects.toMatchObject({
      status: 504,
    });
  });

  it('valida la configuración al invocarse y devuelve 503 si falta', async () => {
    globalThis.fetch = vi.fn();

    await expect(
      crearServicio({ ...credenciales, CLOUDINARY_API_SECRET: undefined }).eliminarImagen('id'),
    ).rejects.toMatchObject({ status: 503 });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('considera el resultado not found como borrado satisfecho', async () => {
    let solicitud: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = vi.fn(async (input, init) => {
      solicitud = { url: String(input), init };
      return Response.json({ result: 'not found' });
    });

    await expect(crearServicio().eliminarImagen('id')).resolves.toBeUndefined();
    expect(solicitud?.url).toBe(
      'https://api.cloudinary.com/v1_1/nube-pruebas/image/destroy',
    );
    const formulario = solicitud?.init?.body as FormData;
    expect(formulario.get('public_id')).toBe('id');
    expect(formulario.get('timestamp')).toBe('1735689600');
    expect(formulario.get('api_key')).toBe('clave-pruebas');
    expect(formulario.get('signature')).toBe(
      'bb3e227ca78951265a4c59c62c478f8d7c03e709d4cfce83d1fb2cf2e872995f',
    );
  });

  it('considera HTTP 404 del borrado como limpieza satisfecha', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 404 }));

    await expect(crearServicio().eliminarImagen('id')).resolves.toBeUndefined();
  });
});
