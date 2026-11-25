# Documentación del backend

La [guía de organización](spec/README.md) define la estructura compartida con los módulos frontend: una carpeta por funcionalidad con spec.md y plan.md, documentos agrupados de bugs y refactorizaciones, plantillas y notas de sesión.

| Referencia | Contenido |
| --- | --- |
| [Guía del backend](../AGENTS.md) | Convenciones y comandos del componente. |
| [Organización documental](spec/README.md) | Ubicaciones, nombres y flujos de trabajo. |
| [Funcionalidades](spec/features/) | Especificaciones y planes agrupados por fecha y cambio. |
| [Bugs pendientes](spec/bugs/todo.md) | Registro de fallos aplazados. |
| [Refactorizaciones](spec/refactor/) | Cambios estructurales por funcionalidad o independientes. |
| [Plantillas](spec/templates/) | Especificación, plan, bug y refactor. |
| [Catálogo de endpoints](spec/endpoint/README.md) | Contratos HTTP y referencias al código. |
| [Archivo histórico](old/README.md) | Informes anteriores conservados para trazabilidad. |
| [Diagramas](c4/) y [SQL de referencia](migrations/) | Referencias de arquitectura y datos. |

## Registro de incidencias

- [Especificación de adaptación](spec/features/26-10-21-adaptar-documentacion-registro-incidencias/spec.md).
- [Plan y confirmación](spec/features/26-10-21-adaptar-documentacion-registro-incidencias/plan.md).

## Issue #27: consulta por ciudadano

- [Especificación](spec/features/26-10-23-consultar-incidencias-por-ciudadano/spec.md).
- [Plan y confirmación](spec/features/26-10-23-consultar-incidencias-por-ciudadano/plan.md).
- [Contrato GET /incidents](spec/endpoint/get-incidents/README.md).

Los documentos conservan las decisiones de su fecha. Para conocer los contratos actuales, consultar el catálogo y el código de la rama; la documentación no acredita una conexión probada.
