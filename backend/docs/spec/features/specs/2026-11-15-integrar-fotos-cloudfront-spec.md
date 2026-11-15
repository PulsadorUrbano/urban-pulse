# 2026-11-15 — Especificación: servir fotos privadas mediante CloudFront

- Rama: `feat-integracion-s3`.
- Plan: [Plan de implementación](../plans/2026-11-15-integrar-fotos-cloudfront-plan.md).
- Estado: distribución creada y verificada el 2026-11-15; prueba HTTP completa con JWT pendiente.

## Objetivo

Servir las fotos de incidencias desde una CDN global sin hacer público el bucket S3 ni modificar `frontend-mobile/`.

## Contrato

- El backend sigue subiendo y borrando objetos en `s3://pulsadorurbano/incidents/`.
- Cuando están configuradas `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID` y `CLOUDFRONT_PRIVATE_KEY_BASE64`, `GET /incidents/:id` devuelve URL HTTPS firmadas de CloudFront para las fotos.
- Cada URL caduca 15 minutos después de generarse. La API nunca entrega la clave privada.
- Durante la transición, si no se configura ninguna de las tres variables, el backend mantiene las URL prefirmadas de S3. Si la configuración está incompleta, responde `503` al intentar leer fotos.
- El frontend web consume el mismo campo `url` de la API; no necesita cambiar.

## Infraestructura

- Distribución dedicada con origen S3 REST del bucket en `eu-north-1`, OAC con firma de solicitudes siempre activa, HTTPS para visitantes y solo `GET`/`HEAD`.
- Comportamiento restringido con un grupo de claves de confianza que contiene la clave pública del backend.
- Política del bucket que permite al servicio CloudFront `s3:GetObject` únicamente en `incidents/*` y solo desde el ARN de esa distribución.
- Bloqueo de acceso público del bucket conservado. El backend mantiene su permiso IAM de escritura y borrado de objetos.
- Se usa el dominio `*.cloudfront.net` asignado por AWS; no se requiere DNS ni certificado propio.

## Aceptación

1. La URL de la API usa el dominio de la distribución, incluye `Expires`, `Signature` y `Key-Pair-Id`, y muestra la foto antes de expirar.
2. La misma ruta sin firma devuelve `403` en CloudFront.
3. Un acceso anónimo directo al objeto S3 devuelve `403`.
4. Subir y borrar fotos continúa funcionando.
5. No hay secretos en Git, logs ni respuestas HTTP.
