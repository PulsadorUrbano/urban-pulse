# 2026-11-09 — Plan de implementación: consultar todas las incidencias

- Objetivo: consultar resúmenes de todas las incidencias en GET /incidents y conservar el filtro opcional civicId.
- Arquitectura: controlador, pipe y servicio de incidencias existentes; PostgreSQL mediante Prisma.
- Herramientas: NestJS 12, TypeScript 6, Vitest 4; dependencias ya instaladas.
- Especificación: [Contrato y criterios](../specs/2026-11-09-consultar-todas-las-incidencias-spec.md).
- Rama: `feature/web-typescript-migration`.
- Estado: implementado y verificado.

## Restricciones generales

- Mantener el resumen existente y la compatibilidad de GET /incidents?civicId=<UUID>.
- No añadir persistencia, autenticación, paginación, modelos Prisma o cambios de frontend.
- No crear ni ejecutar pruebas e2e.

## Focos de revisión

La consulta vacía debe listar todos los registros sin filtrar; el filtro presente mantiene validación UUID y normalización. Ambos caminos deben conservar el orden, proyección pública y aislamiento del servicio.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | backend/src/incidents/incidents.controller.ts | Seleccionar el listado global o el filtrado. |
| Modificar | backend/src/incidents/listar-incidencias.pipe.ts | Aceptar consulta vacía y validar civicId opcional. |
| Modificar | backend/src/incidents/incidents.service.ts | Listar todos los resúmenes con orden compartido. |
| Modificar | backend/test/incidents/pipes/listar-incidencias.pipe.spec.ts | Cubrir la consulta vacía. |
| Modificar | backend/test/incidents/services/listar-incidencias.service.spec.ts | Cubrir el listado global. |
| Actualizar | backend/docs/spec/endpoint/get-incidents/README.md | Documentar contrato global y filtrado. |
| Actualizar | backend/docs/spec/endpoint/README.md y backend/README.md | Mantener el catálogo y resumen API coherentes. |
| Crear | backend/docs/spec/features/specs/2026-11-09-consultar-todas-las-incidencias-spec.md | Especificación. |
| Crear | backend/docs/spec/features/plans/2026-11-09-consultar-todas-las-incidencias-plan.md | Seguimiento y resultados. |

## Preparación

- [x] Leer guías, endpoint existente, pruebas, dependencias y estado inicial de Git.
- [x] Comprobar versiones y rama actual; no se modifica una API/configuración de biblioteca.
- [x] Registrar resultados de pruebas, compilación, lint y diff.

## Tarea 1: ampliar GET /incidents

**Archivos:** controlador, pipe, servicio y pruebas unitarias listados arriba.

**Interfaces:** el pipe devuelve civicId normalizado o undefined; el servicio ofrece `listarPagina()` con filtro opcional y respuesta de resumen.

**Criterios cubiertos:** 1, 2, 3 y 4.

- [x] Añadir casos unitarios para consulta vacía, todos los ciudadanos, orden, lista vacía y aislamiento.
- [x] Implementar el cambio mínimo conservando civicId como filtro opcional.
- [x] Ejecutar pruebas pertinentes y comprobaciones completas con los binarios locales.

## Tarea 2: actualizar contrato y documentación

**Archivos:** ficha GET /incidents, catálogo, README backend, esta especificación y plan.

**Interfaces:** GET /incidents sin consulta devuelve todas las incidencias; con civicId conserva el filtro.

**Criterios cubiertos:** 4 y 5.

- [x] Documentar ausencia de autenticación/autorización y almacenamiento en PostgreSQL.
- [x] Actualizar catálogo y descripción de la API.
- [x] Revisar enlaces, diff y reflejar resultados reales.

## Comprobaciones finales

Ejecutar desde `backend/` salvo indicación en la tabla.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | `./node_modules/.bin/vitest run` | Correcto: 18 archivos y 185 pruebas pasaron. |
| Compilación | `./node_modules/.bin/nest build` | Correcto, después de generar el cliente Prisma. |
| Lint | `./node_modules/.bin/oxlint --type-aware src/ test/` | Correcto, con cuatro avisos existentes en archivos ajenos al cambio. |
| Diff, desde la raíz | `git diff --check` | Correcto, sin errores. |

- [x] Mantener catálogo y contratos sincronizados.
- [x] Confirmar los criterios con pruebas y comprobaciones ejecutadas.
- [x] No modificar consumidores, credenciales ni servicios externos.

## Confirmación de implementación

- Estado final: implementado y verificado.
- Fecha de revisión: 2026-11-09.
- Resultado entregado: GET /incidents acepta consulta vacía y devuelve resúmenes de todas las incidencias; civicId sigue filtrando por ciudadano.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Listado global y orden | Pruebas unitarias en `test/incidents/services/listar-incidencias.service.spec.ts` | Cumplido |
| 2. Compatibilidad y validación | Pruebas del filtro existente y `test/incidents/pipes/listar-incidencias.pipe.spec.ts` | Cumplido |
| 3. Respuesta aislada | Prueba unitaria de aislamiento del listado global | Cumplido |
| 4. Lista vacía y acceso documentado | Prueba de lista vacía y ficha `docs/spec/endpoint/get-incidents/README.md` | Cumplido |
| 5. Documentación actualizada | Catálogo y `backend/README.md` | Cumplido |

- Comprobaciones: el entorno no tiene `npm`, por lo que `npm test` no pudo ejecutarse directamente. Se ejecutaron los binarios locales equivalentes: generación Prisma, Vitest, Nest build y Oxlint; las unitarias, compilación y lint terminaron correctamente. Oxlint reportó cuatro avisos existentes en pruebas de auth/dev-seed y `create-incident.pipe.ts`. `git diff --check` pasó sin errores.
- Decisiones y desviaciones: se amplía la ruta existente en lugar de crear otra, para conservar el contrato filtrado y ofrecer la operación de colección convencional.
- Limitaciones y pendientes: el listado no tiene autenticación/autorización. La paginación limita cada respuesta a 10 incidencias por defecto; los consumidores que necesiten el conjunto completo deben seguir el cursor.

## Adaptación a `dev` (2026-11-12)

El listado global se consulta en PostgreSQL con `findMany` y `civicId` opcional. Se conserva el array de resúmenes, ahora paginado con cursor. `npm test` terminó con 23 archivos y 219 pruebas; `npm run build`, `npm run lint` y `git diff --check` terminaron con código 0. Lint emitió cuatro avisos preexistentes fuera de los archivos modificados. No se ejecutaron pruebas e2e ni consultas contra una base real.
