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

El backend utiliza únicamente objetos bajo `incidents/`. No hace falta habilitar CORS del bucket porque los clientes envían las fotos al backend, que se comunica con S3. Las URL de lectura se firman en el backend y caducan a los 15 minutos.

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
- [Especificación de la integración](../backend/docs/spec/features/specs/2026-11-15-almacenar-fotos-incidencias-s3-spec.md).
