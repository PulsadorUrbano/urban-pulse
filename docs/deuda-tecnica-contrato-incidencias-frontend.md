# Deuda técnica: migración de los frontends al contrato autenticado de incidencias

- Estado: abierta y aceptada.
- Registrada: 2026-11-09.
- Alcance conservado: no se modifica el frontend móvil en la integración de la PR 113.

## Incompatibilidad actual

El backend activo exige JWT Bearer y deriva el ciudadano de la sesión. `POST /incidents` acepta JSON, rechaza `civicId`, `images` y multipart; `GET /incidents` no admite el parámetro `civicId`.

El servicio móvil existente todavía construye multipart, envía `civicId`, adjunta imágenes y consulta `GET /incidents?civicId=...`. Por tanto, ese camino real no es compatible con el contrato integrado: las peticiones de alta o listado recibirán 400 después de superar la autenticación, y recibirán 401 si no incluyen Bearer. El fallback al mock permanece sin cambios, pero no demuestra integración con el backend.

## Migración pendiente

En un cambio coordinado del móvil y, si procede, de la web:

1. Adjuntar el JWT Bearer en todas las rutas de incidencias.
2. Enviar `POST /incidents` como `application/json`, sin `civicId` ni imágenes.
3. Consultar `GET /incidents` sin query.
4. Tratar `images` como un array siempre vacío y retirar selección, envío y visualización de fotos del flujo real.
5. Cuando todos los consumidores hayan migrado, retirar `images` del contrato, tipos y respuestas del backend.

## Decisión temporal

Se conserva `images: []` en las respuestas para reducir la rotura de lectura, pero no se aceptan imágenes de entrada ni se simula que fueron almacenadas. No se añade una capa de compatibilidad que acepte y descarte archivos porque produciría confirmaciones engañosas.

Referencias: [contrato de alta](../backend/docs/spec/endpoint/post-incidents/README.md), [contrato de listado](../backend/docs/spec/endpoint/get-incidents/README.md) y [diseño aprobado](superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md).
