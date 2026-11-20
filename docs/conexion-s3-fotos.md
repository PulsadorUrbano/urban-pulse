# Conectar las fotos de incidencias con Amazon S3

Esta guía prepara el backend de Urban Pulse ejecutado con Docker Compose en un ordenador. La API guarda los archivos en S3 y las referencias en PostgreSQL. La aplicación móvil no se modifica en esta integración y todavía no sube fotos al backend real.

## Datos del bucket

| Ajuste | Valor |
| --- | --- |
| Tipo | Bucket de uso general de Amazon S3 |
| Nombre | `pulsadorurbano` |
| Región | Europa (Estocolmo), `eu-north-1` |
| Acceso público | Bloqueado |
| Cifrado | Predeterminado de S3; no se usa una clave KMS propia |
| Distribución CloudFront | `E2ZTI4WP68L09Z` |
| Dominio CDN | `d3i7srtglafney.cloudfront.net` |
| Clave pública | `K1T6P7KH35YSW6` |

El backend utiliza únicamente objetos bajo `incidents/`. No hace falta habilitar CORS del bucket porque los clientes envían las fotos al backend, que se comunica con S3. Las URL de lectura se firman en el backend y caducan a los 15 minutos. Al configurar las tres variables `CLOUDFRONT_*`, las lecturas se sirven mediante la distribución privada de CloudFront; sin ellas se conserva la lectura directa de S3 durante la transición.

## Dar acceso al backend

En la consola de AWS, abre **IAM → Políticas → Crear política → JSON**. Crea una política con estos permisos sobre los objetos de fotos del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FotosIncidencias",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::pulsadorurbano/incidents/*"
    }
  ]
}
```

Asigna esta política a una identidad IAM dedicada al backend. Para ejecutar Compose localmente, puedes usar credenciales temporales obtenidas con AWS CLI o una clave de acceso de ese usuario. AWS [recomienda credenciales temporales](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html); si creas una clave de acceso duradera, no uses la cuenta raíz y guárdala solo en el entorno local. La política no concede acceso a otros prefijos ni permite cambiar la configuración del bucket.

## Configurar Docker Compose local

El servicio `backend` ya recibe el `.env` de la raíz mediante `env_file`. Copia [`.env.example`](../.env.example) a `.env` si todavía no existe y completa estas variables en el archivo local:

```dotenv
S3_BUCKET=pulsadorurbano
S3_REGION=eu-north-1
AWS_ACCESS_KEY_ID=<identificador-de-la-identidad-del-backend>
AWS_SECRET_ACCESS_KEY=<clave-secreta-solo-en-el-archivo-local>
# Solo si las credenciales son temporales:
AWS_SESSION_TOKEN=<token-temporal>
```

No compartas el contenido del `.env`, no lo subas a Git y no pongas estas variables en el frontend. El SDK de AWS para Node.js lee las credenciales del entorno del contenedor mediante su [cadena de proveedores predeterminada](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/credential-providers/README.md). Si ejecutas el backend fuera de Compose, usa las mismas variables en `backend/.env` o configura un perfil AWS accesible desde ese proceso.

## Permisos temporales para crear la CDN

La identidad IAM que crea la distribución necesita permisos adicionales a los de subir fotos. La identidad local `Jose` actualmente recibe `AccessDenied` para `cloudfront:ListDistributions` y `s3:GetBucketPolicy`. Un administrador puede crear esta política de aprovisionamiento como política nueva, asociarla temporalmente al usuario `Jose` y retirarla tras verificar la CDN. Conserva la política `permisosubir` existente; sustituirla rompería las subidas del backend. No cambia el acceso público del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProvisionarCloudFrontFotos",
      "Effect": "Allow",
      "Action": [
        "cloudfront:ListDistributions",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:CreateDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:ListPublicKeys",
        "cloudfront:CreatePublicKey",
        "cloudfront:ListKeyGroups",
        "cloudfront:CreateKeyGroup",
        "cloudfront:ListOriginAccessControls",
        "cloudfront:CreateOriginAccessControl"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PoliticaBucketFotos",
      "Effect": "Allow",
      "Action": ["s3:GetBucketPolicy", "s3:PutBucketPolicy"],
      "Resource": "arn:aws:s3:::pulsadorurbano"
    }
  ]
}
```

El comodín de CloudFront es necesario al crear una distribución cuyo identificador todavía no existe. Estos permisos no deben quedarse en la identidad de ejecución habitual del backend una vez terminada la configuración.

## Crear la CDN privada

La distribución de CloudFront es global. Usa como origen el bucket S3 `pulsadorurbano` de `eu-north-1`, mediante el endpoint REST de S3, no el endpoint de sitio web. Selecciona **Origin Access Control (OAC)** con firma de solicitudes siempre activa. Mantén bloqueado el acceso público al bucket.

1. Genera localmente una pareja RSA de 2048 bits. Guarda la clave privada fuera de Git y carga únicamente la clave pública PEM en **CloudFront → Public keys**. Añade esa clave pública a un **Key group**.
2. Crea la distribución con el origen S3 anterior. Para la distribución dedicada a fotos, configura el comportamiento predeterminado con métodos `GET, HEAD`, política de protocolo **Redirect HTTP to HTTPS** y **Restrict viewer access** activado con el grupo de claves de confianza creado. El dominio `*.cloudfront.net` asignado por AWS es suficiente; no hace falta certificado ni dominio propio.
3. Asocia el OAC al origen. Añade a la política del bucket la siguiente instrucción, sustituyendo `<ACCOUNT_ID>` y `<DISTRIBUTION_ID>` por los valores reales. Conserva las demás instrucciones legítimas de la política existente:

```json
{
  "Sid": "CloudFrontReadIncidents",
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::pulsadorurbano/incidents/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
    }
  }
}
```

4. Para aprovisionar estos recursos desde el repositorio, guarda la clave pública PEM en `.superpowers/cloudfront-public.pem` y la privada codificada en base64 en el `.env` local. Desde `backend/`, ejecuta `node scripts/provision-cloudfront.mjs` con una identidad que tenga la política temporal anterior. El script crea los recursos, añade únicamente la instrucción `CloudFrontReadIncidents` a la política existente y escribe el dominio y el ID de clave pública en el `.env`. Guarda los identificadores intermedios en `.superpowers/cloudfront-state.json` para poder reintentarlo sin duplicarlos. Revisa el resultado y retira la política IAM temporal después de verificar el acceso. La clave privada nunca se envía a AWS ni se incluye en Git. La versión base64 permite que Compose la pase como una sola línea:

```dotenv
CLOUDFRONT_DOMAIN=<dominio-asignado>.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=<id-de-la-clave-publica>
CLOUDFRONT_PRIVATE_KEY_BASE64=<pem-privado-codificado-en-base64>
```

Para obtener la última variable en PowerShell, con la clave privada guardada fuera del repositorio:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\ruta\segura\cloudfront-private.pem'))
```

Comprueba que `GET /incidents/:id` devuelve URL con el dominio de CloudFront y parámetros `Expires`, `Signature` y `Key-Pair-Id`; que esa URL carga la foto; y que la misma ruta sin esos parámetros devuelve `403`. El acceso anónimo directo al objeto S3 también debe devolver `403`. Espera a que la distribución esté en estado **Deployed** antes de probar. Si falta una de las tres variables, el backend devolverá `503` al generar la URL en lugar de usar S3 por accidente.

## Verificación realizada el 15 de noviembre de 2026

La distribución `E2ZTI4WP68L09Z` alcanzó el estado `Deployed`. Se reconstruyó y reinició solo el contenedor backend, que recibió las tres variables `CLOUDFRONT_*`. Una imagen PNG temporal bajo `incidents/cloudfront-verification/` se pudo leer con URL firmada (`200`) y bytes idénticos; CloudFront sin firma y S3 anónimo respondieron `403`. El objeto temporal se eliminó. El 16 de noviembre de 2026 se realizó además la prueba HTTP completa con el ciudadano de desarrollo: login `200`, creación de incidencia `201`, subida multipart autenticada `201`, detalle `200` con una foto y lectura de CloudFront `200` con bytes idénticos. Se eliminaron el objeto S3 y las filas de prueba de PostgreSQL.

## Preparar la base y arrancar

La nueva tabla `IncidentImage` debe existir antes de utilizar la ruta de fotos. Revisa primero el estado real de la base y las migraciones pendientes; no uses `db push` ni elimines el volumen de PostgreSQL para preparar S3. Aplica la migración únicamente después de esa revisión, siguiendo [la guía de despliegue](deployment.md).

Para comprobar que Compose lee el archivo sin imprimir las variables en pantalla:

```powershell
docker compose config --quiet
```

Después de preparar la base, construye e inicia los servicios con los comandos de [despliegue](deployment.md). Una subida autorizada a `POST /incidents/:id/images` y una lectura de `GET /incidents/:id` permiten verificar el flujo completo: debe aparecer un objeto bajo `incidents/<id>/` en el bucket y el detalle debe devolver su URL temporal. La comprobación de Compose por sí sola no valida permisos de AWS, conexión a PostgreSQL ni subida de archivos.

## Errores habituales

| Síntoma | Comprobación |
| --- | --- |
| `503` al subir | Comprueba `S3_BUCKET`, `S3_REGION` y que el contenedor recibe el `.env` correcto. |
| `502` al subir o leer | Comprueba la identidad AWS, su política, la región y la conectividad de Docker. |
| `AccessDenied` en AWS | Verifica que la política apunta a `arn:aws:s3:::pulsadorurbano/incidents/*` y que está asociada a la identidad usada por el backend. |
| Foto ausente tras subir | Comprueba que la migración se aplicó, que PostgreSQL está disponible y que no quedó una operación de conciliación pendiente en los registros del backend. |

## Referencias

- [Crear un bucket S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html).
- [Acciones IAM para objetos de S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html).
- [Autenticación local con AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html).
- [Restringir un origen S3 con OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).
- [Servir contenido privado con URL firmadas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html).
- [Firmador de CloudFront para Node.js](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/cloudfront-signer/README.md).
- [Especificación de la integración](../backend/docs/spec/features/15-11-26-almacenar-fotos-incidencias-s3/spec.md).
