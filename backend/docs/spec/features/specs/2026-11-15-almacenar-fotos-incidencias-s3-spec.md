# 2026-11-15 — Especificación: almacenar fotos de incidencias en S3

- Desarrollador responsable: pendiente de designación por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: GPT-6; versión exacta no disponible.
- Rama: `feat-integracion-s3`, creada desde el commit `4a05eb5` de la PR #158 (`fix/token`).
- Última actualización: 2026-11-15.
- Estado: código y unitarias implementados; migración aplicada y operaciones S3 verificadas en el entorno local. La subida HTTP completa con JWT sigue pendiente de prueba real.
- Plan: [Plan de implementación](../plans/2026-11-15-almacenar-fotos-incidencias-s3-plan.md).
- Referencias: [contrato actual de alta](../../endpoint/post-incidents/README.md), [contrato actual de detalle](../../endpoint/get-incidents-id/README.md) y [diseño que retiró las imágenes](../../../../../docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md).

## Objetivo y decisiones

Una persona autenticada como ciudadana puede adjuntar fotos a una incidencia propia mediante la API. El archivo vive en un bucket privado de Amazon S3 y PostgreSQL guarda exclusivamente la clave, el tipo y los metadatos de cada foto. El personal con acceso al detalle puede ver las fotos en la web. Esta especificación propone un flujo en dos pasos para conservar `POST /incidents` como JSON: primero crear la incidencia y después subir fotos al backend.

- Alcance: backend, modelo y migración Prisma, contrato HTTP, configuración AWS y visualización web de fotos existentes. No se modifica el mock.
- Decisión propuesta: el backend recibe los archivos y los envía a S3 con su identidad de servidor. Los clientes no reciben credenciales AWS. Frente a la subida directa con URL firmada, este flujo evita un contrato adicional de confirmación y CORS del bucket; consume ancho de banda del backend.
- Configuración facilitada: bucket Amazon S3 `pulsadorurbano` en `eu-north-1`, backend local en Docker Compose y cifrado predeterminado de S3. El límite previsto es de 8 fotos JPEG, PNG o WebP de 5 MiB cada una; las fotos solo se añaden, sin sustitución ni borrado desde la aplicación.
- Fuera de alcance: cualquier cambio en `frontend-mobile/`, integración de la app móvil con el nuevo contrato, migrar fotos del mock o de Cloudinary, borrar incidencias, edición de fotos, CDN, subida directa desde clientes, despliegue y ejecución de migraciones en una base real sin revisar su estado.

## Contexto anterior a esta implementación

- `backend/prisma/schema.prisma` define `Incident` sin relación de imágenes; la migración `20261109000000_retirar_imagenes` eliminó `IncidentImage`.
- `POST /incidents` acepta solo JSON, deriva `civicId` del JWT y rechaza `images` y multipart. `GET /incidents/:id` y las respuestas completas devuelven `images: []`.
- La PR #158 cambia `frontend-mobile/src/services/incident.service.ts` para crear incidencias reales con JSON y JWT, sin subir las fotos seleccionadas. La app móvil queda expresamente fuera de este trabajo; podrá crear la incidencia, pero no subir fotos a la API nueva.
- `frontend-web/src/components/incident-gallery.tsx` ya representaba una galería y `frontend-web/src/types/incident.ts` esperaba `images`; faltaba enviar JWT al consultar el detalle y refrescarlo cuando caducara la URL.
- Stack comprobado: NestJS 12, Prisma 7.10.1, PostgreSQL, Expo 58 y React 19. Se incorporó el SDK AWS de S3 al backend con `pnpm`.

## Contrato HTTP implementado en código

| Método y ruta | Entrada | Respuesta | Acceso |
| --- | --- | --- | --- |
| `POST /incidents` | JSON actual, sin fotos ni `civicId` | `201` con incidencia creada, `images: []` | JWT, rol `civic` y vínculo ciudadano vigente |
| `POST /incidents/:id/images` | `multipart/form-data`, campo `images` con 1 a 8 archivos | `201` con la lista completa `images` de la incidencia | JWT, rol `civic`, vínculo ciudadano y propiedad de la incidencia |
| `GET /incidents/:id` | UUID en ruta | `200` con `images` reales y URL HTTPS temporales | Permisos actuales de detalle; ajena a ciudadano sigue siendo `404` |

Las otras respuestas que hoy contienen el recurso completo de incidencia también deben devolver la lista real de imágenes o documentarse de forma explícita si su contrato cambia. El listado resumido no añade imágenes. Los nombres `id`, `url`, `mimeType` y `createdAt` de cada imagen se conservan para los consumidores existentes. `url` es una URL firmada de lectura que caduca a los 15 minutos; la clave S3 nunca se expone. El cliente refresca el detalle antes de reutilizar una URL caducada.

### Validación, permisos y errores

| Entrada | Regla |
| --- | --- |
| `:id` | UUID válido; `400` en otro caso. |
| `images` | De 1 a 8 partes; solo JPEG, PNG o WebP según firma del archivo y tipo declarado; máximo 5 MiB por parte. No se aceptan otros campos de formulario. |
| Límite acumulado | Máximo 8 imágenes por incidencia, también ante solicitudes concurrentes. Si se excede, `409` sin crear nuevos registros. |
| Identidad | El backend obtiene al ciudadano del JWT. Una incidencia ajena o inexistente responde `404`; sin JWT `401`; rol o vínculo inválido `403`. |
| Fallos externos | S3 inaccesible o respuesta inválida: `502`; configuración AWS incompleta: `503`; PostgreSQL no disponible: `503`. No se filtran credenciales ni errores originales. |

Para archivos inválidos o ausentes se devuelve `400` sin guardar objetos. No se devuelve `201` hasta confirmar la escritura en S3 y PostgreSQL. Una petición con archivos válidos funciona como lote: o se registran todos o ninguno. Una incidencia creada previamente permanece aunque la subida de fotos falle. El cliente de la API puede reintentar solo la subida de fotos.

## Modelo Prisma y almacenamiento

| Modelo | Campos | Relación e índices |
| --- | --- | --- |
| `IncidentImage` nuevo | `id String @id @default(uuid()) @db.Uuid`; `incidentId String @db.Uuid`; `objectKey String @unique`; `mimeType String`; `createdAt DateTime @default(now())` | `Incident` uno a muchos; FK `incidentId` con `onDelete: Restrict`; índice `incidentId` para lectura y comprobación del límite. |
| `Incident` existente | Añadir `images IncidentImage[]` | Sin cambiar los demás campos ni su identidad. |

La migración crea la tabla de nuevo y no reintroduce campos históricos `url` ni `cloudinaryId`. Antes de aplicarla en la base local se revisaron la historia y los datos existentes; no se usó `db push` ni se reseteó la base. La clave es generada por servidor como `incidents/{incidentId}/{imageId}.{ext}`. Los objetos son privados; no se almacena una URL firmada en PostgreSQL.

El backend sube las partes a S3 antes de abrir la transacción SQL. En la transacción bloquea la incidencia, vuelve a comprobar propiedad y límite, e inserta todas las filas. Si falla una subida o la inserción, intenta borrar únicamente los objetos creados por esa operación. Si el resultado de la escritura SQL es ambiguo, comprueba los IDs de imagen antes de borrar; si no puede confirmarlo, conserva los objetos y registra una conciliación pendiente sin datos personales ni secretos. PostgreSQL y S3 no comparten transacción: una caída del proceso puede dejar objetos huérfanos y requiere una conciliación operativa posterior. No se promete atomicidad entre ambos servicios.

## Configuración AWS necesaria

| Dato | Necesidad | Uso |
| --- | --- | --- |
| Nombre exacto del bucket | Obligatorio | `S3_BUCKET`; nombre, no URL ni ARN. |
| Región AWS exacta | Facilitada | `S3_REGION=eu-north-1`. |
| Método de credenciales del backend | Configurado localmente; no versionado | Compose local pasa `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y, si son temporales, `AWS_SESSION_TOKEN` desde `.env`; no guardar secretos en Git. |
| Permisos sobre `arn:aws:s3:::<bucket>/incidents/*` | Obligatorio | `s3:PutObject`, `s3:GetObject` y `s3:DeleteObject` para subida, lectura firmada y compensación. |
| Cifrado con clave KMS propia | Solo si el bucket lo exige | ARN de la clave y permisos KMS necesarios para la identidad del backend. El cifrado administrado por S3 no exige este dato adicional. |
| Endpoint y modo de direccionamiento | Solo si no es Amazon S3 estándar | URL del endpoint y si requiere path-style; se documentará antes de implementar. |

La configuración objetivo mantiene el bloqueo de acceso público y no necesita CORS del bucket porque los clientes hablan con el backend. El backend corre con Docker Compose local; la identidad IAM y las credenciales deben prepararse según la [guía](../../../../../docs/conexion-s3-fotos.md). No enviar claves secretas por chat ni guardarlas en el repositorio.

## Criterios de aceptación

1. Una incidencia propia acepta de 1 a 8 fotos válidas de hasta 5 MiB y el detalle las recupera tras reiniciar el backend.
2. Una incidencia ajena no permite subir ni obtener fotos; una petición sin JWT no obtiene acceso.
3. Archivos inválidos, exceso de cantidad o solicitudes concurrentes no superan el límite ni dejan registros parciales.
4. Una caída de S3 o PostgreSQL no devuelve éxito; se compensa lo confirmado cuando se puede y se registra una conciliación si el resultado es incierto.
5. `frontend-mobile/` permanece sin cambios. La web muestra las fotos autorizadas y renueva las URL caducadas; la incompatibilidad móvil queda documentada como pendiente separado.
6. No hay binarios, credenciales ni URL firmadas persistidas en PostgreSQL; el bucket sigue privado.
7. Los contratos y ejemplos de entorno se actualizan sin presentar la propuesta como implementada antes de verificarla.

## Documentación y verificación

Se crearon la ficha `backend/docs/spec/endpoint/post-incidents-id-images/README.md` y los contratos afectados. Las unitarias del backend usan dobles de S3 y Prisma; las pruebas web cubren el servicio HTTP, mientras que la galería no tiene una prueba de interfaz automatizada. Se ejecutaron los controles de calidad. Tras la autorización posterior del usuario, se aplicaron las migraciones pendientes en la base local y se comprobaron escritura, lectura, borrado y URL firmada contra S3 real desde el contenedor. La petición HTTP multipart con JWT sigue pendiente de una prueba real. Los resultados y desviaciones constan en [el plan](../plans/2026-11-15-almacenar-fotos-incidencias-s3-plan.md#confirmación-de-implementación).
