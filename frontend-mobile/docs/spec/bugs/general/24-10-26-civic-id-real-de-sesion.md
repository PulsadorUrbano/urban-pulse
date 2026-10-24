# 24-10-26 — Bug: `civicId` hardcodeado en vez del de la sesión real + motivo del backend oculto en "Mis incidencias"

> Afecta a varias features a la vez (identidad de usuario, registro de incidencia y "Mis incidencias"); se documenta aquí, análogo a `refactor/independent/`, en vez de duplicarlo en `bugs/registro-incidencia/` y `bugs/mis-incidencias/`.

- Feature afectada: transversal — `docs/spec/features/24-10-26-registro-ciudadano/` (identidad del usuario), `docs/spec/features/24-10-26-registro-incidencia/` si existiera (creación de incidencia) y `docs/spec/features/24-10-26-mis-incidencias/` (listado propio).
- Rama: feature/registro-ciudadano-frontend-mobile.
- Última actualización: 2026-10-24.
- Estado: Corregido y verificado.
- Origen: hallazgo propio al revisar `src/services/incident.service.ts` tras la feature de registro ciudadano — toda incidencia se crea y se consulta con el `id` de la cuenta de demo `sofia13`, no con el usuario logueado.

## Síntoma observado

1. Cualquier usuario logueado que registra una incidencia desde `src/app/incidents/new.tsx` la registra, en realidad, a nombre del ciudadano `sofia13` (`id: "20ac442e-0f00-4fe4-bad3-61c8e8e0bff5"`), porque `createIncident`/`createIncidentOnMock` usan una constante `TEMPORARY_CIVIC_ID` en vez del `id` de la sesión activa.
2. Por el mismo motivo, "Mis incidencias" (`src/app/(tabs)/my-incidents.tsx`) consulta con `user?.id`, que para usuarios registrados vía mock (`mayte`, `patri`) es un `id` autogenerado por `json-server` (p. ej. `"a62218e7563"`, `"6pCIt-utylE"`) que no es UUID; si el backend real exige que `civicId` sea UUID, la petición se rechaza para cualquier usuario que no sea `sofia13`.
3. Además, `incidents/new.tsx` no tiene ningún guard de sesión: es alcanzable sin usuario logueado (a diferencia de `my-incidents.tsx`, que ya redirige a `/login`).
4. Cuando el backend rechaza la petición de "Mis incidencias" (`!response.ok` en `fetchMyIncidents`), la UI ya pinta `errorMessage` en rojo `#d92d20` (correcto), pero el texto mostrado es el genérico `'No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.'`: nunca se ve el motivo real que devuelve el backend, a diferencia de `createIncident`, que sí lo añade entre paréntesis vía `buildBackendRejectionMessage`.

## Diagnóstico

- Archivo y línea donde está la causa real:
  - `src/services/incident.service.ts:39` — constante `TEMPORARY_CIVIC_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5'` (comentario: "TEMPORAL: id del ciudadano `sofia13`... Se sustituirá cuando exista una sesión real").
  - `src/services/incident.service.ts:151` (`createIncidentOnMock`) y `:233` (`createIncident`) — ambas usan `TEMPORARY_CIVIC_ID` en vez de recibir el civicId de quien llama.
  - `src/services/incident.service.ts:301` y `:347` (`fetchMyIncidentsFromMock`/`fetchMyIncidents`) — en la rama `!response.ok` se lanza siempre el mensaje genérico `'No se pudieron obtener tus incidencias...'`, sin usar `extractBackendErrorMessage`/`buildBackendRejectionMessage` como sí hace `createIncident`.
  - `src/hooks/use-create-incident.ts:17` y `:27` — `useCreateIncident()` no recibe ni reenvía ningún civicId a `createIncident`.
  - `src/app/incidents/new.tsx` — no importa `useSession` ni `Redirect`; no hay guard de sesión y `useCreateIncident()` se llama sin civicId.
  - `src/app/(tabs)/my-incidents.tsx:19` — `useMyIncidents(user?.id ?? null)` usa el `id` interno de json-server en vez de una identidad estable e independiente del almacén mock.
  - `src/types/user.ts:7-14` (`User`) — no existe ningún campo de identidad estable (UUID) separado del `id` interno de `json-server`.
  - `src/services/auth.service.ts:95-99` (`register`) — el body del POST a `USERS_ENDPOINT` no incluye ningún `civicId`.
  - `db.json` (colección `users`) — `sofia13` tiene `id` con forma de UUID (coincide por casualidad con `TEMPORARY_CIVIC_ID`); `mayte` (`"a62218e7563"`) y `patri` (`"6pCIt-utylE"`) no.
  - `src/services/session-user-storage.service.ts:28` y `:37` — la validación de forma y la reconstrucción campo a campo de `loadSessionUser` no conocen ningún campo `civicId`.
- Causa: la feature de registro de incidencia (anterior a tener sesión real) dejó un `TEMPORARY_CIVIC_ID` a propósito como marcador temporal, documentado en su propio comentario como pendiente de sustituir. Al añadirse después la sesión real (login/registro), nunca se conectó ese `civicId` con `user.id`. Y el `id` interno de `json-server` no es un UUID controlable por el cliente: se confirmó revisando el código instalado de `json-server@^1.0.0-beta.15`, que ignora cualquier `id` enviado en el body de un `POST` y lo fuerza siempre desde la URL en `PUT`/`PATCH` — por lo que no se puede forzar que el mock genere UUIDs para usuarios nuevos sin introducir un campo de identidad propio, independiente del `id` interno.
- Alcance del fallo: afecta a la creación de toda incidencia (siempre se le asigna al ciudadano `sofia13`, nunca al usuario real) y a la consulta de "Mis incidencias" para cualquier usuario cuyo `id` de `json-server` no sea un UUID válido (en la práctica, cualquier usuario registrado desde la app salvo `sofia13`, cuyo `id` de fixture ya era un UUID por coincidencia). No afecta al detalle de una incidencia por `id` (`incidents/[id].tsx`), que no depende de civicId.
- El fallo de UUID al llamar al backend real es un rechazo legítimo del backend ante un dato mal formado que envía el cliente (civicId no-UUID): no es un fallo del backend a reportar y depurar aparte, es la causa raíz a corregir en el frontend añadiendo una identidad propia (`civicId`) que sí sea siempre UUID.

## Corrección aplicada

Se añade un campo `civicId` (UUID) al dominio de usuario, generado en el cliente de forma independiente del `id` interno de `json-server` (que el mock no permite controlar vía HTTP), y se usa en todo el dominio de incidencias en lugar de `user.id`. Además, se generaliza `buildBackendRejectionMessage` para que también se use en `fetchMyIncidents`, mostrando el motivo real del rechazo del backend en vez de un mensaje genérico.

No se introduce ninguna dependencia nueva: el UUID se genera manualmente con `Math.random()` (`generateMockUuid`, explícitamente documentado como solo válido para datos de mock/desarrollo, nunca para seguridad real).

### Subtareas (ejecución ordenada, una por el agente `dev`)

- **SUBTASK-1 — Identidad `civicId` end-to-end** (`src/utils/uuid.ts`, `src/types/user.ts`, `src/services/auth.service.ts`, `db.json`, `src/services/session-user-storage.service.ts`) — Hecho:
  1. Crear `src/utils/uuid.ts` con `generateMockUuid(): string` (UUID v4 manual vía `Math.random()`, comentario explícito de que es solo para mock/desarrollo).
  2. En `src/types/user.ts`, añadir `civicId: string` a `User` (comentario: identidad estable para incidencias, UUID, distinta del `id` interno de json-server). `SessionUser` la hereda automáticamente vía `Omit<User, 'password'>`.
  3. En `src/services/auth.service.ts` (`register`), generar `civicId` con `generateMockUuid()` e incluirlo en el body del POST junto a `username`/`email`/`password`/`role` (sin tocar el envío de `id`, que sigue sin mandarse).
  4. En `db.json`, backfill de `civicId` en los 3 usuarios existentes: `sofia13` → `"20ac442e-0f00-4fe4-bad3-61c8e8e0bff5"` (igual que su `id` actual); `mayte` → `"6219c6e4-3813-4b8f-92e1-8ba4700a5bfb"`; `patri` → `"343db3b2-655d-419e-ba17-37d1262cd979"`. No tocar nada más del fichero.
  5. En `src/services/session-user-storage.service.ts`, añadir `civicId` a la validación de forma de `loadSessionUser` (`typeof parsedValue.civicId !== 'string'`) y a la reconstrucción campo a campo del objeto devuelto (sin usar spread, igual que el resto de campos).
- **SUBTASK-2 — `incident.service.ts`: `civicId` como parámetro + mensaje real del backend** — Hecho:
  1. Eliminar la constante `TEMPORARY_CIVIC_ID` (línea ~39) y su comentario.
  2. `createIncident(input, imageUris, civicId: string)` y `createIncidentOnMock(input, imageUris, civicId: string)`: añadir `civicId` como nuevo parámetro y usarlo donde antes se usaba la constante (`formData.append('civicId', civicId)` en `createIncident`; `civicId` en el `IncidentPayload` de `createIncidentOnMock`).
  3. Generalizar `buildBackendRejectionMessage` a `async function buildBackendRejectionMessage(response: Response, genericMessage: string): Promise<string>`. Actualizar la llamada existente en `createIncident` pasando `'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'` como segundo argumento.
  4. En `fetchMyIncidents`, en la rama `!response.ok`, usar la misma función pasando `'No se pudieron obtener tus incidencias. Inténtalo de nuevo más tarde.'` en vez de lanzar el mensaje genérico a pelo. No tocar `fetchMyIncidentsFromMock` (mock, sin motivo de backend que extraer) ni la UI de `my-incidents.tsx` (ya pinta `errorMessage` en rojo `#d92d20`, solo cambia el contenido del mensaje).

  > **Desviación respecto al plan original (aceptada por la usuaria):** el plan inicial proponía la firma `createIncident(input, imageUris, civicId)` / `createIncidentOnMock(input, imageUris, civicId)` (civicId como tercer parámetro). El dev implementó en su lugar `createIncident(input, civicId, imageUris = [])` y `createIncidentOnMock(input, civicId, imageUris)` — civicId como **segundo** parámetro, antes de `imageUris` (que conserva su valor por defecto `[]`). Motivo: más idiomático en TypeScript tener primero los parámetros obligatorios (`input`, `civicId`) y al final el opcional con default (`imageUris`). No cambia ningún comportamiento ni contrato externo (UI/mock/backend); solo afecta al orden de los argumentos en las llamadas internas y en los tests. Confirmado y aceptado por la usuaria antes del cierre.

- **SUBTASK-3 — Wiring final: hook + pantallas** — Hecho:
  1. `src/hooks/use-create-incident.ts`: cambiar la firma a `useCreateIncident(civicId: string | null)` (mismo patrón que `useMyIncidents(civicId)`); en `submitIncident`, si `civicId == null`, fijar `errorMessage = 'No se pudo identificar tu sesión. Vuelve a iniciar sesión.'` y devolver `null` sin llamar a `createIncident`; si no, llamar a `createIncident(input, civicId, imageUris)` (orden real de parámetros, ver desviación documentada en SUBTASK-2).
  2. `src/app/incidents/new.tsx`: importar `useSession` (de `@/hooks/use-session`) y `Redirect` (de `expo-router`, junto al `router` ya importado); añadir el guard `if (!isRestoringSession && !user) return <Redirect href="/login" />;` (los hooks se llaman antes de este return condicional, igual que en `my-incidents.tsx`); pasar `user?.civicId ?? null` a `useCreateIncident(...)`.
  3. `src/app/(tabs)/my-incidents.tsx`: cambiar `useMyIncidents(user?.id ?? null)` por `useMyIncidents(user?.civicId ?? null)`.

Como parte de la misma tarea (no opcional, cada subtarea actualiza también sus tests correspondientes antes de pasar a la siguiente):

- `src/__tests__/services/auth.service.test.ts` (líneas ~229, 237, 292, parte de SUBTASK-1): los `toEqual` exactos del body del POST y el test `'el body del POST no incluye id'` deben reflejar el nuevo campo `civicId` (sigue sin incluir `id`), validando que `civicId` tiene forma de UUID.
- `src/__tests__/services/session-user-storage.service.test.ts` (parte de SUBTASK-1): fixtures con `civicId`.
- `src/__tests__/services/incident.service.test.ts` (líneas 57, 135, 280, 667, 689, 744, parte de SUBTASK-2): sustituir la constante local duplicada `TEMPORARY_CIVIC_ID` por un `civicId` de fixture pasado explícitamente a `createIncident`/`fetchMyIncidents` en las llamadas del test.
- `src/__tests__/hooks/use-create-incident.test.ts` (parte de SUBTASK-3): adaptar a la nueva firma `useCreateIncident(civicId)`, incluyendo un caso para `civicId === null`.
- `src/__tests__/app/incidents/new-incident-screen.test.tsx` (parte de SUBTASK-3): mockear `useSession` y verificar el guard de redirección sin sesión, y que se pasa `user.civicId` al hook.
- `src/__tests__/app/tabs/my-incidents-screen.test.tsx` (parte de SUBTASK-3): verificar que se llama a `useMyIncidents` con `user.civicId` (no `user.id`).

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| crear | `src/utils/uuid.ts` | `generateMockUuid()`: UUID v4 manual sin dependencias, solo para mock/desarrollo. |
| modificar | `src/types/user.ts` | Añade `civicId: string` a `User` (heredado por `SessionUser`). |
| modificar | `src/services/auth.service.ts` | `register` genera y envía `civicId` en el body del POST. |
| modificar | `db.json` | Backfill de `civicId` en los 3 usuarios existentes de `users`. |
| modificar | `src/services/session-user-storage.service.ts` | `loadSessionUser` valida y reconstruye también `civicId`. |
| modificar | `src/services/incident.service.ts` | Elimina `TEMPORARY_CIVIC_ID`; `createIncident`/`createIncidentOnMock` reciben `civicId` por parámetro; `buildBackendRejectionMessage` generalizado y reutilizado en `fetchMyIncidents` para mostrar el motivo real del backend. |
| modificar | `src/hooks/use-create-incident.ts` | `useCreateIncident(civicId)`: sin sesión, error claro sin llamar al servicio; con sesión, reenvía `civicId`. |
| modificar | `src/app/incidents/new.tsx` | Añade guard de sesión (`useSession` + `Redirect`) y pasa `user?.civicId ?? null` al hook. |
| modificar | `src/app/(tabs)/my-incidents.tsx` | Usa `user?.civicId` en vez de `user?.id` para `useMyIncidents`. |
| modificar | `src/__tests__/services/auth.service.test.ts` | Refleja `civicId` en el body esperado del POST de registro. |
| modificar | `src/__tests__/services/session-user-storage.service.test.ts` | Fixtures con `civicId`. |
| modificar | `src/__tests__/services/incident.service.test.ts` | Sustituye la constante local `TEMPORARY_CIVIC_ID` por un `civicId` de fixture pasado explícitamente. |
| modificar | `src/__tests__/hooks/use-create-incident.test.ts` | Cubre la nueva firma `useCreateIncident(civicId)`, incluido `civicId === null`. |
| modificar | `src/__tests__/app/incidents/new-incident-screen.test.tsx` | Cubre el guard de sesión y el paso de `user.civicId` al hook. |
| modificar | `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Cubre que se llama a `useMyIncidents` con `user.civicId`. |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: confirmado por código (sin backend real levantado, según política de este repo) que `TEMPORARY_CIVIC_ID` era la única fuente de `civicId` en `createIncident`/`createIncidentOnMock`, y que `my-incidents.tsx` usaba `user?.id` (no UUID para `mayte`/`patri` en `db.json`).
- [x] Aplicar la corrección (SUBTASK-1 → SUBTASK-2 → SUBTASK-3, en ese orden; ver desviación de orden de parámetros documentada en SUBTASK-2/3).
- [x] Confirmar que el síntoma ya no ocurre: una incidencia creada por un usuario logueado (no `sofia13`) queda asociada a su propio `civicId`; "Mis incidencias" consulta con `user.civicId` (UUID) para cualquier usuario, incluidos los registrados vía mock; `incidents/new.tsx` redirige a `/login` sin sesión; un rechazo del backend en "Mis incidencias" muestra el motivo real, no solo el genérico. Cubierto por los tests nuevos/actualizados de las 3 subtareas (ver "Archivos tocados").
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos. Veredicto del coordinador: `npx tsc --noEmit` → 0 errores; `npx expo lint` → 0 errores (solo los 2 warnings preexistentes y ajenos ya conocidos en `login-session-restore.test.tsx`).
- [x] `npx jest` (suite completa) en verde, incluidos los tests actualizados listados en "Archivos tocados", sin regresiones. Resultado: 41/41 test suites, 576/576 tests, 0 fallos (incluye 14 tests nuevos + ~60 llamadas existentes ajustadas en `incident.service.test.ts`, 110/110 en verde ahí; 54 tests en verde en las 4 suites de SUBTASK-3: `use-create-incident.test.tsx`, `new-incident-screen.test.tsx`, `my-incidents-screen.test.tsx`, `my-incidents-focus-reload.test.tsx`).

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-10-24.
- Evidencia de que no reaparece: veredicto final del coordinador ✅ PASA — `npx tsc --noEmit` con 0 errores; `npx expo lint` con 0 errores (solo 2 warnings preexistentes y ajenos en `login-session-restore.test.tsx`, no relacionados); `npx jest` (suite completa) con 41/41 test suites y 576/576 tests, sin regresiones. Específicamente: SUBTASK-1 (identidad `civicId` end-to-end) cubierta por los fixtures actualizados en 10 archivos de test existentes; SUBTASK-2 (`incident.service.ts`) cubierta por 14 tests nuevos y ~60 llamadas existentes ajustadas, 110/110 en verde en `incident.service.test.ts`; SUBTASK-3 (wiring final) cubierta por 54 tests en verde en 4 suites (`use-create-incident.test.tsx`, `new-incident-screen.test.tsx`, `my-incidents-screen.test.tsx`, `my-incidents-focus-reload.test.tsx`).
- Limitaciones y pendientes: no se ha levantado backend real en este flujo (política del repo: no verificar ni depurar el backend); la verificación del contrato UUID se limita a lo que el frontend controla y a sus tests. Queda pendiente, como en bugs/features anteriores de este mismo módulo, la confirmación end-to-end manual en dispositivo real (crear incidencia con un usuario distinto de `sofia13` y comprobar en "Mis incidencias" que aparece asociada a su propio `civicId`).
