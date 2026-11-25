# Organización de la documentación del backend

Se sigue la estructura de [frontend-mobile](../../../frontend-mobile/docs/spec/README.md) y [frontend-web](../../../frontend-web/docs/spec/README.md), conservando el catálogo de endpoints y las referencias propias del backend.

## Estructura

| Ruta desde backend/docs/ | Contenido |
| --- | --- |
| spec/features/YY-MM-DD-nombre-feature/spec.md | Alcance, contratos y criterios de aceptación. |
| spec/features/YY-MM-DD-nombre-feature/plan.md | Tareas, decisiones, verificaciones y confirmación. |
| spec/bugs/nombre-feature/YY-MM-DD-asunto.md | Síntoma, diagnóstico, corrección y comprobaciones. |
| spec/bugs/todo.md | Bugs pendientes por funcionalidad. |
| spec/refactor/nombre-feature/YY-MM-DD-asunto.md | Refactorizaciones de una funcionalidad. |
| spec/refactor/independent/YY-MM-DD-asunto.md | Refactorizaciones independientes. |
| spec/templates/ | Plantillas de especificación, plan, bug y refactor. |
| spec/endpoint/ | Fichas por método y ruta HTTP. |
| AAAA-MM-DD-NNN-nombre.md | Nota de sesión; NNN empieza en 001 cada día. |
| old/spec/reports/ | Informes históricos conservados como referencia. |
| c4/ y migrations/ | Diagramas y SQL de referencia; las migraciones ejecutables siguen en prisma/migrations/. |

## Funcionalidades

1. Crear una carpeta con la fecha de inicio en formato YY-MM-DD y una descripción concreta.
2. Crear spec.md desde la [plantilla de especificación](templates/spec-template.md) y plan.md desde la [plantilla de plan](templates/plan-template.md).
3. Mantener requisitos y contratos en la especificación; tareas, decisiones y resultados reales en el plan.
4. Actualizar el [catálogo de endpoints](endpoint/README.md) cuando cambie un contrato.
5. Completar la confirmación en el mismo plan. No crear tasks.md ni informes de cierre separados.

Las carpetas migradas conservan sus fechas originales. Los documentos que no tenían pareja siguen sin ella: no se inventan especificaciones, planes ni resultados retrospectivos. Su contenido y estado histórico se conservan; una carpeta no acredita por sí sola implementación vigente.

## Bugs y refactorizaciones

Usar la [plantilla de bug](templates/bug-template.md) o la [plantilla de refactor](templates/refactor-template.md). Agrupar por funcionalidad y añadir los documentos nuevos a su carpeta existente. Usar refactor/independent/ para cambios transversales. Registrar los bugs aplazados en [bugs/todo.md](bugs/todo.md) y marcarlos al resolverlos.

## Cambios documentales y notas de sesión

Los cambios solo de documentación se registran en una nota de sesión, sin especificación ni plan adicionales. Incluir: contexto, alcance, decisiones clave, archivos, checklist de la sesión, documentos actualizados, estado/verificación y pendiente/diferido. Enlazar los documentos correspondientes sin duplicar su detalle granular.

En los nuevos documentos, registrar debajo del título el desarrollador responsable, el asistente de IA y el modelo exacto. Si un dato no está disponible, declararlo; no atribuir retrospectivamente autorías a documentos históricos.

## Verificación

Para documentación, comprobar enlaces relativos, rutas y git diff --check. Para código o dependencias, ejecutar los comandos del [AGENTS.md](../../AGENTS.md): pnpm run build, pnpm run lint y pnpm test desde backend/. Registrar los resultados reales en el documento del cambio. No ejecutar servicios ni pruebas e2e para verificar texto.
