# 2026-11-09 — Plan de implementación: paginar incidencias con cursor

- Objetivo: limitar el listado a 10 elementos por defecto, máximo 100, y continuar con keyset cursor.
- Arquitectura: pipe, controlador y servicio existentes; almacenamiento en memoria.
- Herramientas: NestJS 12, TypeScript 6 y Vitest 4 instalados.
- Especificación: [Contrato y criterios](../specs/2026-11-09-paginar-incidencias-con-cursor-spec.md).
- Rama: `feature/web-typescript-migration`.
- Estado: implementado y verificado.

## Restricciones y focos

- No usar OFFSET ni cambiar el cuerpo array consumido por la app móvil.
- Orden estable `(createdAt DESC, id ASC)` y cursor ligado al filtro civicId.
- No modificar frontend, autenticación o persistencia; no crear pruebas e2e.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | backend/src/incidents/incident.ts | Tipos de cursor y página. |
| Modificar | backend/src/incidents/listar-incidencias.pipe.ts | Validar limit, cursor y filtros. |
| Modificar | backend/src/incidents/incidents.service.ts | Consultar una página por clave keyset. |
| Modificar | backend/src/incidents/incidents.controller.ts | Publicar Link y cabeceras X-* sin cambiar el array. |
| Modificar | backend/test/incidents/pipes/listar-incidencias.pipe.spec.ts | Límites y validación de cursor. |
| Modificar | backend/test/incidents/services/listar-incidencias.service.spec.ts | Continuidad, orden y filtro. |
| Actualizar | backend/docs/spec/endpoint/get-incidents/README.md | Contrato de paginación. |
| Actualizar | backend/README.md | Resumen de API. |
| Crear | backend/docs/spec/features/specs/2026-11-09-paginar-incidencias-con-cursor-spec.md | Especificación. |
| Crear | backend/docs/spec/features/plans/2026-11-09-paginar-incidencias-con-cursor-plan.md | Resultados. |

## Tareas

- [x] Revisar endpoint, cliente actual y pruebas; detectar que el cliente espera array.
- [x] Mantener el array y añadir metadatos de paginación por cabeceras.
- [x] Implementar el cursor keyset y límites en el pipe y servicio.
- [x] Añadir pruebas unitarias de paginación y validación.
- [x] Ejecutar suite completa, build, lint y diff-check.
- [x] Actualizar resultados y confirmar criterios al finalizar.

## Comprobaciones

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Unitarias | `./node_modules/.bin/vitest run` | Correcto: 18 archivos, 190 pruebas pasaron. |
| Compilación | `./node_modules/.bin/nest build` | Correcto. |
| Lint | `./node_modules/.bin/oxlint --type-aware src/ test/` | Correcto, con cuatro avisos preexistentes en archivos no modificados. |
| Diff | `git diff --check` | Correcto. |

## Confirmación de implementación

- Estado final: implementado y verificado; pendiente de valoración del usuario antes de crear commit.
- Resultado: listado con default 10, max 100 y cursor keyset; primera página 0. Mantiene la respuesta array y anuncia continuidad por Link/X-*.
- Evidencia: pruebas del pipe y servicio en `test/incidents/`; build y lint ejecutados correctamente; diff-check sin errores.
- Limitaciones: incidencias en memoria; cursor no representa autorización ni ofrece total/salto arbitrario a página; el usuario debe aprobar antes del commit.
