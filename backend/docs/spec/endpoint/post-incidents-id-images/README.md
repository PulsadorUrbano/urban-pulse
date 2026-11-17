# POST /incidents/:id/images — añadir fotos

- Estado: implementado en la rama `feat-integracion-s3`; subida multipart real con JWT, PostgreSQL, S3 y CloudFront verificada con datos temporales eliminados.
- Última revisión: 2026-11-16.
- Acceso: `Authorization: Bearer <JWT>`, rol `civic` con vínculo ciudadano vigente. La incidencia debe pertenecer a ese ciudadano.
- Formato: `multipart/form-data`, campo `images` con entre 1 y 8 archivos; ningún campo de texto adicional.

Cada archivo debe ser JPEG, PNG o WebP, con tipo declarado coherente con su firma y tamaño máximo de 5 MiB. Una incidencia admite como máximo ocho fotos acumuladas. `:id` debe ser UUID. El backend genera el ID y la clave del objeto; el cliente no envía `civicId`, URL ni clave S3.

Respuesta `201`: lista completa de fotos asociadas a la incidencia, ordenada por fecha e ID. Cada elemento contiene `id`, `url`, `mimeType` y `createdAt`. `url` es una URL HTTPS de lectura firmada durante 15 minutos. No se devuelve `objectKey`.

Errores: `400` por UUID, campo o archivo inválido; `401` sin JWT válido; `403` sin rol o vínculo ciudadano; `404` por incidencia ausente o ajena; `409` por límite acumulado, incluso ante solicitudes concurrentes; `413` por archivo superior a 5 MiB; `502` por fallo de S3; `503` por configuración incompleta o fallo de PostgreSQL.

El backend sube primero a S3 y registra después los metadatos en PostgreSQL. Si falla la operación, intenta borrar los objetos de esa petición; un fallo de limpieza o una confirmación SQL incierta queda registrado para conciliación. S3 y PostgreSQL no comparten transacción.

## Referencias

- [Especificación](../../features/specs/2026-11-15-almacenar-fotos-incidencias-s3-spec.md).
- [Plan](../../features/plans/2026-11-15-almacenar-fotos-incidencias-s3-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/services/fotos-incidencia.service.ts).
- [Guía de conexión](../../../../../docs/conexion-s3-fotos.md).
