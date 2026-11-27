# 2026-11-25 — Plan de implementación: enviar al backend los filtros de estado, fecha y orden

- Objetivo: que todos los filtros del listado se apliquen en la consulta del backend.
- Arquitectura: se reutilizan los hooks y el servicio de la #215; se elimina el filtrado local.
- Herramientas: React 19, Vitest y el harness de hooks de `src/__tests__/hooks/hook-harness.ts`.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/213-filtros-estado-fecha-servidor-frontend-web.
- Estado: implementado y verificado con pruebas unitarias; prueba manual con el backend pendiente.

## Restricciones generales

- Confinar los cambios a `frontend-web/`; no tocar el backend.
- TypeScript estricto, sin dependencias nuevas.
- Restricciones particulares: no enviar valores por defecto y mantener `from` <= `to`.

## Focos de revisión

- Reinicio de la paginación al cambiar estado, fechas u orden (criterio 1, test de `useIncidentList`).
- Parámetros de la URL al continuar con cursor (criterio 2, test de `fetchIncidentPage`).
- Rango invertido (criterio 4, test de `useIncidentFilters`).

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | frontend-web/src/types/incident.ts | `IncidentPageFilters` con estado, fechas y orden |
| Modificar | frontend-web/src/utils/incident-filters.ts | `toPageFilters`; se quitan el filtrado y el cálculo de resultado parcial |
| Modificar | frontend-web/src/hooks/use-incident-filters.ts | Enviar todos los filtros |
| Modificar | frontend-web/src/hooks/use-incident-list.ts | Identidad de la consulta con los criterios nuevos |
| Modificar | frontend-web/src/services/incident.service.ts | Parámetros `status`, `from`, `to` y `order` |
| Modificar | frontend-web/src/components/incident-list-view.tsx | Quitar contador y aviso de resultado parcial |
| Modificar | frontend-web/src/__tests__/ | Pruebas de utilidad, hooks y servicio |

## Preparación

- [x] Revisar la #214 (`ListarIncidenciasPipe`, fechas en UTC y cursor ligado a filtros) y la #215.
- [x] Crear la rama desde `origin/dev` (`241cc85`).

## Tarea 1: enviar todos los filtros

**Criterios cubiertos:** 1 a 5.

- [x] `toPageFilters` traduce los controles y omite los valores por defecto.
- [x] `useIncidentFilters` y `useIncidentList` usan todos los criterios; se elimina el filtrado local.
- [x] `fetchIncidentPage` añade los parámetros nuevos.
- [x] Pruebas: traducción de filtros, envío desde el hook, rango invertido, reinicio de la paginación con estado, fechas u orden, y parámetros de la URL con y sin cursor.
- [ ] Prueba manual con el backend y el seed de incidencias.

## Comprobaciones finales

Ejecutadas desde frontend-web/ con Node 22.14.0.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | 13 archivos, 132 pruebas correctas |
| Typecheck | npm run typecheck | Sin errores |
| Lint | npm run lint | Sin errores |
| Build | npm run build | Correcto |

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente.
- Fecha de revisión: 2026-11-25.
- Resultado entregado: todos los filtros del listado se resuelven en el backend.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Reinicio al cambiar estado, fechas u orden | `use-incident-list.test.ts`, casos con `status`, `from`/`to` y `order` | Cumplido |
| 2. «Cargar más» conserva los filtros | `incident.service.test.ts`, parámetros con cursor | Cumplido |
| 3. Valores por defecto y limpiar | `incident-filters.test.ts` y `use-incident-filters.test.ts` | Cumplido |
| 4. Rango invertido | `use-incident-filters.test.ts` | Cumplido |
| 5. Sin filtrado local | `applyIncidentFilters` eliminado; la vista pinta `items` tal cual | Cumplido |

- Decisiones y desviaciones: fechas en UTC, como define la #214.
- Limitaciones y pendientes: prueba manual con el backend. Con UTC, una incidencia creada entre las 00:00 y la 01:00 (hora de Madrid) cuenta para el día anterior.
