import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const S3_CLIENT = 'S3_CLIENT';

@Injectable()
export class AlmacenamientoFotosS3Service {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    private readonly config: ConfigService,
  ) {}

  private bucket(): string {
    try {
      const bucket = this.config.getOrThrow<string>('S3_BUCKET');
      const region = this.config.getOrThrow<string>('S3_REGION');
      if (!bucket.trim() || !region.trim())
        throw new Error('Configuración S3 vacía');
      return bucket;
    } catch {
      throw new ServiceUnavailableException(
        'El almacenamiento de fotos no está configurado.',
      );
    }
  }

  async subir(
    clave: string,
    contenido: Buffer,
    mimeType: string,
  ): Promise<void> {
    const Bucket = this.bucket();
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket,
          Key: clave,
          Body: contenido,
          ContentType: mimeType,
        }),
      );
    } catch {
      throw new BadGatewayException('No se pudo guardar la foto.');
    }
  }

  async borrar(clave: string): Promise<void> {
    const Bucket = this.bucket();
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket, Key: clave }));
    } catch {
      throw new BadGatewayException('No se pudo limpiar la foto.');
    }
  }

  async firmarLectura(clave: string): Promise<string> {
    const Bucket = this.bucket();
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket, Key: clave }),
        { expiresIn: 900 },
      );
    } catch {
      throw new BadGatewayException('No se pudo obtener la foto.');
    }
  }
}
