import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { UploadedImageFile } from './incident.js';

const tiempoLimiteMs = 15_000;

export interface ImagenCloudinary {
  cloudinaryId: string;
  url: string;
}

interface ConfiguracionCloudinary {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  async subirImagen(
    publicId: string,
    archivo: UploadedImageFile,
  ): Promise<ImagenCloudinary> {
    const configuracion = this.obtenerConfiguracion();
    const timestamp = this.timestampActual();
    const firma = this.firmar(
      { overwrite: 'false', public_id: publicId, timestamp },
      configuracion.apiSecret,
    );
    const formulario = new FormData();
    const bytes = Uint8Array.from(archivo.buffer);
    formulario.append(
      'file',
      new Blob([bytes], { type: archivo.mimetype }),
    );
    formulario.append('public_id', publicId);
    formulario.append('overwrite', 'false');
    formulario.append('timestamp', String(timestamp));
    formulario.append('api_key', configuracion.apiKey);
    formulario.append('signature', firma);

    const respuesta = await this.solicitar(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuracion.cloudName)}/image/upload`,
      formulario,
    );
    const cuerpo = await this.leerJson(respuesta);
    if (
      !esObjeto(cuerpo) ||
      cuerpo.public_id !== publicId ||
      typeof cuerpo.secure_url !== 'string' ||
      !this.esUrlHttps(cuerpo.secure_url)
    ) {
      throw new BadGatewayException('Respuesta inválida de Cloudinary.');
    }

    return { cloudinaryId: publicId, url: cuerpo.secure_url };
  }

  async eliminarImagen(publicId: string): Promise<void> {
    const configuracion = this.obtenerConfiguracion();
    const timestamp = this.timestampActual();
    const firma = this.firmar(
      { public_id: publicId, timestamp },
      configuracion.apiSecret,
    );
    const formulario = new FormData();
    formulario.append('public_id', publicId);
    formulario.append('timestamp', String(timestamp));
    formulario.append('api_key', configuracion.apiKey);
    formulario.append('signature', firma);

    const respuesta = await this.solicitar(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuracion.cloudName)}/image/destroy`,
      formulario,
      true,
    );
    if (respuesta.status === 404) {
      return;
    }

    const cuerpo = await this.leerJson(respuesta);
    if (
      !esObjeto(cuerpo) ||
      (cuerpo.result !== 'ok' && cuerpo.result !== 'not found')
    ) {
      throw new BadGatewayException('Respuesta inválida de Cloudinary.');
    }
  }

  private obtenerConfiguracion(): ConfiguracionCloudinary {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService
      .get<string>('CLOUDINARY_API_SECRET')
      ?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'El servicio de imágenes no está configurado.',
      );
    }
    return { cloudName, apiKey, apiSecret };
  }

  private timestampActual(): number {
    return Math.floor(Date.now() / 1000);
  }

  private firmar(
    parametros: Record<string, string | number>,
    apiSecret: string,
  ): string {
    const cadena = Object.entries(parametros)
      .sort(([nombreA], [nombreB]) => nombreA.localeCompare(nombreB))
      .map(([nombre, valor]) => `${nombre}=${valor}`)
      .join('&');
    return createHash('sha256')
      .update(`${cadena}${apiSecret}`)
      .digest('hex');
  }

  private async solicitar(
    url: string,
    body: FormData,
    aceptarNoEncontrado = false,
  ): Promise<Response> {
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(tiempoLimiteMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new GatewayTimeoutException('Cloudinary agotó el tiempo de espera.');
      }
      throw new BadGatewayException('No se pudo completar la solicitud a Cloudinary.');
    }
    if (!respuesta.ok && !(aceptarNoEncontrado && respuesta.status === 404)) {
      throw new BadGatewayException('Cloudinary rechazó la solicitud.');
    }
    return respuesta;
  }

  private async leerJson(respuesta: Response): Promise<unknown> {
    try {
      return (await respuesta.json()) as unknown;
    } catch {
      throw new BadGatewayException('Cloudinary devolvió una respuesta inválida.');
    }
  }

  private esUrlHttps(valor: string): boolean {
    try {
      return new URL(valor).protocol === 'https:';
    } catch {
      return false;
    }
  }
}
