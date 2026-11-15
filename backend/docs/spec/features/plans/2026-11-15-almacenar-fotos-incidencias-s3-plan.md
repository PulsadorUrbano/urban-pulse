# 2026-11-15 — Plan de implementación: almacenar fotos de incidencias en S3

- Objetivo: subir fotos de incidencias mediante una API protegida, conservar sus referencias en PostgreSQL y mostrarlas en el detalle web.
- Arquitectura: `POST /incidents` sigue aceptando JSON. Una ruta aparte recibe fotos, el backend las escribe en un bucket privado y Prisma registra sus claves. El detalle entrega URL de lectura temporales.
- Herramientas: NestJS 12, Prisma 7.10.1, PostgreSQL, AWS SDK for JavaScript v3, React 19; versiones del SDK fijadas en `backend/pnpm-lock.yaml`.
- Especificación: [Contrato y criterios](../specs/2026-11-15-almacenar-fotos-incidencias-s3-spec.md).
- Rama de trabajo: `feat-integracion-s3`, basada en el commit `4a05eb5` de la PR #158 (`fix/token`).
- Estado: código implementado; migración local y operaciones reales con S3 verificadas. Pendiente la prueba HTTP multipart completa con JWT.

## Restricciones generales

- No modificar `frontend-mobile/` ni incluir su corrección en estas tareas. La PR base ya permite crear incidencias con JSON y JWT, pero la app móvil seguirá sin subir fotos al backend real.
- Bucket privado, sin credenciales en los clientes, URL firmadas de lectura de 15 minutos y máximo 8 archivos JPEG, PNG o WebP de 5 MiB cada uno.
- Durante la preparación del código no aplicar migraciones, activar `db push`, desplegar ni hacer peticiones reales a AWS. El usuario autorizó después la migración y la prueba S3 en su entorno local.
- Programar y documentar en español; preservar contratos públicos y nombres impuestos por bibliotecas. En backend usar TypeScript estricto, ESM e imports relativos `.js`.
- No crear pruebas e2e o de integración; usar unitarias con dobles de S3 y Prisma. El usuario solicitó expresamente publicar esta rama.
- Antes de instalar el SDK o usar APIs de NestJS, Prisma y S3, comprobar versiones y consultar Context7. El backend usa `pnpm` y la web usa `npm` para sus comandos existentes.

## Focos de revisión

| Riesgo | Tarea y prueba prevista |
| --- | --- |
| Archivo con MIME declarado distinto de su firma, o mayor de 5 MiB | Tarea 2: caso unitario que rechaza ambos antes de llamar a S3. |
| Dos solicitudes concurrentes superan 8 fotos | Tarea 3: caso unitario que comprueba la segunda validación bajo bloqueo de incidencia. |
| Incidencia ajena revela fotos o permite subirlas | Tareas 3 y 4: casos de propiedad y lectura que devuelven `404`. |
| S3 confirma subida y falla PostgreSQL | Tarea 3: caso que borra solo claves de la operación o registra conciliación si el resultado SQL es incierto. |
| Caduca una URL mientras la galería está abierta | Tarea 5: caso que refresca el detalle una vez y vuelve a mostrar la imagen. |

## Mapa de archivos

Rutas relativas a la raíz del repositorio. Son las ubicaciones previstas; confirmar los puntos de inyección al comenzar cada tarea.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `backend/prisma/schema.prisma` | Relación `Incident` a `IncidentImage` y metadatos persistibles. |
| Crear | `backend/prisma/migrations/<nueva_migracion>/migration.sql` | Crear tabla, FK e índices sin restaurar columnas históricas. |
| Modificar | `backend/package.json`, `backend/pnpm-lock.yaml`, `backend/.env.example` | SDK S3 y configuración sin secretos. |
| Crear | `backend/src/incidents/services/almacenamiento-fotos-s3.service.ts` | Escritura, borrado compensatorio y firma de lectura. |
| Crear | `backend/src/incidents/services/fotos-incidencia.service.ts` | Propiedad, límite, persistencia y recuperación de fotos. |
| Modificar | `backend/src/incidents/incidents.module.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/src/incidents/incident.ts`, `backend/src/incidents/incidents.service.ts` | Registro de proveedores, ruta, serialización y tipos. |
| Crear | `backend/test/incidents/services/almacenamiento-fotos-s3.service.spec.ts`, `backend/test/incidents/services/fotos-incidencia.service.spec.ts` | Unitarias de S3, validación, permisos, límite y fallos parciales. |
| Crear | `backend/docs/spec/endpoint/post-incidents-id-images/README.md` | Ficha de la nueva ruta, una vez implementada. |
| Modificar | `backend/docs/spec/endpoint/post-incidents/README.md`, `backend/docs/spec/endpoint/get-incidents-id/README.md`, fichas de otras rutas que devuelvan el recurso completo, `backend/README.md` | Contratos y configuración vigentes tras implementar. |
| Modificar | `frontend-web/src/services/incident.service.ts`, `frontend-web/src/components/incident-gallery.tsx`, `frontend-web/src/types/incident.ts` si el contrato lo requiere | Lectura y renovación de fotos temporales. |
| Modificar | `frontend-web/src/__tests__/services/incident.service.test.ts`, pruebas del componente de galería que se creen bajo `src/__tests__/` | Verificar lectura y renovación sin red. |
| Actualizar | Esta especificación y este plan | Contrato final, decisiones, estado y evidencia real. |

Las tareas siguientes describen la secuencia de implementación. La sección de confirmación recoge el estado comprobado y las desviaciones respecto del plan original.

## Preparación

- Leer [la especificación](../specs/2026-11-15-almacenar-fotos-incidencias-s3-spec.md), instrucciones de las carpetas afectadas, archivos actuales y `git status`.
- Listar y leer las fichas de todos los endpoints que devuelven una incidencia completa antes de cambiar su serialización.
- Confirmar nombre y región del bucket, método de credenciales y si exige KMS o un endpoint compatible. Mantener secretos fuera de documentos y Git.
- Consultar Context7 para las APIs concretas del SDK S3, NestJS y Prisma antes de codificar.
- Revisar esquema y migraciones existentes y registrar cualquier discrepancia con la base real antes de proponer la aplicación de la migración.

## Tarea 1: persistir metadatos de fotos

**Archivos:** `backend/prisma/schema.prisma`, nueva migración SQL y `backend/src/incidents/incident.ts`.

**Interfaces:** `IncidentImage` con `id`, `incidentId`, `objectKey`, `mimeType`, `createdAt`; relación `Incident.images`. `objectKey` es interno y único; `incidentId` tiene índice.

**Criterios cubiertos:** 1, 3 y 6.

- Añadir modelo y relación Prisma sin tocar los datos de incidencias existentes; generar y validar el cliente con los comandos del backend.
- Preparar una migración incremental que cree tabla, FK e índices. Inspeccionar el SQL generado y no aplicarlo en esta fase.
- Actualizar el tipo público de imagen con `id`, `url`, `mimeType` y `createdAt`, sin exponer `objectKey`.
- Revisar el diff para verificar que no se reintrodujeron `cloudinaryId` ni bytes en PostgreSQL.

## Tarea 2: adaptar S3 y validar archivos

**Archivos:** nuevo servicio S3 y su prueba, `backend/package.json`, lockfile y `.env.example`.

**Interfaces:** métodos `subir(clave, contenido, mimeType)`, `borrar(clave)` y `firmarLectura(clave, 900)`; claves con prefijo `incidents/{incidentId}/`. Usar credenciales del entorno del backend.

**Criterios cubiertos:** 3, 4, 6 y 7.

- Escribir unitarias que comprueben bucket, clave, tipo, firma de 900 segundos y tratamiento de errores sin filtrar secretos; confirmar el fallo inicial.
- Añadir los paquetes oficiales necesarios del AWS SDK v3 y el servicio mínimo de S3; registrar `S3_BUCKET` y `S3_REGION` en el ejemplo de entorno.
- Escribir unitarias para 1 a 8 fotos, firmas JPEG/PNG/WebP, discrepancia MIME, tamaño de 5 MiB, campo desconocido y lote vacío; confirmar el fallo inicial.
- Añadir validación en el límite HTTP con almacenamiento en memoria, límites de tamaño y cantidad, sin escribir archivos en disco.
- Ejecutar las unitarias de la tarea y registrar el resultado real en este plan.

## Tarea 3: alta protegida y consistencia

**Archivos:** nuevo servicio de fotos, controlador, módulo y pruebas unitarias del servicio y controlador.

**Interfaces:** `POST /incidents/:id/images` recibe `images[]` multipart y devuelve `201` con la lista completa de imágenes; reutiliza JWT, rol y vínculo ciudadano existentes. `POST /incidents` no cambia.

**Criterios cubiertos:** 1 a 4 y 6.

- Escribir casos unitarios para incidencia propia, ajena, inexistente, JWT ausente, límite acumulado y solicitudes concurrentes; comprobar el fallo inicial.
- Implementar control de propiedad y límite dentro de una transacción que bloquee la fila de incidencia antes de insertar todas las fotos.
- Escribir casos unitarios para fallo de una subida, fallo SQL confirmado y resultado SQL ambiguo; comprobar el fallo inicial.
- Implementar subida de lote antes de la transacción, compensación limitada a las claves de la operación y registro de conciliación cuando no se pueda determinar si SQL confirmó.
- Registrar ruta, proveedores y respuestas HTTP; ejecutar las unitarias de la tarea y anotar resultados reales.

## Tarea 4: lectura autorizada y contratos

**Archivos:** servicios y controlador de incidencias, fichas de endpoints y README del backend; pruebas unitarias pertinentes.

**Interfaces:** `GET /incidents/:id` y demás respuestas completas exponen `images: { id, url, mimeType, createdAt }[]`; la URL es firmada al responder y caduca en 900 segundos. La lectura conserva las reglas de acceso actuales.

**Criterios cubiertos:** 1, 2, 6 y 7.

- Escribir unitarias que comprueben fotos propias y de operador, `404` para incidencia ajena, ausencia de `objectKey` y URL nueva al consultar de nuevo; comprobar el fallo inicial.
- Sustituir la serialización fija `images: []` por lectura Prisma y firma de URL en todas las respuestas completas afectadas.
- Crear la ficha de la ruta nueva y actualizar las fichas y ejemplos de entorno solo cuando el código corresponda al contrato.
- Ejecutar las unitarias y registrar los resultados reales.

## Tarea 5: mostrar fotos en la web

**Archivos:** servicio, tipos, galería y pruebas de `frontend-web/` indicados en el mapa; ninguna edición de `frontend-mobile/`.

**Interfaces:** el detalle autorizado usa el `url` temporal del backend; ante caducidad la web vuelve a pedir el detalle una vez y actualiza la galería.

**Criterios cubiertos:** 5 y 6.

- Escribir pruebas de lectura y caducidad en la galería, sin red ni S3 reales; comprobar el fallo inicial.
- Ajustar el servicio y componente web para usar URL HTTPS firmadas y renovar el detalle cuando sea necesario.
- Ejecutar las pruebas afectadas, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` desde `frontend-web/`; registrar resultados reales.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias backend | `pnpm test` desde `backend/` | 304 pruebas, 27 suites correctas |
| Compilación backend | `pnpm run build` desde `backend/` | Correcta antes de la revisión final |
| Lint backend | `pnpm run lint` desde `backend/` | Correcto, con 2 advertencias anteriores en pruebas ajenas |
| Calidad web | Pruebas, typecheck, lint y build desde `frontend-web/` | 55 pruebas; typecheck, lint y build correctos antes de la revisión final |
| Diff | `git diff --check` desde la raíz | Correcto para archivos seguidos antes de añadir los nuevos |
| Migración real y S3 real | PostgreSQL local y contenedor backend | Cinco migraciones al día; escritura, lectura, borrado y URL firmada S3 correctos |

- Confirmar que todos los criterios tienen evidencia, que las fichas reflejan solo lo implementado y que `frontend-mobile/` no presenta cambios.
- Registrar decisiones, desviaciones y limitaciones en este plan. No crear un informe separado.

## Confirmación de implementación

- Estado final: implementación local y conexión S3 verificadas; prueba HTTP multipart con JWT pendiente.
- Fecha de revisión: 2026-11-15.
- Resultado entregado: ruta multipart protegida, metadatos Prisma y migración incremental, lectura firmada, galería web, contratos y [guía de conexión](../../../../../docs/conexion-s3-fotos.md).

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1 a 4 y 6 a 7 | Código y unitarias de validación, propiedad, límite, compensación y firma; migración local y operaciones S3 reales | Verificado parcialmente en entorno real; falta subida HTTP con JWT |
| 5 | Galería web y renovación limitada a un intento por minuto ante fallos; pruebas del servicio HTTP | Implementado; sin prueba de interfaz automatizada |

- Comprobaciones: backend y web correctos en la revisión actual; verificar de nuevo tras dividir los commits.
- Decisiones y desviaciones: el bucket es `pulsadorurbano` en `eu-north-1`, con cifrado S3 predeterminado y backend en Docker Compose local. La identidad IAM permite operaciones sobre `incidents/*`; las credenciales están en archivos `.env` locales ignorados por Git. Se aplicaron las tres migraciones pendientes tras comprobar que la tabla antigua de imágenes y la de incidencias estaban vacías. La prueba real desde el contenedor confirmó escritura, lectura, borrado y URL firmada, con limpieza de los objetos temporales. La renovación de URL usa `onError` de la galería y un límite de un refresco por minuto; no hay prueba de interfaz porque las pruebas web actuales carecen de entorno DOM. Los PATCH preparan las imágenes antes de guardar el cambio para que un fallo al firmarlas no convierta una mutación confirmada en error HTTP. Los cambios web incluyen JWT en detalle y modificaciones de incidencia para consumir el contrato de la PR base.
- Limitaciones y pendientes: no se probó la subida HTTP multipart con un JWT ni el flujo en la aplicación móvil. `frontend-mobile/` permanece sin cambios.
