import { createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateKeyGroupCommand,
  CreateOriginAccessControlCommand,
  CreatePublicKeyCommand,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import {
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const raiz = resolve(import.meta.dirname, '../..');
const rutaEntorno = resolve(raiz, '.env');
const rutaClavePublica = resolve(raiz, '.superpowers/cloudfront-public.pem');
const rutaEstado = resolve(raiz, '.superpowers/cloudfront-state.json');
const bucket = 'pulsadorurbano';
const nombre = 'urban-pulse-fotos-2026-11-15';

dotenv.config({ path: rutaEntorno, quiet: true });

const clavePrivada = process.env.CLOUDFRONT_PRIVATE_KEY_BASE64;
if (!clavePrivada || !existsSync(rutaClavePublica)) {
  throw new Error(
    'Faltan la clave privada local o la clave pública de CloudFront.',
  );
}
const clavePublica = readFileSync(rutaClavePublica, 'utf8');
const publicaDerivada = createPublicKey(
  createPrivateKey(Buffer.from(clavePrivada, 'base64').toString()),
).export({ type: 'spki', format: 'pem' });
if (publicaDerivada.toString() !== clavePublica) {
  throw new Error('La clave pública local no corresponde a la clave privada.');
}

const cloudFront = new CloudFrontClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'eu-north-1' });
const estado = existsSync(rutaEstado)
  ? JSON.parse(readFileSync(rutaEstado, 'utf8'))
  : {};
const guardarEstado = () =>
  writeFileSync(rutaEstado, JSON.stringify(estado, null, 2));

if (!estado.publicKeyId) {
  const respuesta = await cloudFront.send(
    new CreatePublicKeyCommand({
      PublicKeyConfig: {
        CallerReference: nombre,
        Name: nombre,
        EncodedKey: clavePublica,
        Comment: 'Firma de fotos privadas de Urban Pulse',
      },
    }),
  );
  estado.publicKeyId = respuesta.PublicKey?.Id;
  if (!estado.publicKeyId)
    throw new Error('AWS no devolvió el ID de la clave pública.');
  guardarEstado();
}

if (!estado.keyGroupId) {
  const respuesta = await cloudFront.send(
    new CreateKeyGroupCommand({
      KeyGroupConfig: {
        Name: nombre,
        Items: [estado.publicKeyId],
        Comment: 'Lectura firmada de fotos de incidencias',
      },
    }),
  );
  estado.keyGroupId = respuesta.KeyGroup?.Id;
  if (!estado.keyGroupId)
    throw new Error('AWS no devolvió el ID del grupo de claves.');
  guardarEstado();
}

if (!estado.oacId) {
  const respuesta = await cloudFront.send(
    new CreateOriginAccessControlCommand({
      OriginAccessControlConfig: {
        Name: nombre,
        Description: 'Acceso privado a pulsadorurbano/incidents/',
        SigningProtocol: 'sigv4',
        SigningBehavior: 'always',
        OriginAccessControlOriginType: 's3',
      },
    }),
  );
  estado.oacId = respuesta.OriginAccessControl?.Id;
  if (!estado.oacId) throw new Error('AWS no devolvió el ID del OAC.');
  guardarEstado();
}

if (!estado.distributionId) {
  const respuesta = await cloudFront.send(
    new CreateDistributionCommand({
      DistributionConfig: {
        CallerReference: nombre,
        Comment: 'Fotos privadas de incidencias de Urban Pulse',
        Enabled: true,
        Origins: {
          Quantity: 1,
          Items: [
            {
              Id: 's3-pulsadorurbano',
              DomainName: `${bucket}.s3.eu-north-1.amazonaws.com`,
              S3OriginConfig: { OriginAccessIdentity: '' },
              OriginAccessControlId: estado.oacId,
            },
          ],
        },
        DefaultCacheBehavior: {
          TargetOriginId: 's3-pulsadorurbano',
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
            CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
          },
          TrustedKeyGroups: {
            Enabled: true,
            Quantity: 1,
            Items: [estado.keyGroupId],
          },
          CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
          Compress: true,
        },
        PriceClass: 'PriceClass_100',
        ViewerCertificate: { CloudFrontDefaultCertificate: true },
        HttpVersion: 'http2',
        IsIPV6Enabled: true,
      },
    }),
  );
  estado.distributionId = respuesta.Distribution?.Id;
  estado.domain = respuesta.Distribution?.DomainName;
  estado.arn = respuesta.Distribution?.ARN;
  if (!estado.distributionId || !estado.domain || !estado.arn) {
    throw new Error('AWS no devolvió los datos completos de la distribución.');
  }
  guardarEstado();
}

const distribucion = await cloudFront.send(
  new GetDistributionCommand({ Id: estado.distributionId }),
);
if (distribucion.Distribution?.ARN !== estado.arn) {
  throw new Error('El ARN de la distribución no coincide con el estado local.');
}
let politica;
try {
  const respuesta = await s3.send(
    new GetBucketPolicyCommand({ Bucket: bucket }),
  );
  politica = JSON.parse(respuesta.Policy);
} catch (error) {
  if (error.name !== 'NoSuchBucketPolicy') throw error;
  politica = { Version: '2012-10-17', Statement: [] };
}
const instrucciones = Array.isArray(politica.Statement)
  ? politica.Statement
  : [politica.Statement];
const existente = instrucciones.find(
  (item) => item.Sid === 'CloudFrontReadIncidents',
);
const instruccion = {
  Sid: 'CloudFrontReadIncidents',
  Effect: 'Allow',
  Principal: { Service: 'cloudfront.amazonaws.com' },
  Action: 's3:GetObject',
  Resource: `arn:aws:s3:::${bucket}/incidents/*`,
  Condition: { StringEquals: { 'AWS:SourceArn': estado.arn } },
};
if (existente && JSON.stringify(existente) !== JSON.stringify(instruccion)) {
  throw new Error(
    'Ya existe CloudFrontReadIncidents con otros permisos; revisión manual necesaria.',
  );
}
if (!existente) {
  politica.Statement = [...instrucciones, instruccion];
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(politica),
    }),
  );
}

let entorno = readFileSync(rutaEntorno, 'utf8');
for (const [clave, valor] of [
  ['CLOUDFRONT_DOMAIN', estado.domain],
  ['CLOUDFRONT_KEY_PAIR_ID', estado.publicKeyId],
]) {
  const linea = new RegExp(`^${clave}=.*$`, 'm');
  entorno = linea.test(entorno)
    ? entorno.replace(linea, `${clave}=${valor}`)
    : `${entorno.trimEnd()}\n${clave}=${valor}\n`;
}
writeFileSync(rutaEntorno, entorno);
console.log(
  JSON.stringify({
    distributionId: estado.distributionId,
    domain: estado.domain,
    status: distribucion.Distribution?.Status,
    publicKeyId: estado.publicKeyId,
    keyGroupId: estado.keyGroupId,
    oacId: estado.oacId,
    bucketPolicyUpdated: !existente,
  }),
);
