# 2026-11-09 — Consultar incidencias con cursor

- Método y ruta: GET /incidents.
- Última revisión: 2026-11-25.
- Estado: implementado.
- Acceso: `Authorization: Bearer <JWT>`.
- Finalidad: consultar resúmenes paginados con filtros combinables.

## Contrato

La primera solicitud comienza en la página 0. Administración puede usar `GET /incidents`. Un solicitante con perfil ciudadano utiliza `GET /incidents?civicId=<UUID propio>`. `limit` es opcional, por defecto 10 y admite valores de 1 a 100. Para continuar, enviar el `nextCursor` recibido como `cursor`; no se aceptan números de página como desplazamiento. `civicId` es opcional para `admin` y `administrative`. Cuando se usa, debe repetirse en las solicitudes siguientes. No hay cuerpo.

Si se proporciona civicId, debe ser un único UUID no vacío. UUID mal formado, valores repetidos, valores anidados, límites inválidos, cursor inválido u otros parámetros devuelven 400. Se compara el UUID sin distinguir mayúsculas/minúsculas.

Se admiten además los filtros opcionales `status` (cualquier valor de `IncidentStatus`), `from` y `to` (fechas calendario `AAAA-MM-DD`), `order` (`newest` por defecto u `oldest`), `priority` (`low`, `medium` o `high`) y `categoryId` (UUID). Se pueden combinar con `civicId` y entre sí; la consulta usa intersección. `from` incluye las 00:00 UTC de ese día; `to` incluye el día completo hasta antes de las 00:00 UTC del día siguiente. Fechas inexistentes, `from` posterior a `to`, valores no permitidos, repetidos, nulos o anidados devuelven 400. `categoryId` se compara sin distinguir mayúsculas/minúsculas.

El cursor conserva todos los filtros normalizados y `civicId`; cada petición de continuación debe repetirlos. Si cambia alguno, devuelve 400. Los cursores anteriores a este contrato deben reiniciarse desde la primera página.

## Respuesta

200 con el array de resúmenes existente, para conservar compatibilidad. Cada resumen contiene id (UUID), title, status y createdAt (ISO). Las cabeceras `X-Page` y `X-Limit` indican la página y su tamaño; la primera página es 0. Si hay más resultados, `X-Next-Cursor` y `Link: rel="next"` permiten continuar; `Link` conserva los filtros. Orden: fecha de creación descendente con `newest` o ascendente con `oldest`; id ascendente para empates. No incluye civicId, ubicación, imágenes, historial ni motivos de cambios.

~~~json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "title": "Farola apagada",
    "status": "reported",
    "createdAt": "2026-11-09T10:00:00.000Z"
  }
]
~~~

Los valores son ilustrativos, no datos semilla ni identificadores garantizados. Las respuestas son objetos nuevos y no permiten modificar los registros persistidos.

## Identidad y almacenamiento

Los roles `admin` y `administrative` pueden consultar el listado global o filtrar por ciudadanía. `civic`, `department`, `team` y `technician` requieren un perfil ciudadano vinculado y su `civicId` propio para consultar. Un JWT inválido o una identidad inactiva devuelve 401. Un rol inadecuado, la falta de perfil ciudadano o un filtro propio ausente o ajeno devuelve 403.

El listado consulta incidencias en PostgreSQL y aplica los filtros y el cursor keyset `(createdAt, id ASC)` en la consulta, con un máximo de `limit + 1` filas. No lee bytes de Cloudinary ni calcula un total global. Los registros sobreviven al reinicio; el cursor solo indica desde qué fila continuar y no acredita identidad. El cuerpo permanece como array y no se exponen consultas de auditoría.

PostgreSQL no disponible devuelve 503. La respuesta no incluye historial.

## Referencias

- [Especificación de paginación](../../features/26-11-09-paginar-incidencias-con-cursor/spec.md).
- [Plan y confirmación](../../features/26-11-09-paginar-incidencias-con-cursor/plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación de consulta](../../../../src/incidents/listar-incidencias.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Unitarias del servicio](../../../../test/incidents/services/listar-incidencias.service.spec.ts).
- [Unitarias de validación](../../../../test/incidents/pipes/listar-incidencias.pipe.spec.ts).
- [Diseño integrado](../../features/26-11-09-integrar-incidencias-jwt-prisma-sin-imagenes/spec.md)
- [Especificación de filtros](../../features/26-11-25-filtrar-listado-incidencias/spec.md).
- [Plan y comprobaciones de filtros](../../features/26-11-25-filtrar-listado-incidencias/plan.md).
