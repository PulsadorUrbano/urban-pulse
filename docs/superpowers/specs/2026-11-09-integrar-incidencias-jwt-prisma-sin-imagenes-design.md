# 2026-11-09 — Integrar incidencias con JWT y Prisma sin almacenamiento de imágenes

## Intención

Resolver los conflictos de la PR 113 conservando el contrato de autorización de su `IncidentsController`, usando Prisma de forma asíncrona y retirando tanto el almacenamiento local como Cloudinary.

## Objetivos

- Mantener login, JWT, identidad derivada del usuario autenticado y permisos por rol.
- Usar Prisma y transacciones para incidencias, cambios de estado y prioridad.
- Retirar subida, descarga y almacenamiento de imágenes, junto con servicios, configuración, migraciones y documentación específicas de Cloudinary o del almacenamiento local.
- Mantener temporalmente `images: []` en las respuestas para no romper consumidores existentes.
- Actualizar la documentación de endpoints para describir el comportamiento real y asíncrono.

## No objetivos

- Introducir un proveedor alternativo de imágenes.
- Mantener endpoints de asignación añadidos posteriormente en `dev`; se toma el controller de la PR 113 como contrato solicitado.
- Modificar login o el formato de los JWT.

## Contrato de endpoints

- `GET /incidents`: JWT obligatorio, solo rol `civic`, sin parámetro `civicId`; consulta en Prisma las incidencias del ciudadano vinculado.
- `POST /incidents`: JWT obligatorio, solo rol `civic`, cuerpo JSON sin imágenes; el `civicId` procede de la sesión y la respuesta incluye `images: []`.
- `GET /incidents/:id`: JWT obligatorio; un ciudadano solo accede a incidencias propias y los roles `admin` y `administrative` pueden acceder a cualquiera.
- `PATCH /incidents/:id/status`: solo `admin` y `administrative`; el cuerpo contiene `status` y `cause`, y el actor del historial procede del JWT.
- `PATCH /incidents/:id/priority`: solo `admin` y `administrative`; el cuerpo contiene `priority` y `cause`, y el actor del historial procede del JWT.
- Se elimina `GET /uploads/incidents/:id/:archivo`.
- Se eliminan los endpoints de asignación que no forman parte del controller de la PR 113.

## Deuda técnica aceptada

`Incident.images` permanece en las respuestas como un array siempre vacío aunque ya no exista entrada, relación ni almacenamiento de imágenes. Se conserva únicamente por compatibilidad con los frontends actuales. Debe retirarse del contrato, tipos y consumidores cuando móvil y web hayan migrado y exista una versión coordinada de la API.

El servidor rechazará propiedades desconocidas, incluida `images`, en la creación de incidencias. No aceptará archivos para ignorarlos silenciosamente.

## Enfoques considerados

1. **Campo de respuesta vacío y sin entrada de imágenes — elegido.** Mantiene compatibilidad de lectura sin conservar infraestructura muerta.
2. Aceptar imágenes e ignorarlas. Descartado porque presentaría una falsa confirmación de almacenamiento.
3. Eliminar inmediatamente `images` de las respuestas. Descartado porque rompería consumidores sin una migración coordinada.

## Comprobación

Las pruebas deben cubrir autorización, propiedad, actor derivado del JWT, persistencia Prisma asíncrona, transacciones y el contrato `images: []`. La documentación y Swagger no deben anunciar multipart, archivos, Cloudinary ni almacenamiento local.
