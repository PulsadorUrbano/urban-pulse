# Sesión - 2026-11-17 - Docs 17-11-26 - Reorganizar documentación del backend

- Desarrollador responsable: CodeJose21 (asignado al issue).
- Asistente de IA: Codex.
- Modelo de IA: identificador y versión exactos no disponibles en la sesión.

## Contexto

El [issue #145](https://github.com/PulsadorUrbano/urban-pulse/issues/145) solicita reorganizar las carpetas de documentación del backend tomando como referencia frontend-mobile. Se contrastó también la estructura de frontend-web.

## Alcance

Cambio exclusivamente documental: reubicar 53 documentos, actualizar referencias, instrucciones, índices y plantillas. No se modifican contratos HTTP, código, dependencias ni servicios.

## Decisiones clave

- Agrupar las especificaciones y los planes en 27 carpetas spec/features/DD-MM-YY-nombre-feature/ con spec.md y plan.md cuando existen ambos. Conservar documentos sin pareja sin inventar contenido.
- Unificar en la misma carpeta la especificación y el plan de objetos Prisma, cuyos nombres originales diferían en singular/plural.
- Usar spec/refactor/independent/ para la refactorización transversal existente y spec/bugs/todo.md para futuros bugs pendientes, sin deducirlos de documentos antiguos.
- Conservar los dos informes históricos en old/spec/reports/. Mantener las decisiones históricas y señalar las convenciones de carpetas sustituidas.
- Mantener el catálogo de endpoints, los diagramas y el SQL de referencia en su ubicación.
- Para cambios solo documentales, usar esta nota, siguiendo el criterio del módulo web.

## Archivos

- [Índice del backend](README.md) y [organización documental](spec/README.md).
- [Guía del backend](../AGENTS.md) y [plantillas](spec/templates/).
- spec/features/, spec/refactor/, spec/bugs/, spec/endpoint/ y [archivo histórico](old/README.md).
- Referencias documentales desde docs/, frontend-mobile/docs/ y frontend-web/docs/.

## Checklist de la sesión

- [x] Leer el issue, sus comentarios y las instrucciones del repositorio.
- [x] Contrastar las convenciones de ambos frontends.
- [x] Reubicar todos los documentos conservando su contenido histórico.
- [x] Actualizar enlaces y referencias, incluidas las fichas de autenticación que ya tenían rutas incorrectas.
- [x] Adaptar las guías y plantillas; añadir plantillas de bug y refactor propias del backend.
- [x] Comprobar rutas y enlaces relativos de backend/docs/; excluir marcadores de plantilla y enlaces spec.md/plan.md que se resuelven al copiar las plantillas a una funcionalidad.
- [x] Ejecutar git diff --check.

## Documentos actualizados

Los índices enlazan la estructura vigente. Las referencias cruzadas apuntan a las nuevas ubicaciones. La PR se prepara sobre la rama de #170. Se conservan sus versiones documentales remotas y se reorganizan solo los documentos existentes en esa base; la documentación local de S3, CloudFront y CI pendiente de integración queda fuera de esta PR. El cambio previo del usuario en la guía S3 permanece local.

## Estado / Verificación

Implementado. Revisión de enlaces locales de backend/docs/ sin destinos inexistentes; estructura sin las carpetas antiguas features/specs/, features/plans/, refactors/ ni reports/ fuera del archivo histórico. git diff --check sin errores. No se ejecutan build, lint, pruebas ni servicios por tratarse solo de documentación.

## Pendiente / diferido

No se crean parejas spec/plan retrospectivas ni se reescriben resultados históricos. Fuera del alcance: el enlace preexistente de CONTRIBUTING.md a backend/docs/adr/ (los ADR están en docs/adr/). Se publica un commit documental en una rama independiente, con referencia de cierre al issue #145; no se fusiona la PR.

## Traslado a dev · 2026-11-20

- Se recuperó la reorganización de la PR #181 después de integrar la #185. Las fichas HTTP conservan los contratos vigentes en `dev`.
- Se agruparon también los documentos de S3, CloudFront e idempotencia. Sus enlaces internos apuntan a las nuevas ubicaciones.
