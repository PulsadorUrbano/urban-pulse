# Especificación: plantillas y catálogo de endpoints

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: Identificador exacto no expuesto por la sesión.

- Fecha: 2026-10-21.
- Rama: docs-crear-documentacion-basica.
- Estado: completado y verificado.

## Objetivo y decisiones

Crear spec-template.md y plan-template.md en docs/spec/templates/ de la raíz, utilizando la especificación y el plan del módulo de registro de incidencias. El usuario confirma que templates/ y endpoint/ pertenecen a docs/spec/, no a backend/docs/spec/.

La referencia se ha consultado en los documentos actuales docs/spec/specs/2026-10-19-registrar-incidencia.md y docs/spec/plans/2026-10-19-registrar-incidencia-plan.md, además de sus versiones en feature/registro-incidencia:backend/docs/spec/features/specs/2026-10-19-registrar-incidencia.md y feature/registro-incidencia:backend/docs/spec/features/plans/2026-10-19-registrar-incidencia-plan.md. Las referencias aportan estructura, no requisitos vigentes de la nueva plantilla: no copiar sus exclusiones antiguas de Prisma ni sus ejecuciones e2e.

Actualizar backend/AGENTS.md para usar las plantillas, indicar las rutas desde backend/ y desde la raíz, y describir docs/spec/endpoint/<metodo>-<ruta>/README.md. El directorio endpoint es documentación; no modifica las rutas HTTP ni la organización del código. Cada carpeta identificará un endpoint y enlazará su contrato e implementación. Crear el índice del catálogo sin inventar endpoints implementados ni abrir conexiones.

## Criterios de aceptación

- Plantillas en español con marcadores por completar, separando objetivo/contrato y pasos de implementación.
- La especificación incluye contexto, alcance, modelos Prisma, almacenamiento, contrato, errores, criterios de aceptación y verificación.
- El plan incluye restricciones, archivos, interfaces, tareas con casillas, casos unitarios y resultados reales de comprobación.
- No hay resultados históricos ni ejecuciones e2e/integración heredadas como obligaciones de las plantillas.
- AGENTS.md documenta templates/, specs/, plans/, reports/ y endpoint/, con comandos de consulta y mantenimiento.
- Se conservan los movimientos de documentos y las ediciones locales del usuario. No se modifica código, dependencias, configuración, frontend, pruebas ni datos. Sin commit ni push.

## Verificación

Creados spec-template.md, plan-template.md y endpoint/README.md; actualizado backend/AGENTS.md. Revisados los enlaces y rutas, el acceso al catálogo desde raíz/backend, los marcadores de las plantillas, la ausencia de emojis y espacios finales, y la política de solo unitarias. git diff --check correcto. Las plantillas no heredan tareas completadas ni resultados de incidencias. No corresponde ejecutar pruebas de aplicación para cambios documentales.

## Cambio posterior de ubicación y autoría

El 2026-10-21 el usuario sustituye la ubicación inicial en docs/ de la raíz por backend/docs/. Las plantillas están ahora en backend/docs/spec/templates/ y el catálogo en backend/docs/spec/endpoint/. Se incorporan metadatos de autoría; las menciones anteriores a la raíz documentan la decisión histórica, ya sustituida.
