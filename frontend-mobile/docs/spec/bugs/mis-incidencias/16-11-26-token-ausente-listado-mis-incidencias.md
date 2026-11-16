# 16-11-26 — Bug: `fetchMyIncidents` no manda `Authorization` a `GET /incidents?civicId=...`

- Feature afectada: mis-incidencias.
- Rama: fix/token.
- Última actualización: 2026-11-16.
- Estado: Corregido y verificado.
- Origen: aviso de `@Alewuito` en la revisión (`CHANGES_REQUESTED`) de la PR backend #170 (`fix(api): proteger listados y sincronizar estado de asignación`), que detectó que `fetchMyIncidents` no manda `Authorization` y que "Mis incidencias" se quedará sin datos reales en cuanto esa PR se mergee; coincide con la deuda DEUDA-27-01 que los dos bugs hermanos de esta misma rama (`13-11-26-token-ausente-get-incidente.md` y `../registro-incidencia/13-11-26-token-ausente-post-incidents.md`) ya mencionaban explícitamente como "inconsistencia conocida, no parte de este bug".

## Síntoma observado

Hoy `GET /incidents?civicId=...` no falla: el backend en `dev`/`main` todavía no exige JWT en ese endpoint (prototipo sin autenticación, DEUDA-27-01). Pero la PR backend #170 pasa a exigir JWT en **todo** `GET /incidents`, también cuando se filtra por `civicId` (un ciudadano solo puede pedir el suyo, verificado contra su vínculo real). En cuanto esa PR se mergee, la consulta que hace `fetchMyIncidents` (`src/services/incident.service.ts`) desde la pantalla "Mis incidencias" recibirá 401 y la pantalla no podrá cargar datos reales del backend.

## Diagnóstico

- Archivo y línea donde está la causa real: `src/services/incident.service.ts`, función `fetchMyIncidents`, concretamente la llamada a `fetchWithTimeout` sin `headers`.
- Causa, ya confirmada (no es hipótesis): a diferencia de `createIncident` y `fetchIncidentById`, ya corregidas en esta misma rama `fix/token` para mandar `Authorization: Bearer <token>`, `fetchMyIncidents` nunca ha mandado ninguna cabecera. Mientras el backend no exigía JWT en este endpoint, eso no causaba ningún fallo; con la PR backend #170 sí.
- Alcance del fallo: aislado a `fetchMyIncidents` en el camino backend real. El camino mock (`fetchMyIncidentsFromMock`) no se ve afectado y no se toca, por la regla de "nunca borrar simulación mock" de `CLAUDE.md`.
- El fallo de autenticación está en el frontend (el cliente nunca mandó el token que el backend está a punto de exigir), no en el backend.

## Corrección aplicada

Actualizar `fetchMyIncidents` para que mande el `Authorization` que el backend exigirá, replicando exactamente el patrón ya usado en esta rama para `fetchIncidentById`/`use-incident-detail.ts`/`app/incidents/[id].tsx`:

- `fetchMyIncidents` recibe un nuevo parámetro `accessToken: string`.
- Se añade `headers: { Authorization: 'Bearer ' + accessToken }` a la llamada a `fetchWithTimeout` del camino backend real.
- `hooks/use-my-incidents.ts` recibe `accessToken: string | null` además de `civicId`, con el mismo guard temprano usado en `use-incident-detail.ts`: si `civicId` es `null` (sesión aún no resuelta) se mantiene el comportamiento actual (listado vacío sin error); si ya hay `civicId` pero `accessToken` es `null` (sesión sin token válido), se informa con el mismo mensaje de sesión en vez de intentar la petición real; `accessToken` se añade a las dependencias del `useEffect`.
- `app/(tabs)/my-incidents.tsx` saca `token` de `useSession()` además de `user`, y pasa `token?.accessToken ?? null` al hook.

No se añaden mejoras ni refactors fuera de este cambio de contrato.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `fetchMyIncidents` recibe `accessToken`; añade el header `Authorization` a la petición real |
| modificar | `src/hooks/use-my-incidents.ts` | `useMyIncidents` recibe y threadea `accessToken` hacia `fetchMyIncidents`, con el mismo patrón de guard usado en `use-incident-detail.ts` |
| modificar | `src/app/(tabs)/my-incidents.tsx` | obtiene `token` de `useSession()` y lo pasa al hook |
| modificar | `src/__tests__/services/incident.service.test.ts` | actualiza todas las llamadas de `fetchMyIncidents` al nuevo parámetro; añade el test del header `Authorization` en el camino backend y el de ausencia de esa cabecera en el fallback al mock |
| modificar | `src/__tests__/hooks/use-my-incidents.test.ts` | actualiza las llamadas y aserciones del hook al nuevo parámetro; añade los casos "sin accessToken" y la transición de `accessToken` null a válido |
| modificar | `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | da un `AuthToken` real a `buildSessionValue`; actualiza las aserciones de los argumentos pasados a `useMyIncidents`; añade el caso sin token |
| modificar | `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` | da un `AuthToken` real a `buildSessionValue` (el hook real deja de llamar al servicio sin token) y actualiza la aserción del argumento `accessToken` |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: confirmado por diagnóstico estático (el código previo de `fetchMyIncidents` nunca mandaba `Authorization`, y la PR backend #170 documenta que `GET /incidents` con `civicId` pasará a exigir JWT). No se ha levantado el backend real para reproducir en vivo: no se pidió explícitamente y no es necesario para confirmar la causa (política de backend en `CLAUDE.md`).
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: verificado con `pnpm jest src/__tests__/services/incident.service.test.ts src/__tests__/hooks/use-my-incidents.test.ts src/__tests__/app/tabs/my-incidents-screen.test.tsx src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` (4 suites, 145 tests, todos en verde) — la petición real de `fetchMyIncidents` sale con `Authorization: Bearer <token>` (test "envía Authorization Bearer con el accessToken recibido en el GET al backend"), y el camino de respaldo al mock sigue sin esa cabecera (test "el GET de respaldo al mock no lleva cabecera Authorization"), comprobado contra `fetchWithTimeout` mockeado. No se ha probado contra un backend real en ejecución (fuera del alcance que pide `CLAUDE.md`: solo se comprueba que el front envía correctamente, no que el backend responda).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos: `pnpm tsc --noEmit` sin salida (0 errores); `pnpm expo lint` → 0 errores, 2 warnings preexistentes sin relación (`login-session-restore.test.tsx`, `@typescript-eslint/no-require-imports`).
- [x] Tests en `src/__tests__/services/incident.service.test.ts`, `src/__tests__/hooks/use-my-incidents.test.ts`, `src/__tests__/app/tabs/my-incidents-screen.test.tsx` y `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` actualizados y en verde: suite completa `pnpm jest` → 43 suites / 634 tests, todos en verde (628 previos de esta rama + 6 nuevos de este bug).

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-11-16.
- Evidencia de que no reaparece: `pnpm tsc --noEmit` sin errores; `pnpm expo lint` → 0 errores (2 warnings preexistentes sin relación); `pnpm jest` → 43 suites / 634 tests en verde, incluidos los 4 archivos de test de este documento, que comprueban con `fetchWithTimeout` mockeado que `fetchMyIncidents` manda `Authorization: Bearer <token>` en el GET real, que el fallback al mock no lo manda, y que la pantalla/hook informan del problema sin romperse cuando falta el token.
- Limitaciones y pendientes:
  - No se verifica ni se depura el backend (ya documentado y asumido correcto).
  - El fix queda coordinado con el merge de la PR backend #170: hasta que esa PR se mergee, el backend sigue sin exigir JWT en este endpoint (DEUDA-27-01), por lo que mandar el token ya es correcto pero no cambia el comportamiento observable todavía.
  - Con sesión activa pero sin `accessToken` (caso raro: `autoLoginFailed` tras registro), `useMyIncidents` bloquea la carga con el mensaje de "sin sesión" en vez de intentar la petición real. Es coherente con que el backend la rechazaría igualmente con 401 en cuanto se mergee la PR #170, pero queda anotado como comportamiento a vigilar.
