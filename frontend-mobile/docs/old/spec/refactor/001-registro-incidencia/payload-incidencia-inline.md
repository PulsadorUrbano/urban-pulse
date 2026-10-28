# Payload de incidencia simplificado con coordenadas inline

> Estado: **completado** (iniciado y cerrado el 2026-10-19). Calidad final: `tsc` 0 errores, `expo lint` limpio, `jest` 124/124 (14 suites). Refactor del flujo de registro de incidencia.
> No es una feature nueva: no tiene carpeta en `spec/features/` ni entrada propia en el roadmap.
> Rama: `feature/registro-incidencia-front-mobile`.
> Plan aprobado: `~/.claude/plans/vast-chasing-eagle.md`.

## Motivo

- Hoy el móvil hace **dos POST** al mock: crea una `Location` (`createLocation`) para obtener un
  `locationId` y luego envía una incidencia de **13 campos** (`status`, `priority`, `createdAt`,
  `locationId`, `urbanAssetId`, `departmentId`, `teamId`, `technicianId`...).
- Se simplifica el payload a **8 campos** con las coordenadas **inline**, alineado con la forma del
  backend. **NO se conecta el backend todavía**: todo sigue contra `json-server` (`db.json`).

## Payload nuevo (exactamente 8 campos)

| Campo         | Tipo             | Origen                                                        |
| ------------- | ---------------- | ------------------------------------------------------------- |
| `title`       | `string`         | formulario (trim)                                             |
| `description` | `string`         | formulario (trim)                                             |
| `latitude`    | `number \| null` | `getCurrentCoordinates()`; `null` sin ubicación               |
| `longitude`   | `number \| null` | `getCurrentCoordinates()`; `null` sin ubicación               |
| `accuracy`    | `number \| null` | `getCurrentCoordinates()`; `null` sin ubicación               |
| `civicId`     | `string`         | **TEMPORAL** `'a62718e8563'` (ciudadano `sofia13`, role civic) |
| `categoryId`  | `string \| null` | selector de categoría (`null` si no hay)                      |
| `category`    | `string \| null` | categoría libre normalizada (trim, `null` si vacía)           |

Decisiones:

- `civicId` se define como constante `TEMPORARY_CIVIC_ID` marcada como provisional e inyectada de
  forma centralizada en `createIncident`, para retirarla cuando exista sesión real.
- La ubicación sigue siendo **opcional**: toggle apagado, servicios desactivados, permiso denegado
  o coordenadas `null` envían los tres campos a `null`.

## Qué se elimina

- Flujo `Location` / `locationId`: la pantalla deja de llamar a `createLocation`.
- `src/services/location.service.ts` y `src/__tests__/services/location.service.test.ts`
  (borrado confirmado por el usuario).
- Interfaz `Location` de `src/types/location.ts` (se conserva solo `LocationCoordinates`, usada por
  `device-location.ts`).
- De `incident.service.ts`: `DEFAULT_INCIDENT_STATUS` y los campos `status`, `priority`,
  `createdAt`, `locationId`, `urbanAssetId`, `departmentId`, `teamId`, `technicianId`.

## Sin cambios

- `src/services/device-location.ts` y `db.json` (la colección `locations` deja de crecer).
- Manejo de errores de `createIncident` (`RequestTimeoutError`, red, `!response.ok`), endpoint
  `INCIDENTS_ENDPOINT` y persistencia de fotos (`createImage` + `Promise.allSettled`).

## Checklist de subtareas

- [x] 1. Tipos: `CreateIncidentInput` sin `locationId` y con `latitude/longitude/accuracy`; nueva `IncidentPayload`.
- [x] 2. Servicio: `TEMPORARY_CIVIC_ID`, payload de 8 campos, sin `DEFAULT_INCIDENT_STATUS`.
- [x] 3. Pantalla `incidents/new.tsx`: coordenadas inline, `submitWithCoordinates`, sin `createLocation`.
- [x] 4. Hook `use-create-incident.ts`: ajuste de tipos si procede.
- [x] 5. Eliminar `location.service.ts` y su test; recortar `types/location.ts`.
- [x] 6. Tests: reescribir `incident.service.test.ts` y `new-incident-screen.test.tsx`; revisar `device-location.test.ts` y `use-create-incident.test.tsx`.
- [x] 7. Calidad: `npx tsc --noEmit`, `npx expo lint`, `npx jest --ci` en verde.
- [x] 8. Docs de sesión: `docs/2026-10-19-refactor-payload-incidencia.md`.

## Verificación

1. `npx tsc --noEmit` y `npx expo lint` sin errores (cuidado con imports huérfanos de `Location`).
2. `npx jest --ci` con todas las suites en verde.
3. Mock end-to-end (`npm run mock`): registrar con y sin ubicación; el registro creado tiene solo
   los 8 campos (+ `id`) y no se crea ninguna entrada en `locations`.

## Fuera de alcance

- No se conecta ni consulta el backend NestJS; no se toca `backend/`.
- La asociación real del ciudadano queda pendiente de sesión/token.

## Trazabilidad

- Nota de sesión: `docs/2026-10-19-refactor-payload-incidencia.md` (creada, subtarea 8).
