import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  async subirImagen(
    imagen: unknown,
  ): Promise<{ publicId: string; url: string }> {
    if (
      typeof imagen !== 'string' ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        imagen,
      )
    ) {
      throw new BadRequestException(
        'Se requiere una imagen JPEG, PNG o WebP en base64.',
      );
    }
    const contenido = Buffer.from(
      imagen.slice(imagen.indexOf(',') + 1),
      'base64',
    );
    if (contenido.toString('base64') !== imagen.slice(imagen.indexOf(',') + 1)) {
      throw new BadRequestException('El contenido base64 no es válido.');
    }
    if (!contenido.length || contenido.length > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'La imagen debe ocupar entre 1 byte y 5 MB.',
      );
    }
    const nube = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const clave = this.config.get<string>('CLOUDINARY_API_KEY');
    const secreto = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!nube || !clave || !secreto) {
      throw new ServiceUnavailableException('Cloudinary no está configurado.');
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHash('sha256')
      .update(`timestamp=${timestamp}${secreto}`)
      .digest('hex');
    const formulario = new FormData();
    formulario.set('file', imagen);
    formulario.set('api_key', clave);
    formulario.set('timestamp', timestamp);
    formulario.set('signature', signature);
    try {
      const respuesta = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(nube)}/image/upload`,
        {
          method: 'POST',
          body: formulario,
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!respuesta.ok) throw new Error('Error de subida');
      const resultado: unknown = await respuesta.json();
      if (
        typeof resultado !== 'object' ||
        resultado === null ||
        !('public_id' in resultado) ||
        !('secure_url' in resultado) ||
        typeof resultado.public_id !== 'string' ||
        typeof resultado.secure_url !== 'string' ||
        !resultado.secure_url.startsWith('https://')
      ) {
        throw new Error('Respuesta inválida');
      }
      return { publicId: resultado.public_id, url: resultado.secure_url };
    } catch {
      throw new BadGatewayException('No se pudo subir la imagen a Cloudinary.');
    }
  }
}

