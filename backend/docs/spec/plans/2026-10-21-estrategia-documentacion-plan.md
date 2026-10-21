# Plan: estrategia documental de dos documentos

- Especificación: [Requisitos](../specs/2026-10-21-estrategia-documentacion.md).
- Estado: implementado y verificado.

## Tareas

- [x] Actualizar backend/AGENTS.md con el flujo especificación, plan, ejecución y confirmación en el mismo plan.
- [x] Ajustar spec-template.md y plan-template.md; eliminar obligaciones de informes y archivos de tareas separados.
- [x] Explicitar la prohibición de npm install y npm i.
- [x] Comprobar enlaces, rutas y git diff --check; registrar el resultado aquí.

## Confirmación de implementación

- Estado final: implementado y verificado.
- Fecha: 2026-10-21.
- Resultado: AGENTS.md y las dos plantillas requieren únicamente especificación y plan. El progreso y la confirmación permanecen en el plan original.

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| Dos documentos por cambio | Guía y plantillas indican especificación y plan. | Cumplido |
| Confirmación en el plan | plan-template.md incluye Confirmación de implementación, evidencia por criterio y pendientes. | Cumplido |
| Sin documentos adicionales | Eliminadas las instrucciones de informes, tasks.md y roadmap de la guía y plantillas. | Cumplido |
| Prohibición de instalación | Guía y plantilla de plan prohíben npm install y npm i; se mantiene pnpm install prohibido. | Cumplido |
| Verificación documental | Enlaces locales de esta pareja correctos; revisión de consistencia y git diff --check correctos. | Cumplido |

No se ejecutan build, lint ni pruebas de aplicación porque el cambio solo afecta documentación. No se eliminan documentos históricos. Sin cambios de código, dependencias, commits o push. No quedan pendientes de este cambio documental.

## Ajuste final de redacción

- [x] Reducir la guía a cuatro indicaciones documentales y eliminar el flujo repetido y las instrucciones de autoría de AGENTS.md.
- [x] Mantener los campos de autoría en la plantilla y la prohibición de npm install.
- [x] Releer el archivo guardado y verificar git diff --check.

Confirmación: simplificación implementada y verificada; sin cambios de código ni documentos nuevos.
