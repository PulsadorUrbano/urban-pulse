# 2026-10-21 — Consultar el catálogo de categorías

- Método y ruta: GET /categories.
- Estado: contrato comprobado por lectura del código; conectividad no probada en esta adaptación documental.
- Última revisión: 2026-10-21.

## Entrada, respuesta y errores

Sin cuerpo, filtros ni paginación. Respuesta 200 con array sin envoltorio: cada elemento contiene id UUID, name y createdAt ISO. Ejemplo de forma: [{"id":"20ac442e-0f00-4fe4-bad3-61c8e8e0bff5","name":"Iluminación","createdAt":"2026-10-21T08:00:00.000Z"}]. El UUID y la fecha del ejemplo no son valores fijos.

El catálogo inicial contiene Iluminación, Limpieza, Vía pública, Movilidad y Zonas verdes. Mantiene orden de inserción, devuelve copias y puede incluir categorías añadidas por CategoriesService.resolve. El flujo actual POST /incidents no llama a ese método para resolver automáticamente una categoría.

No hay errores de entrada específicos al no recibir parámetros. No requiere autenticación.

## Almacenamiento y límites

Catálogo en memoria del proceso, con IDs generados al inicializarlo. Se reinicia con la aplicación. No hay base de datos activa ni garantía de persistencia duradera.

## Referencias

- [Especificación vigente](../../features/specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).
- [Controlador](../../../../src/incidents/categories.controller.ts).
- [Servicio](../../../../src/incidents/categories.service.ts).
