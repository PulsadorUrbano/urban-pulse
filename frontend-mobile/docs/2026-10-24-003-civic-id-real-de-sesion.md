# Sesión — 2026-10-24 · Bug 24-10-26 · `civicId` real de sesión + error del backend visible en "Mis incidencias"

## Contexto

`src/services/incident.service.ts` registraba y consultaba toda incidencia con una constante
`TEMPORARY_CIVIC_ID` (el `id` de la cuenta de demo `sofia13`), marcada desde su propio comentario
como temporal hasta tener sesión real. Tras implementar login/registro, nunca se conectó ese
`civicId` con el usuario realmente logueado. Además, el `id` interno que genera `json-server` para
usuarios nuevos no es un UUID (confirmado leyendo el código instalado de `json-server@^1.0.0-beta.15`,
que ignora cualquier `id` enviado por el cliente en `POST` y lo fuerza desde la URL en `PUT`/`PATCH`),
y el backend real exige que `civicId` sea UUID. "Mis incidencias" tampoco mostraba el motivo real
cuando el backend rechazaba la petición, solo un mensaje genérico. Rama de trabajo:
`feature/registro-ciudadano-frontend-mobile`.

Trazabilidad completa en `docs/spec/bugs/general/24-10-26-civic-id-real-de-sesion.md`.

## Alcance

- Nuevo campo `civicId` (UUID) en `User`/`SessionUser`, independiente del `id` interno de
  `json-server`, generado en el cliente con un UUID v4 manual sin dependencias nuevas
  (`src/utils/uuid.ts`, `generateMockUuid`).
- `register()` (`auth.service.ts`) genera y envía `civicId` en el body del POST de alta.
- Backfill de `civicId` en los 3 usuarios existentes de `db.json` (`sofia13`, `mayte`, `patri`).
- `session-user-storage.service.ts` valida y reconstruye también `civicId` al restaurar la sesión.
- `incident.service.ts`: eliminada `TEMPORARY_CIVIC_ID`; `createIncident`/`createIncidentOnMock`
  reciben `civicId` por parámetro; `buildBackendRejectionMessage` generalizada y reutilizada en
  `fetchMyIncidents` para mostrar el motivo real del backend (sigue pintado en rojo `#d92d20`, solo
  cambia el contenido).
- Wiring final: `useCreateIncident(civicId)` con guard explícito si `civicId` es `null`;
  `incidents/new.tsx` añade el mismo guard de sesión (`useSession`/`Redirect`) que ya tenía
  `my-incidents.tsx`; `(tabs)/my-incidents.tsx` pasa `user?.civicId` en vez de `user?.id`.

## Decisiones clave

- `generateMockUuid()` usa `Math.random()`, documentado explícitamente como válido solo para datos
  de mock/desarrollo, nunca para seguridad real.
- El `id` interno de `json-server` nunca se intenta forzar a UUID: se añade `civicId` como campo de
  identidad propio porque el mock no permite controlar el `id` vía HTTP (confirmado leyendo su
  código fuente instalado).
- **Desviación aceptada respecto al plan original:** el plan proponía
  `createIncident(input, imageUris, civicId)` (civicId como tercer parámetro). El dev implementó
  `createIncident(input, civicId, imageUris = [])` (civicId como segundo parámetro, antes del
  opcional con valor por defecto) por ser más idiomático en TypeScript. Sin impacto en
  comportamiento ni contratos externos; aceptada por la usuaria.
- No se tocó la UI de `my-incidents.tsx` para el mensaje de error de backend: ya pintaba
  `errorMessage` en rojo `#d92d20`; solo cambió el contenido del texto que recibe.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/utils/uuid.ts` | Nuevo: `generateMockUuid()` (UUID v4 manual, solo mock/desarrollo). |
| `src/types/user.ts` | Modificado: añade `civicId: string` a `User` (heredado por `SessionUser`). |
| `src/services/auth.service.ts` | Modificado: `register()` genera y envía `civicId`. |
| `db.json` | Modificado: backfill de `civicId` en `sofia13`/`mayte`/`patri`. |
| `src/services/session-user-storage.service.ts` | Modificado: `loadSessionUser` valida/reconstruye `civicId`. |
| `src/services/incident.service.ts` | Modificado: elimina `TEMPORARY_CIVIC_ID`; `civicId` por parámetro en `createIncident`/`createIncidentOnMock`; `buildBackendRejectionMessage` generalizada y reutilizada en `fetchMyIncidents`. |
| `src/hooks/use-create-incident.ts` | Modificado: `useCreateIncident(civicId)` con guard de sesión. |
| `src/app/incidents/new.tsx` | Modificado: guard de sesión (`useSession`/`Redirect`) + pasa `user?.civicId`. |
| `src/app/(tabs)/my-incidents.tsx` | Modificado: usa `user?.civicId` en vez de `user?.id`. |
| `src/__tests__/services/auth.service.test.ts` | Modificado: refleja `civicId` en el body esperado del POST. |
| `src/__tests__/services/session-user-storage.service.test.ts` | Modificado: fixtures con `civicId`. |
| `src/__tests__/services/incident.service.test.ts` | Modificado: `civicId` de fixture explícito en vez de la constante local duplicada; 14 tests nuevos. |
| `src/__tests__/hooks/use-create-incident.test.ts` | Modificado: nueva firma `useCreateIncident(civicId)`, incluido `civicId === null`. |
| `src/__tests__/app/incidents/new-incident-screen.test.tsx` | Modificado: guard de sesión + paso de `user.civicId` al hook. |
| `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Modificado: `useMyIncidents` se llama con `user.civicId`. |
| `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` | Modificado: ajustado a `civicId`. |
| `docs/spec/bugs/general/24-10-26-civic-id-real-de-sesion.md` | Trazabilidad del bug (diagnóstico, subtareas, verificación, confirmación). |

## Checklist de la sesión

- [x] SUBTASK-1 · Identidad `civicId` end-to-end (`uuid.ts`, `User`, `auth.service.ts`, `db.json`, `session-user-storage.service.ts`).
- [x] SUBTASK-2 · `incident.service.ts`: `civicId` por parámetro + mensaje real del backend en `fetchMyIncidents`.
- [x] SUBTASK-3 · Wiring final: `use-create-incident.ts` + `incidents/new.tsx` + `(tabs)/my-incidents.tsx`.
- [x] Comprobaciones finales (`npx jest`, `npx tsc --noEmit`, `npx expo lint`).

## Documentos actualizados

- [x] `docs/spec/bugs/general/24-10-26-civic-id-real-de-sesion.md` — "Estado" a "Corregido y verificado", checklist de verificación y confirmación final rellenos, desviación de orden de parámetros documentada.

## Estado / Verificación

Bug **corregido y verificado**.

- `npx jest` (suite completa) — 576/576 tests verdes, 41/41 suites, sin regresiones.
- `npx tsc --noEmit` — 0 errores.
- `npx expo lint` — 0 errores, solo los 2 warnings preexistentes y ajenos ya conocidos en `src/__tests__/app/login-session-restore.test.tsx`.

## Pendiente / diferido

- [ ] Confirmación end-to-end manual en dispositivo real: crear una incidencia con un usuario
  distinto de `sofia13` y comprobar en "Mis incidencias" que aparece asociada a su propio
  `civicId`. No se dispuso de dispositivo/emulador en este entorno.
- Fuera de alcance (no tocado en este bug): cualquier endpoint de registro/incidencias del backend
  real más allá de consumirlo tal cual está (política del repo: no depurar el backend), migración
  de `civicId` para usuarios ya existentes fuera de los 3 de `db.json`.

> Detalle granular en `docs/spec/bugs/general/24-10-26-civic-id-real-de-sesion.md`.
