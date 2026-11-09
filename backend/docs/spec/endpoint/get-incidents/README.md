# 2026-11-09 — Consultar todas las incidencias o filtrar por ciudadano

- Método y ruta: GET /incidents.
- Última revisión: 2026-11-09.
- Estado: implementado; verificado mediante pruebas unitarias, compilación y lint. No se han ejecutado peticiones HTTP de integración.
- Finalidad: consultar los resúmenes de todas las incidencias o limitar el resultado a un ciudadano.

## Entrada y validación

Sin parámetros devuelve todas las incidencias. Ejemplo de filtro opcional: GET /incidents?civicId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa. Sin cuerpo.

Si se proporciona civicId, debe ser un único UUID no vacío. UUID mal formado, valores repetidos, valores anidados u otros parámetros devuelven 400. Se compara el UUID sin distinguir mayúsculas/minúsculas.

## Respuesta

200 con array sin envoltorio. Cada resumen contiene únicamente id (UUID), title (texto), status (estado actual) y createdAt (ISO). Sin coincidencias devuelve []. Orden: createdAt descendente; id ascendente para empates. No incluye civicId, ubicación, imágenes, historial ni motivos de cambios.

~~~json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "title": "Farola apagada",
    "status": "reported",
    "createdAt": "2026-10-23T10:00:00.000Z"
  }
]
~~~

Los valores son ilustrativos, no datos semilla ni identificadores garantizados. Las respuestas son objetos nuevos y no permiten modificar los registros del Map.

## Identidad y almacenamiento

DEUDA-27-01 sigue abierta: no hay autenticación ni autorización. El listado global y el filtrado por civicId están disponibles sin identidad verificada. civicId es un filtro del cliente; introducir el identificador de otra persona permite consultar su listado. Este prototipo no garantiza privacidad de los listados. La resolución pendiente está en la especificación.

Se conserva el Map privado del proceso y el almacenamiento local de imágenes. El listado no lee ni escribe esos archivos. Las incidencias se pierden al reiniciar; no hay base de datos activa, paginación ni consultas de auditoría.

El estado actual puede ser reported, validated o rejected; no devuelve historial, motivos ni actor de auditoría. Los cambios se describen en [validar o rechazar incidencias](../patch-incidents-id-status/README.md).

## Referencias

- [Especificación y deuda técnica](../../features/specs/2026-11-09-consultar-todas-las-incidencias-spec.md).
- [Plan y confirmación](../../features/plans/2026-11-09-consultar-todas-las-incidencias-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación de consulta](../../../../src/incidents/listar-incidencias.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Unitarias del servicio](../../../../test/incidents/services/listar-incidencias.service.spec.ts).
- [Unitarias de validación](../../../../test/incidents/pipes/listar-incidencias.pipe.spec.ts).
