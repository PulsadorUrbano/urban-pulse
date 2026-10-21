# Documentación del backend

La documentación se mantiene en backend/docs/. Los cambios nuevos generan una especificación y un plan; las tareas, comprobaciones y confirmación de implementación quedan en ese mismo plan.

- [Guía del backend](../AGENTS.md).
- [Plantilla de especificación](spec/templates/spec-template.md).
- [Plantilla de plan](spec/templates/plan-template.md).
- Especificaciones: spec/features/specs/.
- Planes: spec/features/plans/.
- [Catálogo de endpoints](spec/endpoint/README.md).
- ADR: adr/; diagramas: c4/; referencias SQL: migrations/.

Los nombres y títulos nuevos deben incluir fecha AAAA-MM-DD y descripción concreta de la acción. Ejemplo: 2026-10-21-adaptar-documentacion-registro-incidencias-plan.md.

## Registro de incidencias

- [Especificación vigente](spec/features/specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md).
- [Plan y confirmación de adaptación](spec/features/plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).

Los documentos anteriores se conservan con una nota de referencia histórica. spec/reports/ contiene informes anteriores; no se crean informes ni archivos de tareas separados para los cambios nuevos. El catálogo documenta el estado leído en el código; no acredita una conexión probada.
