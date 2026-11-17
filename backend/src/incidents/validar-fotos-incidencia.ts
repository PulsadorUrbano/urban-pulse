import { BadRequestException } from '@nestjs/common';

export interface ArchivoFoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface FotoValidada {
  contenido: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

const LIMITE_FOTOS = 8;
const LIMITE_BYTES = 5 * 1024 * 1024;

function formato(
  contenido: Buffer,
): Pick<FotoValidada, 'mimeType' | 'extension'> | null {
  if (
    contenido.length >= 3 &&
    contenido[0] === 0xff &&
    contenido[1] === 0xd8 &&
    contenido[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    contenido.length >= 8 &&
    contenido
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    contenido.length >= 12 &&
    contenido.toString('ascii', 0, 4) === 'RIFF' &&
    contenido.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
}

export function validarFotosIncidencia(
  archivos: ArchivoFoto[],
): FotoValidada[] {
  if (archivos.length < 1 || archivos.length > LIMITE_FOTOS) {
    throw new BadRequestException('Se requieren entre una y ocho fotos.');
  }
  return archivos.map(({ buffer, mimetype, size }) => {
    if (
      !Buffer.isBuffer(buffer) ||
      size < 1 ||
      size > LIMITE_BYTES ||
      buffer.length !== size
    ) {
      throw new BadRequestException('La foto supera el límite o está vacía.');
    }
    const detectado = formato(buffer);
    if (!detectado || detectado.mimeType !== mimetype) {
      throw new BadRequestException(
        'La foto debe ser JPEG, PNG o WebP válido.',
      );
    }
    return { contenido: buffer, ...detectado };
  });
}
