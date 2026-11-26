# 2026-11-26 — Plan de implementación: Mapa de incidencias propias (Issue #136, parte móvil)

- Objetivo: pestaña "Mapa" con clusters, filtros, sheet y "centrar en mi ubicación" sobre las incidencias propias abiertas.
- Arquitectura: módulos TS puros en `src/utils/map/`; servicio `fetchMyMapIncidents` aditivo en `incident.service.ts`; hooks `use-map-incidents` y `use-incident-map-filters`; 7 componentes; ruta fina `(tabs)/map.tsx`.
- Herramientas: `react-native-maps` 1.29.11, `supercluster` 9.1.0 (tipos propios), reanimated existente.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/mapa-frontend-mobile.
- Estado: implementada (verificación automática OK); pendiente prueba manual en dispositivo/Expo Go.

## Restricciones generales

- Respetar el alcance y los valores de la especificación; identificadores en inglés, comentarios en español.
- TypeScript estricto (cero `any`), NativeWind, sin lógica de negocio en `src/app/`.
- Sin dependencias nuevas (ya instaladas y aprobadas). Real-first con fallback mock; no borrar nada del mock; no depurar el backend.
- Tests en `src/__tests__/`; sin e2e. Sin commits ni push salvo petición.
- Particulares: "resueltas" = `resolved`+`closed`; solo incidencias propias; no tocar `../backend` ni `../frontend-web`; `db.json` modificado solo según lo aprobado; consultar Context7/docs SDK antes de usar `react-native-maps` (Expo Go, `app.json`); posible `transformIgnorePatterns` para `supercluster` (ESM) en Jest.

## Focos de revisión

- Resueltas/closed excluidas y rejected incluida: ST2, ST4, tests de filtros y servicio.
- Sin coordenadas descartadas: ST4.
- Fallback mock + aviso conservado: ST4, ST5.
- Concurrencia limitada N+1: ST4.
- Clusters/bbox/zoom: ST2.
- Web sin importar `react-native-maps`: ST9.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| crear | src/types/incident-map.ts | Tipos del mapa |
| crear | src/utils/map/incident-map-filters.ts | Filtros de antigüedad y resueltas |
| crear | src/utils/map/incident-clusters.ts | Wrapper de supercluster |
| crear | src/utils/map/category-colors.ts | Color por categoría |
| modificar | db.json | Datos semilla variados |
| modificar | src/services/incident.service.ts | `fetchMyMapIncidents` |
| crear | src/hooks/use-map-incidents.ts, use-incident-map-filters.ts | Estado de datos y filtros |
| crear | src/components/incident-map*.tsx, incident-cluster-marker.tsx, locate-me-button.tsx | UI del mapa |
| crear | src/app/(tabs)/map.tsx | Pantalla |
| modificar | src/components/app-tabs.tsx, app-tabs.web.tsx; crear assets/images/tabIcons/map*.png | Pestaña |
| modificar (si hace falta) | package.json (jest), app.json | Transform ESM / plugin maps |
| crear/modificar | src/__tests__/... | Tests espejo |
| actualizar | spec.md y este plan; docs/2026-11-26-001-mapa-incidencias.md | Trazabilidad |

## Preparación

- [ ] Leer CLAUDE.md, la spec y archivos afectados; revisar estado de Git.
- [ ] Revisar contratos backend en modo lectura.
- [ ] Consultar Context7/docs SDK sobre `react-native-maps` (Expo Go, `app.json`) y `supercluster` ESM en Jest.
- [ ] Registrar estado inicial de lint/tsc/test.

## Tareas

### ST1: Tipos — DONE
Archivos: `src/types/incident-map.ts`. Criterios: 1-4.
- [x] Definir `MapIncident`, `IncidentAgeFilter`, `IncidentMapFilters`, `FetchMapIncidentsResult`. `pnpm tsc --noEmit`.

### ST2: Utils puros — DONE
Archivos: `src/utils/map/incident-map-filters.ts`, `incident-clusters.ts`, `category-colors.ts` + tests (`src/__tests__/utils/map/`). Criterios: 1-3.
- [x] Tests (51): `isUnresolvedIncident` (resolved/closed fuera, rejected dentro), `isWithinAge` (límites 7/30/90/all), `applyIncidentMapFilters`, clusters por región/zoom y expansión, color estable y neutro por defecto.
- [x] Implementar y ajustar Jest para `supercluster` ESM: `transformIgnorePatterns` en `package.json` para `supercluster|kdbush` (ESM).
- Notas (observaciones del tester, no bloqueantes): el bbox no trata el antimeridiano (irrelevante para Málaga); `getClusterExpansionZoom` no tiene guarda para ids que no son de cluster.

### ST3: db.json mock (confirmación de la usuaria ya dada) — DONE
Archivos: `db.json`. Criterios: 1-3.
- [x] Variar status, createdAt, categorías, coordenadas cercanas/lejanas e imágenes picsum: 7 incidencias nuevas (`mapCentro01-05`, `mapTeatinos01`, `mapElPalo01`), 8 existentes con status/createdAt variados, 6 imágenes picsum (`mapImg01-06`).
- [x] Comprobar que los tests existentes que usan el mock siguen pasando (db.json es JSON válido).
- Verificación del compiler (ST1-ST3): `pnpm test` 65 suites / 848 tests passed, `tsc` exit 0, `lint` exit 0.

### ST4: Servicio `fetchMyMapIncidents` — DONE
Archivos: `src/services/incident.service.ts`, `src/utils/run-with-concurrency.ts`, `src/__tests__/services/incident.service.test.ts`, `src/__tests__/utils/run-with-concurrency.test.ts`. Criterios: 2, 6.
- [x] Tests: backend, fallback, sin coordenadas, resueltas excluidas, concurrencia, paginación.
- [x] Implementar (aditivo): `fetchMyMapIncidents` + `src/utils/run-with-concurrency.ts`; `fetchMyIncidents` con opción `fetchAllPages`.
- Verificación del compiler (ST4+ST6+ST7): 154 tests en 5 suites passed.

### ST4b: Correcciones de revisión — DONE
Archivos: `src/hooks/use-map-incidents.ts`, `src/services/incident.service.ts`, `src/__tests__/services/incident.service.test.ts` (+ test del hook). Criterios: 2, 3, 6.
- [x] (1) `useMapIncidents` vacía `incidents` al cambiar `civicId`/token, para no mostrar datos de otra cuenta (con test).
- [x] (2) Si el listado cae al mock, los detalles van directos al mock (evita N timeouts) (con test).
- [x] (3) Guarda anti-bucle en la paginación por cursor: cursor repetido o máximo de páginas (con test).
- [x] (4) Eliminar `countDetailRequests` sin uso.
- [x] Corregir el warning de lint pendiente en `incident.service.test.ts:1886`.
- [x] Re-verificar `pnpm test`, `pnpm tsc --noEmit`, `pnpm expo lint`.

### ST5: Hooks — DONE
Archivos: `src/hooks/use-map-incidents.ts`, `use-incident-map-filters.ts` + tests. Criterios: 3, 6.
- [x] Tests de carga/error/reload/fallback notice y de filtros memoizados (41 tests).
- [x] Implementar.
- Verificación del compiler: 41 tests passed.

### ST6: Marcadores y cluster — DONE
Archivos: `incident-map-marker.tsx`, `incident-cluster-marker.tsx` (+ tests si hay lógica). Criterios: 1.
- [x] Implementar con NativeWind; `react-native-maps` mockeado en tests.

### ST7: Bottom sheet — DONE
Archivos: `incident-map-sheet.tsx` + test. Criterios: 4.
- [x] Test de navegación "Ver detalle" a `/incidents/{id}`, estado y fotos/sin fotos.
- [x] Implementar con reanimated.

### ST8: Barra de filtros y botón ubicación — DONE
Archivos: `incident-map-filter-bar.tsx`, `locate-me-button.tsx` + tests. Criterios: 3, 5.
- [x] Chips en `FlatList` horizontal; ubicación con `device-location.ts` y permiso denegado.

### ST9: `incident-map` (+ .web) — DONE
Archivos: `incident-map.tsx`, `incident-map.web.tsx`. Criterios: 1, 4, 5, 7.
- [x] MapView, clusters en `onRegionChangeComplete`, zoom animado al pulsar cluster; variante web con aviso.

### ST10: Ruta y pestaña — DONE
Archivos: `src/app/(tabs)/map.tsx`, `app-tabs.tsx`, `app-tabs.web.tsx`, `assets/images/tabIcons/map*.png`, `app.json` si aplica, tests de tabs. Criterios: 6-8.
- [x] Pantalla fina con banner de fallback, estados de carga/error/vacío; Trigger "Mapa".
- [x] Actualizar `app-tabs.test.tsx` y `app-tabs.web.test.tsx`.

### ST11: Verificación y cierre — DONE (verificación automática); prueba manual PENDIENTE
- [x] `pnpm test`, `pnpm tsc --noEmit`, `pnpm expo lint`, `git diff --check`.
- [ ] PENDIENTE (usuaria): prueba manual en dispositivo/Expo Go contra el mock (clusters, filtros, sheet, Ver detalle, ubicación, aviso de fallback).
- [x] Confirmación de implementación rellenada con resultados automáticos.

## Observaciones

- `src/hooks/use-my-incidents.ts` (preexistente) tiene el mismo patrón de conservar datos al cambiar de cuenta que se corrige en ST4b para el mapa; fuera de alcance de esta feature.
- `react-native-reanimated` debe mockearse en los tests que importen el sheet (`incident-map-sheet.tsx`), directa o indirectamente (p. ej. `incident-map`, pantalla del mapa).
- Verificación ST4+ST6+ST7 y ST5 (compiler): 154 tests en 5 suites + 41 tests, `tsc` exit 0, lint 0 errores (1 warning en `incident.service.test.ts:1886`, se corrige en ST4b).
- Icono de la pestaña Mapa generado provisionalmente (pin) en `assets/images/tabIcons/map*.png`; sustituir por el asset definitivo.
- Los tipos de Expo Router en `.expo/types` (gitignored) requieren ejecutar `pnpm start` una vez antes de `tsc` en un clon nuevo.
- `style` inline solo para valores dinámicos (colores de categoría, bottom offsets, safe area).
- `incident-map` re-anima si `focusCoordinates` cambia de referencia (en `map.tsx` es estado, OK).
- `use-my-incidents.ts` (preexistente) conserva datos al cambiar de cuenta; fuera de alcance.
- `react-native-reanimated` debe mockearse en los tests que importen el sheet.

### Nota para el equipo de backend (solo documentada, sin actuar)

- `GET /incidents` no devuelve `location`/`categoryId`: obliga a N+1 llamadas de detalle.
- Un ciudadano no puede listar incidencias ajenas (necesario para mostrar ajenas de prioridad alta/media en el mapa).
- No existe endpoint de urban assets.

### Fuera de alcance de esta iteración

- Incidencias ajenas alta/media, filtro de assets urbanos, integración web.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | pnpm test | OK: 76 suites / 1014 tests passed |
| Typecheck | pnpm tsc --noEmit | OK: exit 0 |
| Lint | pnpm expo lint | OK: exit 0, sin warnings |
| Diff, desde la raíz | git diff --check | OK: limpio |

- [x] Cambios confinados a `frontend-mobile` (salvo `../backend/.dockerignore` y `../frontend-web/.dockerignore`, preexistentes y ajenos a esta feature).
- [ ] PENDIENTE: prueba manual en dispositivo/Expo Go contra el mock (la hará la usuaria).

## Confirmación de implementación

- Estado final: implementada, pendiente de prueba manual.
- Fecha de revisión: 2026-11-26.
- Resultado entregado: pestaña "Mapa" con clusters, filtros, bottom sheet con "Ver detalle", centrar en ubicación y aviso de fallback; variante web con aviso.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1-9 | Verificación automática del compiler (76 suites / 1014 tests, tsc, lint, diff --check) | Cumplido en automático |
| Comportamiento en dispositivo (clusters, filtros, sheet, Ver detalle, ubicación, fallback) | Prueba manual | PENDIENTE (usuaria) |

- Comprobaciones: ver tabla de Comprobaciones finales.
- Decisiones y desviaciones: ST4b añadido tras revisión (anti-bucle de paginación, mock directo en detalles, limpieza al cambiar de cuenta); ajuste de `transformIgnorePatterns` para `supercluster|kdbush`.
- Limitaciones y pendientes: prueba manual; icono definitivo; puntos de backend anotados arriba.
