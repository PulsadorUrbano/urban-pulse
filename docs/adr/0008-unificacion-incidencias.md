# ADR 0008: Unificación de reportes en una incidencia normalizada

- Estado: Propuesto, pendiente de revisión.
- Fecha de registro: 2026-11-27.
- Relacionados: [Diseño de unificación de incidencias](../disenyo/disenyo-unificacion-incidencias.md).

## Contexto

Varios ciudadanos pueden reportar un mismo problema. Actualmente cada reporte se guarda como una incidencia con su ciudadano, ubicación e historial. Si se gestionan por separado, se puede trabajar varias veces sobre el mismo problema.

Se necesita una única incidencia normalizada que agrupe los reportes relacionados, manteniendo la trazabilidad de cada uno. La funcionalidad todavía no está implementada.

## Decisión propuesta

Separar los reportes de los ciudadanos de la incidencia normalizada que gestiona el equipo municipal. Cada reporte conservará sus datos y tendrá como máximo una relación activa con una incidencia normalizada; una incidencia podrá reunir varios reportes.

Se propone conservar un historial de las uniones y separaciones, incluyendo quién las realiza y cuándo. También se propone que el personal municipal confirme las uniones y pueda corregirlas, pero este flujo está pendiente de validación.

La adaptación de los registros actuales y el reparto de datos entre ambos conceptos se definirán antes de implementar, conservando los historiales existentes.

## Alternativas consideradas

- **Borrar los reportes duplicados:** deja un solo registro, pero pierde información y trazabilidad. Además, la base de datos actual impide borrar incidencias.
- **Enlazar las incidencias actuales entre sí:** permite reutilizar los registros, pero obliga a identificar un registro principal y controlar que no haya relaciones contradictorias.
- **Separar reportes e incidencia normalizada:** permite conservar cada reporte y gestionar el problema común una sola vez. Requiere cambios en el modelo, el backend y los clientes. Es la alternativa propuesta.

## Consecuencias

Positivas:

- Se puede gestionar una única incidencia para varios reportes del mismo problema.
- Se conserva la información aportada por cada ciudadano y la relación con el caso común.
- El historial permite revisar y corregir uniones equivocadas.

Negativas y riesgos:

- Hay que adaptar datos existentes, contratos, permisos, listados y métricas.
- Las uniones incorrectas pueden mezclar problemas diferentes y requieren un mecanismo de corrección.
- Habrá que evitar que la consulta de una incidencia muestre datos personales de otros ciudadanos sin autorización.
- Quedan por decidir el momento de creación de la incidencia normalizada, los roles autorizados y el tratamiento de estados, asignaciones y fotos cuando se unan casos existentes.
