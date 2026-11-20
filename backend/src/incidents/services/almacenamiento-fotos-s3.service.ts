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
import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer';

export const S3_CLIENT = 'S3_CLIENT';

@Injectable()
export class AlmacenamientoFotosS3Service {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    private readonly config: ConfigService,
  ) {}

  comprobarConfiguracion(): void {
    this.bucket();
  }

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
    const domain = this.config.get<string>('CLOUDFRONT_DOMAIN')?.trim();
    const keyPairId = this.config.get<string>('CLOUDFRONT_KEY_PAIR_ID')?.trim();
    const privateKeyBase64 = this.config
      .get<string>('CLOUDFRONT_PRIVATE_KEY_BASE64')
      ?.trim();
    const cloudFrontConfigurado = domain || keyPairId || privateKeyBase64;
    if (cloudFrontConfigurado && (!domain || !keyPairId || !privateKeyBase64)) {
      throw new ServiceUnavailableException('CloudFront no está configurado.');
    }

    if (cloudFrontConfigurado) {
      if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(domain!)) {
        throw new ServiceUnavailableException(
          'CloudFront no está configurado.',
        );
      }
      const privateKey = Buffer.from(privateKeyBase64!, 'base64').toString();
      try {
        return getCloudFrontSignedUrl({
          url: `https://${domain}/${clave.split('/').map(encodeURIComponent).join('/')}`,
          keyPairId: keyPairId!,
          privateKey,
          dateLessThan: new Date(Date.now() + 900_000).toISOString(),
        });
      } catch {
        throw new BadGatewayException('No se pudo obtener la foto.');
      }
    }

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
