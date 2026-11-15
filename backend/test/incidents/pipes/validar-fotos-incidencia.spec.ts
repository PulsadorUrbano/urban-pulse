import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validarFotosIncidencia } from '../../../src/incidents/validar-fotos-incidencia.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFF0000WEBP');

function archivo(buffer: Buffer, mimetype: string, size = buffer.length) {
  return { buffer, mimetype, size };
}

describe('validarFotosIncidencia', () => {
  it('acepta JPEG, PNG y WebP con su extensión normalizada', () => {
    expect(
      validarFotosIncidencia([
        archivo(jpeg, 'image/jpeg'),
        archivo(png, 'image/png'),
        archivo(webp, 'image/webp'),
      ]),
    ).toEqual([
      { contenido: jpeg, mimeType: 'image/jpeg', extension: 'jpg' },
      { contenido: png, mimeType: 'image/png', extension: 'png' },
      { contenido: webp, mimeType: 'image/webp', extension: 'webp' },
    ]);
  });

  it('rechaza lote vacío, más de ocho fotos y tamaño superior a 5 MiB', () => {
    expect(() => validarFotosIncidencia([])).toThrow(BadRequestException);
    expect(() =>
      validarFotosIncidencia(
        Array.from({ length: 9 }, () => archivo(jpeg, 'image/jpeg')),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      validarFotosIncidencia([
        archivo(jpeg, 'image/jpeg', 5 * 1024 * 1024 + 1),
      ]),
    ).toThrow(BadRequestException);
  });

  it('rechaza tipo declarado que no coincida con la firma', () => {
    expect(() => validarFotosIncidencia([archivo(png, 'image/jpeg')])).toThrow(
      BadRequestException,
    );
    expect(() =>
      validarFotosIncidencia([archivo(Buffer.from('texto'), 'image/jpeg')]),
    ).toThrow(BadRequestException);
  });
});
