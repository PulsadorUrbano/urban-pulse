# 2026-11-09 — Consultar incidencias con cursor

- Método y ruta: GET /incidents.
- Última revisión: 2026-11-09.
- Estado: implementado; verificado mediante pruebas unitarias, compilación y lint. No se han ejecutado peticiones HTTP de integración.
- Finalidad: consultar resúmenes paginados, opcionalmente filtrados por ciudadano.

## Contrato

La primera solicitud comienza en la página 0: GET /incidents. `limit` es opcional, por defecto 10 y admite valores de 1 a 100. Para continuar, enviar el `nextCursor` recibido como `cursor`; no se aceptan números de página como desplazamiento. `civicId` es opcional y, si se usa, debe repetirse en las solicitudes siguientes. No hay cuerpo.

Si se proporciona civicId, debe ser un único UUID no vacío. UUID mal formado, valores repetidos, valores anidados, límites inválidos, cursor inválido u otros parámetros devuelven 400. Se compara el UUID sin distinguir mayúsculas/minúsculas.

## Respuesta

200 con el array de resúmenes existente, para conservar compatibilidad. Cada resumen contiene id (UUID), title, status y createdAt (ISO). Las cabeceras `X-Page` y `X-Limit` indican la página y su tamaño; la primera página es 0. Si hay más resultados, `X-Next-Cursor` y `Link: rel="next"` permiten continuar. Orden: fecha de creación descendente; id ascendente para empates. No incluye civicId, ubicación, imágenes, historial ni motivos de cambios.

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

DEUDA-27-01 sigue abierta: no hay autenticación ni autorización. El listado global y el filtrado por civicId están disponibles sin identidad verificada. civicId es un filtro del cliente; introducir el identificador de otra persona permite consultar su listado. Este prototipo no garantiza privacidad de los listados. La resolución pendiente está en la especificación.

El listado consulta incidencias en PostgreSQL y aplica el cursor keyset `(createdAt DESC, id ASC)` en la consulta, con un máximo de `limit + 1` filas. No lee bytes de Cloudinary ni calcula un total global. Los registros sobreviven al reinicio; el cursor solo indica desde qué fila continuar y no acredita identidad. El cuerpo permanece como array y no se exponen consultas de auditoría.

PostgreSQL no disponible devuelve 503. No hay paginación ni historial en esta respuesta.

## Referencias

- [Especificación de paginación](../../features/specs/2026-11-09-paginar-incidencias-con-cursor-spec.md).
- [Plan y confirmación](../../features/plans/2026-11-09-paginar-incidencias-con-cursor-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación de consulta](../../../../src/incidents/listar-incidencias.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Unitarias del servicio](../../../../test/incidents/services/listar-incidencias.service.spec.ts).
- [Unitarias de validación](../../../../test/incidents/pipes/listar-incidencias.pipe.spec.ts).
- [Diseño integrado](../../features/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md)
