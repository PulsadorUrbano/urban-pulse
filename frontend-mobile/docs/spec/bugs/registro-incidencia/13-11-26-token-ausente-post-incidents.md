# 13-11-26 — Bug: `createIncident` no manda `Authorization` ni respeta el nuevo contrato JSON de `POST /incidents`

- Feature afectada: registro-incidencia.
- Rama: fix/token.
- Última actualización: 2026-11-13.
- Estado: Corregido y verificado.
- Origen: hallazgo propio, al revisar el impacto en el móvil del cambio de contrato de `POST /incidents` documentado por el backend el 2026-11-09.

## Síntoma observado

Toda petición real a `POST /incidents` (crear incidencia) desde `createIncident` (`src/services/incident.service.ts`, líneas ~217-285) falla contra el backend real: el backend la rechaza (400 por campo desconocido, o 401 por falta de autenticación) y la app cae al mock o muestra un rechazo genérico, según el punto exacto del fallo.

## Diagnóstico

- Archivo y línea donde está la causa real: `src/services/incident.service.ts`, función `createIncident` (líneas 217-285), concretamente la construcción del `FormData` (líneas 222-254) y la llamada a `fetchWithTimeout` sin `headers` (líneas 260-267).
- Causa, ya confirmada (no es hipótesis): el backend integró el 2026-11-09 JWT + Prisma en incidencias (`backend/docs/spec/features/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md`), lo que cambió el contrato de `POST /incidents` en dos frentes a la vez:
  1. **Autenticación obligatoria.** El endpoint ahora exige `Authorization: Bearer <JWT>` (`JwtAuthGuard` + `AccesoIncidenciasGuard`, `backend/src/incidents/incidents.controller.ts:242`). `createIncident` nunca mandaba ninguna cabecera (ni `Authorization` ni `Content-Type`); el `fetchWithTimeout` de las líneas 260-267 se llama sin `headers`.
  2. **Contrato de cuerpo distinto.** `createIncident` sigue enviando `multipart/form-data` con `civicId` (línea 231) e imágenes (líneas 252-254) en el body, pero el `CreateIncidentPipe` del backend (`backend/src/incidents/create-incident.pipe.ts:4-13`) solo acepta JSON con los campos `title, description, categoryId, category, latitude, longitude, accuracy, urbanAssetId` — cualquier clave fuera de esa lista (`civicId`, `images`) hace que el pipe lance `BadRequestException('Unknown field: ...')` (línea 29). El propietario de la incidencia se deriva del JWT (`usuario.ciudadanoId`) en el backend, nunca del body.
  3. El backend ya no soporta imágenes en absoluto en este endpoint (ni multipart ni endpoint propio): `images` siempre vuelve `[]` por contrato documentado (`backend/docs/spec/endpoint/post-incidents/README.md`).
- Es la continuación directa del bug ya documentado en `docs/spec/bugs/registro-incidencia/23-10-26-subida-imagenes-formdata-no-soportada.md` (mismo flujo de `createIncident`), pero con una causa nueva: en aquel bug el fallo era de serialización en el cliente (`FormData` con imágenes); en este, el fallo es que el cliente sigue hablando el contrato antiguo (multipart, sin token) contra un backend que ya solo acepta el contrato nuevo (JSON, con token).
- Alcance del fallo: aislado a `createIncident` en el camino backend real (el único que llega a construir y enviar esta petición). El camino mock (`createIncidentOnMock`) no se ve afectado y no se toca, por la regla de "nunca borrar simulación mock" de `CLAUDE.md`.
- Inconsistencia conocida, no parte de este bug: `fetchMyIncidents` (`GET /incidents?civicId=...`, mismo archivo, líneas 331-358) tampoco manda `Authorization`, pero el backend documenta esa ruta como intencionalmente sin guard ("Prototipo sin autenticación... DEUDA-27-01", ver `@Get()` en `incidents.controller.ts`), así que hoy esa ruta no está rota. Se menciona aquí solo como contexto; no se corrige en este bug.
- El fallo de autenticación/contrato está en el frontend (el cliente sigue hablando un contrato obsoleto), no en el backend: el backend ya documenta y aplica correctamente el contrato nuevo.

## Corrección aplicada

Actualizar `createIncident` para que hable el contrato nuevo del backend:

- `createIncident` recibe un nuevo parámetro `accessToken: string`.
- El camino backend real pasa de `FormData` a un body JSON (`JSON.stringify`) con solo los campos permitidos por `CreateIncidentPipe` (`title`, `description?`, `categoryId?`, `category?`, `latitude?`, `longitude?`, `accuracy?`), sin `civicId` ni `images`.
- Se añade `headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }` a la llamada a `fetchWithTimeout`.
- `hooks/use-create-incident.ts` recibe `accessToken` además de `civicId`, con el mismo guard que ya existe para `civicId == null` (si no hay token, no se intenta el envío y se informa a la UI).
- `app/incidents/new.tsx` saca `token` de `useSession()` y pasa `token?.accessToken ?? null`.

No se añaden mejoras ni refactors fuera de este cambio de contrato (p. ej. no se reintroduce el envío de imágenes: el backend no las soporta).

Nota de trazabilidad (organizador, 2026-11-13): al retirar la construcción de `FormData` del camino backend real, la función `buildImagePart` y el `import { File } from 'expo-file-system'` de `incident.service.ts` quedaron sin ninguna llamada/uso (confirmado por grep). Se instruyó al `dev` eliminarlos sin generar subtarea nueva, para evitar el warning de lint por import/función no usados; queda pendiente de que el `dev` aplique la limpieza y el `compiler` confirme `pnpm expo lint` limpio.

Nota de trazabilidad (organizador, 2026-11-13): en la misma pasada de `pnpm expo lint` de este cierre conjunto, el `compiler` reportó también un ERROR bloqueante `react-hooks/set-state-in-effect` en `src/hooks/use-incident-detail.ts:41` (hook del bug hermano `docs/spec/bugs/mis-incidencias/13-11-26-token-ausente-get-incidente.md`, no de este archivo). No afecta a ningún archivo de este bug; se documenta aquí solo por trazabilidad del cierre conjunto — el detalle y la instrucción al `dev` están en el documento hermano.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `createIncident` recibe `accessToken`; cambia el body del camino backend real de `FormData` a JSON con solo los campos permitidos por `CreateIncidentPipe`; añade `headers` (`Authorization`, `Content-Type`) a la petición |
| modificar | `src/hooks/use-create-incident.ts` | `useCreateIncident` recibe y threadea `accessToken` hacia `createIncident`, con el mismo guard que ya existe para `civicId == null` |
| modificar | `src/app/incidents/new.tsx` | obtiene `token` de `useSession()` y pasa `token?.accessToken ?? null` al hook |
| modificar | `src/__tests__/services/incident.service.test.ts` | actualiza los tests del camino backend real de `createIncident` al nuevo contrato (JSON, `Authorization`, sin `civicId`/`images`) |
| modificar | `src/__tests__/hooks/use-create-incident.test.tsx` | actualiza los tests del hook al nuevo parámetro `accessToken` |
| modificar | `src/__tests__/app/incidents/new-incident-screen.test.tsx` | actualiza los tests de la pantalla para la obtención y paso del `accessToken` desde `useSession()` |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: confirmado por diagnóstico estático (contrato documentado por el backend — `CreateIncidentPipe` solo acepta `title, description, categoryId, category, latitude, longitude, accuracy, urbanAssetId`, `JwtAuthGuard` exige `Authorization` — contra el código previo de `createIncident`, que mandaba `FormData` con `civicId`/`images` y sin ninguna cabecera). No se ha levantado el backend real para reproducir en vivo: no se pidió explícitamente y no es necesario para confirmar la causa (política de backend en `CLAUDE.md`).
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: verificado con `pnpm jest src/__tests__/services/incident.service.test.ts` — la petición real que construye `createIncident` sale como JSON (`Authorization: Bearer <token>`, `Content-Type: application/json`, body sin `civicId` ni `images`), comprobado contra `fetchWithTimeout` mockeado (p. ej. tests "envía exactamente las cabeceras Authorization (Bearer) y Content-Type application/json" y "usa el accessToken recibido como argumento en la cabecera Authorization"). No se ha probado contra un backend real en ejecución (fuera del alcance que pide `CLAUDE.md`: solo se comprueba que el front envía correctamente, no que el backend responda).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos: re-ejecutado el 2026-11-13 por el organizador — `pnpm tsc --noEmit` sin salida (0 errores); `pnpm expo lint` → 0 errores, 2 warnings preexistentes sin relación (`login-session-restore.test.tsx`, `@typescript-eslint/no-require-imports`).
- [x] Tests en `src/__tests__/services/incident.service.test.ts`, `src/__tests__/hooks/use-create-incident.test.tsx` y `src/__tests__/app/incidents/new-incident-screen.test.tsx` actualizados y en verde: re-ejecutado el 2026-11-13 por el organizador — los 5 suites de este fix conjunto (incluyendo los del bug hermano) pasan (176/176 tests); `pnpm jest` completo → 43 suites / 628 tests, todos en verde.

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-11-13.
- Evidencia de que no reaparece: `pnpm tsc --noEmit` sin errores; `pnpm expo lint` → 0 errores (2 warnings preexistentes sin relación); `pnpm jest` → 43 suites / 628 tests en verde, incluidos los 3 archivos de test de este documento (`incident.service.test.ts`, `use-create-incident.test.tsx`, `new-incident-screen.test.tsx`), que comprueban con `fetchWithTimeout` mockeado que la petición real de `createIncident` sale con `Authorization: Bearer <token>`, `Content-Type: application/json` y body JSON sin `civicId`/`images`. Se eliminó además el código muerto que dejó de usarse al retirar el `FormData` (`buildImagePart`, `import { File } from 'expo-file-system'`), confirmado por `grep` (sin resultados).
- Limitaciones y pendientes:
  - No se verifica ni se depura el backend (ya documentado y asumido correcto); no se reintroduce el envío de imágenes seleccionadas por el usuario en el camino backend real, porque el backend actual no las soporta en este endpoint (contrato documentado) — sí siguen funcionando con normalidad en el camino mock (`createIncidentOnMock`), que no se ha tocado.
  - `fetchMyIncidents` sigue sin `Authorization` a propósito (el backend documenta esa ruta como sin guard, deuda DEUDA-27-01); no forma parte de esta corrección.
  - Con sesión activa pero sin `accessToken` (caso raro: `autoLoginFailed` tras registro), `useCreateIncident` bloquea el envío con el mensaje de "sin sesión" en vez de intentar la petición real. Es coherente con que el backend la rechazaría igualmente con 401, pero queda anotado como comportamiento a vigilar.
