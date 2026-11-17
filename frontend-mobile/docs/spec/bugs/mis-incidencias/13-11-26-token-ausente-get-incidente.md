# 13-11-26 — Bug: `fetchIncidentById` no manda `Authorization` a `GET /incidents/:id`

- Feature afectada: mis-incidencias.
- Rama: fix/token.
- Última actualización: 2026-11-13.
- Estado: Corregido y verificado.
- Origen: hallazgo propio, al revisar el impacto en el móvil del cambio de contrato de incidencias documentado por el backend el 2026-11-09 (mismo cambio que afecta a `POST /incidents`, ver `docs/spec/bugs/registro-incidencia/13-11-26-token-ausente-post-incidents.md`).

## Síntoma observado

Toda petición real a `GET /incidents/:id` (detalle de una incidencia) desde `fetchIncidentById` (`src/services/incident.service.ts`, líneas ~462-488) falla contra el backend real con un rechazo de autenticación: el backend la rechaza (401) y la app lo trata como error genérico o cae al mock, en vez de mostrar el detalle real de la incidencia.

## Diagnóstico

- Archivo y línea donde está la causa real: `src/services/incident.service.ts`, función `fetchIncidentById` (líneas 462-488), concretamente la llamada a `fetchWithTimeout` sin `headers` (líneas 465-468).
- Causa, ya confirmada (no es hipótesis): el mismo cambio de backend del 2026-11-09 (JWT + Prisma en incidencias, `backend/docs/spec/features/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md`) puso `GET /incidents/:id` bajo el mismo guard que `POST /incidents`: `JwtAuthGuard` + `AccesoIncidenciasGuard` (`backend/src/incidents/incidents.controller.ts:441-450`). `fetchIncidentById` nunca mandaba ninguna cabecera `Authorization`; la petición llega al backend sin JWT y el guard la rechaza antes de llegar al controlador.
- Alcance del fallo: aislado a `fetchIncidentById` en el camino backend real (la función que hace la petición HTTP). El camino mock (`fetchIncidentDetailFromMock`) no se ve afectado y no se toca, por la regla de "nunca borrar simulación mock" de `CLAUDE.md`. No afecta a `fetchMyIncidents` (`GET /incidents?civicId=...`, mismo archivo): esa ruta sigue intencionalmente sin guard, documentada como "Prototipo sin autenticación... DEUDA-27-01" (ver bug hermano de registro-incidencia para el detalle de esa inconsistencia conocida).
- El fallo de autenticación está en el frontend (el cliente nunca mandó el token que el backend ya exige), no en el backend: el backend ya documenta y aplica correctamente el guard.

## Corrección aplicada

Actualizar `fetchIncidentById` para que mande el `Authorization` que el backend ya exige:

- `fetchIncidentById` recibe un nuevo parámetro `accessToken: string`.
- Se añade `headers: { Authorization: 'Bearer ' + accessToken }` a la llamada a `fetchWithTimeout` del camino backend real.
- `hooks/use-incident-detail.ts` recibe y threadea `accessToken`, con el mismo patrón de guard que ya existe en `use-create-incident.ts` (sin token válido, no se intenta la petición real y se informa a la UI en vez de dejarla fallar contra el backend).
- `app/incidents/[id].tsx` saca `token` de `useSession()` y lo pasa al hook.

No se añaden mejoras ni refactors fuera de este cambio de contrato.

Nota de trazabilidad (organizador, 2026-11-13): el `tester` de hooks detectó que la rama del `useEffect` con `accessToken` válido no ejecutaba `setIsLoading(true)`/`setErrorMessage(null)` antes de llamar a `fetchIncidentById`, por lo que una transición de "sin token" a "con token" (p. ej. tras restaurar sesión) podía mostrar brevemente el mensaje de "sin sesión" mientras la petición real ya estaba en curso. Se instruyó al `dev` corregirlo en `use-incident-detail.ts` sin generar subtarea nueva; queda pendiente de que el `dev` aplique el ajuste y el `tester`/`compiler` lo verifiquen.

Nota de trazabilidad (organizador, 2026-11-13): al verificar con `pnpm expo lint`, el `compiler` reportó un ERROR bloqueante `react-hooks/set-state-in-effect` en `use-incident-detail.ts:41` — la rama `accessToken == null` del `useEffect` (añadida en la subtarea de hooks de este mismo fix) llama a `setIncident`/`setIsNotFound`/`setErrorMessage`/`setIsLoading` de forma síncrona en el cuerpo del efecto, rompiendo la convención de resolución asíncrona vía promesa que sigue el resto del archivo. Se instruyó al `dev` diferir esas cuatro llamadas con un `Promise.resolve().then(...)` guardado por `isMountedRef`, sin generar subtarea nueva; queda pendiente de que el `dev` aplique el ajuste y el `tester`/`compiler` confirmen `pnpm expo lint` limpio.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `fetchIncidentById` recibe `accessToken`; añade el header `Authorization` a la petición real |
| modificar | `src/hooks/use-incident-detail.ts` | `useIncidentDetail` recibe y threadea `accessToken` hacia `fetchIncidentById`, con el mismo patrón de guard usado en `use-create-incident.ts` |
| modificar | `src/app/incidents/[id].tsx` | obtiene `token` de `useSession()` y lo pasa al hook |
| modificar | `src/__tests__/hooks/use-incident-detail.test.ts` | actualiza los tests del hook al nuevo parámetro `accessToken` |
| modificar | `src/__tests__/app/incidents/incident-detail-screen.test.tsx` | actualiza los tests de la pantalla para la obtención y paso del `accessToken` desde `useSession()` |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: confirmado por diagnóstico estático (el backend documenta y aplica `JwtAuthGuard` + `AccesoIncidenciasGuard` en `GET /incidents/:id`, y el código previo de `fetchIncidentById` nunca mandaba `Authorization`). No se ha levantado el backend real para reproducir en vivo: no se pidió explícitamente y no es necesario para confirmar la causa (política de backend en `CLAUDE.md`).
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: verificado con `pnpm jest src/__tests__/services/incident.service.test.ts` — la petición real de `fetchIncidentById` sale con `Authorization: Bearer <token>` (test "envía Authorization Bearer con el accessToken recibido en el GET al backend"), y el camino de respaldo al mock sigue sin esa cabecera (test "el GET de respaldo al mock no lleva cabecera Authorization"), comprobado contra `fetchWithTimeout` mockeado. No se ha probado contra un backend real en ejecución (fuera del alcance que pide `CLAUDE.md`: solo se comprueba que el front envía correctamente, no que el backend responda).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos: re-ejecutado el 2026-11-13 por el organizador — `pnpm tsc --noEmit` sin salida (0 errores); `pnpm expo lint` → 0 errores, 2 warnings preexistentes sin relación (`login-session-restore.test.tsx`, `@typescript-eslint/no-require-imports`), incluido el error bloqueante `react-hooks/set-state-in-effect` de `use-incident-detail.ts:41` detectado durante la verificación, ya corregido (diferido vía `Promise.resolve().then(...)` guardado por `isMountedRef`).
- [x] Tests en `src/__tests__/hooks/use-incident-detail.test.ts` y `src/__tests__/app/incidents/incident-detail-screen.test.tsx` actualizados y en verde: re-ejecutado el 2026-11-13 por el organizador — los 5 suites de este fix conjunto (incluyendo los del bug hermano) pasan (176/176 tests); `pnpm jest` completo → 43 suites / 628 tests, todos en verde.

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-11-13.
- Evidencia de que no reaparece: `pnpm tsc --noEmit` sin errores; `pnpm expo lint` → 0 errores (2 warnings preexistentes sin relación); `pnpm jest` → 43 suites / 628 tests en verde, incluidos los 2 archivos de test de este documento (`use-incident-detail.test.ts`, `incident-detail-screen.test.tsx`) y el test de `incident.service.test.ts` que comprueba con `fetchWithTimeout` mockeado que `fetchIncidentById` manda `Authorization: Bearer <token>` en el GET real. Se corrigieron además, durante la verificación, dos rondas del error de lint `react-hooks/set-state-in-effect` en `use-incident-detail.ts` (guard sin sesión y `setState` previo a la petición real, ambos diferidos vía `Promise.resolve().then(...)` respetando `isMountedRef`), confirmadas por la re-ejecución de `pnpm expo lint` sin errores.
- Limitaciones y pendientes:
  - No se verifica ni se depura el backend (ya documentado y asumido correcto).
  - `fetchMyIncidents` sigue sin `Authorization` a propósito (el backend documenta esa ruta como sin guard, deuda DEUDA-27-01); queda fuera de este bug (inconsistencia conocida, no rota hoy).
  - Con sesión activa pero sin `accessToken` (caso raro: `autoLoginFailed` tras registro), `useIncidentDetail` bloquea la carga con el mensaje de "sin sesión" en vez de intentar la petición real. Es coherente con que el backend la rechazaría igualmente con 401, pero queda anotado como comportamiento a vigilar.
