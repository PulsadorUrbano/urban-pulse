# 2026-10-20 — Especificación: Exponer el catálogo de categorías

> Referencia histórica: conserva las decisiones y resultados de su fecha. Las instrucciones antiguas de pruebas e2e, informes o commits no son obligaciones actuales. Consultar la [especificación vigente](../specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md), el [plan de adaptación](../plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md) y las fichas de [endpoints](../../endpoint/README.md).

- Desarrollador responsable original: no registrado.
- Asistente de IA original: no registrado en el documento.
- Modelo de IA que creó la especificación: no registrado; no se infiere retrospectivamente.

- Fecha: 2026-10-20.
- Rama: feature/registro-incidencia.
- Estado: implementado y verificado.

## Contrato

Exponer GET /categories con 200 OK y un array JSON de objetos con id (UUID), name y createdAt (ISO 8601). Reutilizar CategoriesService y sus cinco categorias iniciales: Iluminacion, Limpieza, Via publica, Movilidad y Zonas verdes, conservando los nombres originales con tildes. Incluir tambien categorias que el servicio haya resuelto y creado posteriormente. Mantener el orden de insercion y devolver copias, no referencias mutables al catalogo.

## Diseno minimo

Anadir findAll(): Category[] al servicio existente y un CategoriesController registrado en IncidentsModule. Documentar la respuesta en Swagger y README. El recurso es publico y temporal, sin filtros ni paginacion. No cambiar el flujo de incidentes, frontend, persistencia, autenticacion ni dependencias. Los identificadores se conservan durante la vida del proceso, no entre reinicios.

## Aceptacion

- GET /categories devuelve el catalogo existente con 200 y sin envoltorio.
- Repetir GET devuelve los mismos datos mientras no cambie el catalogo.
- El servicio incluye nuevas categorias resueltas y protege su estado de mutaciones externas.
- Swagger anuncia un array con id, name y createdAt.
- La aplicacion completa registra la ruta sin base de datos.

## Verificacion e informe

Las pruebas nuevas fallaron inicialmente por ausencia de findAll y por GET /categories devolviendo 404. Tras implementar el endpoint: build correcto, lint correcto con dos avisos Unicode ya existentes, 37 pruebas unitarias y 12 e2e correctas.

El endpoint reutiliza CategoriesService.findAll, mantiene identificadores entre peticiones y devuelve copias del catalogo. El test HTTP arranca AppModule sin base de datos y comprueba el array y su esquema Swagger. README y guia backend actualizados. No se modificaron dependencias ni frontend. Se conservaron los cambios locales anteriores. No se crearon commits ni se hizo push.
