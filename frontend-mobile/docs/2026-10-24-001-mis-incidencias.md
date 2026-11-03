# Sesión — 2026-10-24 · Feature 24-10-26 · Mis incidencias (lista + detalle)

## Contexto

La app móvil ya permitía registrar incidencias (`/incidents/new`), pero la ciudadanía no tenía
ninguna forma de ver las incidencias que había reportado. Esta sesión implementa la nueva tab
"Mis incidencias" (lista cronológica descendente de las incidencias del ciudadano de la sesión
activa) y la pantalla de detalle `incidents/[id]` (información completa, incluidas las fotos),
ambas real-first con fallback al mock y aviso visible en pantalla, según la política de
`CLAUDE.md`. Rama de trabajo: `feature/ver-mis-incidencias-frontend-mobile`.

Trazabilidad completa en `docs/spec/features/24-10-26-mis-incidencias/` (`spec.md` y `plan.md`).

## Alcance

- Nueva tab `my-incidents` en `(tabs)/` que lista `IncidentSummary[]` del ciudadano de la sesión
  activa (`useSession().user.id` como `civicId`), ordenada desc por `createdAt` (asc por `id` en
  empates).
- Nueva pantalla empujada `incidents/[id].tsx` (fuera de `(tabs)/`, registrada en el `Stack` raíz)
  con el detalle completo de una incidencia (`IncidentDetail`), incluido un visor de fotos
  horizontal (`IncidentPhotoViewer`).
- Dos funciones de servicio nuevas en `incident.service.ts`: `fetchMyIncidents(civicId)` y
  `fetchIncidentById(id)`, real-first con fallback a mock; un 404 (real o del mock) nunca cae al
  mock (`IncidentNotFoundError`, estado "no encontrado" explícito).
- Backfill de los 7 registros existentes de `incidents` en `db.json` con `status`/`createdAt`, y
  corrección de `createIncidentOnMock` para que las incidencias nuevas creadas contra el mock
  también persistan esos dos campos.

## Decisiones clave

- `civicId` de la lista/detalle es `useSession().user.id` (sesión real ya existente), no el
  `TEMPORARY_CIVIC_ID` que sigue usando `createIncident` para el alta (no se toca).
- `IncidentDetail` se define como tipo independiente de `CreatedIncident` (no un alias), aunque
  hoy coincidan campo a campo.
- Icono de la nueva tab: PNG placeholder simple (`list.png` + `@2x`/`@3x`), mismo patrón que
  `home.png`, ya aprobado explícitamente por el usuario.
- `IncidentPhotoViewer`, `my-incidents.tsx` y el visor de fotos usan `FlatList`
  (nunca `.map()` sobre una lista dinámica dentro de un `ScrollView`, exigido por `CLAUDE.md`).
- Corrección aplicada durante la verificación: el patrón `renderHook`/`unmount`/`rerender` debe
  usarse con `await` en `@testing-library/react-native@^14.1.0` (devuelve una `Promise`); se
  corrigió en los tests de `use-my-incidents`, `use-incident-detail` e
  `incident-detail-screen` (ver evidencia de las Tareas 4, 5 y 11 en `plan.md`).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/types/incident.ts` | Modificado: `status`/`createdAt` en `IncidentPayload`; nuevos `IncidentSummary`, `IncidentDetail`, `FetchMyIncidentsResult`, `FetchIncidentDetailResult`. |
| `db.json` | Modificado: backfill de `status`/`createdAt` en los 7 registros existentes de `incidents`. |
| `src/services/incident.service.ts` | Modificado: corrige `createIncidentOnMock`; añade `IncidentNotFoundError`, exporta `inferImageFormat`, añade `fetchMyIncidents`/`fetchIncidentById` (+ sus `*FromMock`). |
| `src/__tests__/services/incident.service.test.ts` | Modificado: 2 aserciones `readSentJsonBody` actualizadas; nuevos casos de `fetchMyIncidents`/`fetchIncidentById`. |
| `src/hooks/use-my-incidents.ts` | Nuevo: hook `useMyIncidents(civicId)`. |
| `src/__tests__/hooks/use-my-incidents.test.ts` | Nuevo. |
| `src/hooks/use-incident-detail.ts` | Nuevo: hook `useIncidentDetail(id)`. |
| `src/__tests__/hooks/use-incident-detail.test.ts` | Nuevo. |
| `src/components/incident-status-badge.tsx` | Nuevo: `IncidentStatusBadge` + `STATUS_LABELS`/`STATUS_COLORS`. |
| `src/__tests__/components/incident-status-badge.test.tsx` | Nuevo. |
| `src/components/incident-list-item.tsx` | Nuevo: fila de la lista. |
| `src/__tests__/components/incident-list-item.test.tsx` | Nuevo. |
| `src/components/incident-photo-viewer.tsx` | Nuevo: visor de fotos horizontal. |
| `src/__tests__/components/incident-photo-viewer.test.tsx` | Nuevo. |
| `assets/images/tabIcons/list.png`, `list@2x.png`, `list@3x.png` | Nuevo: icono placeholder de la tab. |
| `src/components/app-tabs.tsx` | Modificado: `NativeTabs.Trigger name="my-incidents"`. |
| `src/components/app-tabs.web.tsx` | Modificado: `TabTrigger name="my-incidents"` equivalente. |
| `src/app/(tabs)/my-incidents.tsx` | Nuevo: pantalla de la lista. |
| `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Nuevo. |
| `src/app/_layout.tsx` | Modificado: registra `Stack.Screen name="incidents/[id]"`. |
| `src/app/incidents/[id].tsx` | Nuevo: pantalla de detalle. |
| `src/__tests__/app/incidents/incident-detail-screen.test.tsx` | Nuevo. |
| `docs/spec/features/24-10-26-mis-incidencias/spec.md`, `plan.md` | Trazabilidad de la feature (contrato, plan, criterios, confirmación de implementación). |

## Checklist de la sesión

- [x] T1 · Tipos nuevos en `incident.ts`.
- [x] T2 · Backfill de `db.json` + corrección de `createIncidentOnMock`.
- [x] T3 · `fetchMyIncidents`/`fetchIncidentById` en `incident.service.ts`.
- [x] T4 · Hook `use-my-incidents`.
- [x] T5 · Hook `use-incident-detail`.
- [x] T6 · Componente `IncidentStatusBadge`.
- [x] T7 · Componente `IncidentListItem`.
- [x] T8 · Componente `IncidentPhotoViewer`.
- [x] T9 · Icono placeholder + wiring de `app-tabs.tsx`/`app-tabs.web.tsx`.
- [x] T10 · Pantalla `(tabs)/my-incidents.tsx`.
- [x] T11 · Pantalla `incidents/[id].tsx` + registro en `_layout.tsx`.
- [x] Criterios de aceptación de `spec.md` validados (los 9, ver tabla en `plan.md#confirmación-de-implementación`).
- [x] Comprobaciones finales (`npx jest`, `npx tsc --noEmit`, `npx expo lint`, `git diff --check`).

## Documentos actualizados

- [x] `docs/spec/features/24-10-26-mis-incidencias/spec.md` — estado "implementado y verificado".
- [x] `docs/spec/features/24-10-26-mis-incidencias/plan.md` — las 11 tareas `[x]`, comprobaciones finales y confirmación de implementación rellenas.

## Estado / Verificación

Feature **completada y verificada**.

- `npx jest` (suite completa) — 445/445 tests verdes, 32/32 suites.
- `npx tsc --noEmit` — 0 errores.
- `npx expo lint` — 0 errores, 0 warnings propios de esta feature (quedan 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no tocados).
- `git diff --check` — sin problemas.
- `git status --short` — únicamente los archivos esperados de esta feature; `backend/`, `database/`, `ios/`, `android/` no tocados.

## Pendiente / diferido

- [ ] **Contradicción menor en el manejo de errores de `my-incidents.tsx`:** el comentario de `src/hooks/use-my-incidents.ts` indica que un error de recarga conserva el listado previo de incidencias, pero `src/app/(tabs)/my-incidents.tsx` oculta la lista por completo mientras haya `errorMessage`, en vez de mostrarla junto al error. No especificado en la spec, no bloqueante, queda como limitación conocida para una futura revisión.
- [ ] **`backendFallbackNotice` no se limpia en el catch del detalle:** en `src/hooks/use-incident-detail.ts`, si una carga anterior vino del mock (aviso activo) y un `reload()` posterior falla con error genérico o 404, el aviso "mostrando los datos del mock" puede quedar visible aunque ya no haya datos del mock. No especificado en la spec, no bloqueante.
- Fuera de alcance (ya documentado en `spec.md`): edición/eliminación/cambio de estado de una incidencia desde el móvil, paginación/filtros/búsqueda sobre el listado, subida de imágenes nuevas desde el detalle.

> Detalle granular en `docs/spec/features/24-10-26-mis-incidencias/plan.md`.
