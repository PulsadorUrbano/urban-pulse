# POST /incidents/:id/images — añadir fotos

- Estado: implementado.
- Última revisión: 2026-11-20.
- Acceso: `Authorization: Bearer <JWT>`, rol `civic` con vínculo ciudadano vigente. La incidencia debe pertenecer a ese ciudadano.
- Formato: `multipart/form-data`, campo `images` con entre 1 y 8 archivos; ningún campo de texto adicional.
- Cabecera opcional: `Idempotency-Key: <UUID v4>`. Genera una clave por tanda y reutilízala al reintentar con los mismos archivos.

Cada archivo debe ser JPEG, PNG o WebP, con tipo declarado coherente con su firma y tamaño máximo de 5 MiB. Una incidencia admite como máximo ocho fotos acumuladas. `:id` debe ser UUID. El backend genera el ID y la clave del objeto; el cliente no envía `civicId`, URL ni clave S3.

Respuesta `201`: lista completa de fotos asociadas a la incidencia, ordenada por fecha e ID. Cada elemento contiene `id`, `url`, `mimeType` y `createdAt`. `url` es una URL HTTPS de lectura firmada durante 15 minutos. No se devuelve `objectKey`.

Una clave confirmada se conserva en PostgreSQL mientras exista al menos una foto de la tanda, sin caducidad. Cada incidencia gestiona sus propias claves. Tras validar el acceso y los archivos, un reintento con la misma clave devuelve `201` y la galería actual con URLs recién firmadas, incluso si la incidencia ya tiene ocho fotos. La primera tanda confirmada para la clave prevalece. Los fallos anteriores al registro permiten volver a usar la clave. Las peticiones sin cabecera conservan el comportamiento anterior.

Errores: `400` por UUID, campo, archivo o clave de idempotencia inválidos; `401` sin JWT válido; `403` sin rol o vínculo ciudadano; `404` por incidencia ausente o ajena; `409` por límite acumulado, incluso ante solicitudes concurrentes; `413` por archivo superior a 5 MiB; `502` por fallo de S3; `503` por configuración incompleta o fallo de PostgreSQL.

El backend sube primero a S3 y registra después los metadatos en PostgreSQL. Si falla la operación, intenta borrar los objetos de esa petición; un fallo de limpieza o una confirmación SQL incierta queda registrado para conciliación. S3 y PostgreSQL no comparten transacción.

Si dos peticiones de la misma tanda coinciden, el bloqueo de la incidencia permite registrar una sola. La otra descarta los objetos provisionales que haya subido a S3 y devuelve la galería.

## Referencias

- [Especificación de idempotencia](../../features/specs/2026-11-20-evitar-fotos-duplicadas-spec.md).
- [Plan de idempotencia](../../features/plans/2026-11-20-evitar-fotos-duplicadas-plan.md).
- [Especificación](../../features/specs/2026-11-15-almacenar-fotos-incidencias-s3-spec.md).
- [Plan](../../features/plans/2026-11-15-almacenar-fotos-incidencias-s3-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/services/fotos-incidencia.service.ts).
- [Guía de conexión](../../../../../docs/conexion-s3-fotos.md).
