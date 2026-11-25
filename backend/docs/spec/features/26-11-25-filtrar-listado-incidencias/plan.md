# 2026-11-25 — Plan para filtrar el listado de incidencias en el backend

- Objetivo: aplicar los filtros de #213 en la consulta paginada de `GET /incidents`.
- Arquitectura: ampliar el pipe, el servicio y el controlador existentes; reutilizar Prisma y las pruebas unitarias actuales.
- Herramientas: Node >=22, pnpm 10.34.8, NestJS 12, Prisma 7.10.1, Vitest 4.
- Especificación: [Contrato y criterios](spec.md).
- Rama: `feature/filtrar-listado-incidencias-213-backend`.
- Estado: implementado y verificado.

## Restricciones

Solo backend. Mantener nombres públicos, TypeScript estricto, imports ESM y permisos existentes. No añadir dependencias, migraciones, frontend, servicios externos, commits ni push. Fechas interpretadas en UTC y límite superior de `to` exclusivo al comenzar el día siguiente.

## Tareas

- [x] Leer instrucciones, estado de Git, código, ficha del endpoint y versiones; consultar Context7 para NestJS y Prisma.
- [x] Ampliar `ListarIncidenciasPipe` y sus unitarias: seis filtros opcionales, fechas válidas y ordenadas, UUID y cursor vinculado a filtros.
- [x] Ampliar `IncidentsService.listarPagina` y sus unitarias: `where`, `orderBy`, keyset en ambos órdenes y combinación de filtros.
- [x] Actualizar controlador y unitarias: pasar filtros, conservarlos en `Link` y exponerlos en Swagger.
- [x] Actualizar `backend/docs/spec/endpoint/get-incidents/README.md` y revisar coherencia con la especificación.
- [x] Ejecutar `pnpm test`, `pnpm run build`, `pnpm run lint` y `git diff --check`; revisar el diff y registrar resultados.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `backend/src/incidents/listar-incidencias.pipe.ts` | Validación de consulta y cursor |
| Modificar | `backend/src/incidents/incident.ts` | Tipos de filtros y cursor |
| Modificar | `backend/src/incidents/incidents.service.ts` | Filtrado y paginación SQL |
| Modificar | `backend/src/incidents/incidents.controller.ts` | Contrato y enlace siguiente |
| Modificar | `backend/test/incidents/pipes/listar-incidencias.pipe.spec.ts` | Validación observable |
| Modificar | `backend/test/incidents/services/listar-incidencias.service.spec.ts` | Consulta y keyset |
| Modificar | `backend/test/incidents/controllers/incidents.controller.spec.ts` | Enlace y delegación |
| Modificar | `backend/test/incidents/services/prisma-incidencias.fake.ts` | Doble de consulta para unitarias |
| Modificar | `backend/docs/spec/endpoint/get-incidents/README.md` | Contrato publicado |

## Comprobaciones finales

| Comprobación | Resultado real |
| --- | --- |
| `pnpm test` | 28 archivos, 363 pruebas correctas |
| `pnpm run build` | Correcto; Prisma Client 7.10.1 generado y Nest compilado |
| `pnpm run lint` | Correcto, con dos avisos previos en pruebas ajenas al cambio |
| `git diff --check` | Correcto |

## Confirmación de implementación

- Estado final: implementado y verificado.
- Fecha de revisión: 2026-11-25.
- Resultado entregado: rama creada desde `origin/dev` (`7658184`); filtros combinables aplicados en PostgreSQL, paginación en ambos órdenes, contrato Swagger y ficha del endpoint actualizados.
- Criterios 1–5: cumplidos por las unitarias del pipe, servicio y controlador; compilación y lint correctos.
- Decisión y desviación: el doble de Prisma ahora compara fechas con precisión de milisegundos; el error anterior repetía la última fila en una prueba con `23:59:59.999`. Los cursores antiguos se reinician desde la primera página.
- Limitaciones y pendientes: TokenX no expone capacidades en esta sesión; se usa Ponytail para mantener el cambio mínimo.

- Corrección documental: especificación y plan reunidos en la carpeta de funcionalidad 26-11-25-filtrar-listado-incidencias/, con nombres spec.md y plan.md, según la estructura del proyecto.
