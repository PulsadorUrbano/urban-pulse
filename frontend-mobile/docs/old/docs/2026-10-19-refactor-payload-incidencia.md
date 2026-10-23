# Refactor del payload de incidencia con coordenadas inline (2026-10-19)

## Contexto / motivo

El móvil hacía **dos POST** al mock: creaba una `Location` (`createLocation`) para obtener un
`locationId` y luego enviaba una incidencia de 13 campos (`status`, `priority`, `createdAt`,
`locationId`, `urbanAssetId`, `departmentId`, `teamId`, `technicianId`...). Se simplifica a un único
POST con **8 campos** y coordenadas inline, alineado con la forma del backend.
Nota de especificación: `spec/refactor/001-registro-incidencia/payload-incidencia-inline.md` (refactor, sin feature ni
cambios en el roadmap).

## Decisiones

- Payload de 8 campos: `title`, `description`, `latitude`, `longitude`, `accuracy`, `civicId`,
  `categoryId`, `category`.
- `civicId` **TEMPORAL** = `'a62718e8563'` (constante `TEMPORARY_CIVIC_ID`, inyectada de forma
  centralizada en `createIncident`).
- `latitude`/`longitude`/`accuracy` son opcionales en `CreateIncidentInput` y el servicio los
  normaliza a `null` (sin ubicación, permiso denegado o servicios desactivados).
- Se elimina el flujo `Location`/`locationId` y `src/services/location.service.ts`.
- Sin cambios: `device-location.ts`, `db.json`, manejo de errores y persistencia de fotos.

## Subtareas

- [x] 1. Tipos: `CreateIncidentInput` sin `locationId`, con coordenadas; nueva `IncidentPayload`.
- [x] 2. Servicio: `TEMPORARY_CIVIC_ID`, payload de 8 campos, sin `DEFAULT_INCIDENT_STATUS`.
- [x] 3. Pantalla `incidents/new.tsx`: coordenadas inline, sin `createLocation`.
- [x] 4. Hook `use-create-incident.ts`: ajuste de tipos.
- [x] 5. Eliminar `location.service.ts` y su test; recortar `types/location.ts`.
- [x] 6. Tests reescritos/ajustados.
- [x] 7. Calidad: tsc, lint y jest en verde.
- [x] 8. Docs de sesión (este archivo).

## Ficheros tocados

| Fichero | Cambio |
|---|---|
| `src/types/incident.ts` | Modificado |
| `src/types/location.ts` | Modificado (solo `LocationCoordinates`) |
| `src/services/incident.service.ts` | Modificado |
| `src/app/incidents/new.tsx` | Modificado |
| `src/hooks/use-create-incident.ts` | Modificado |
| `src/services/location.service.ts` | Borrado |
| `src/__tests__/services/location.service.test.ts` | Borrado |
| `src/__tests__/services/incident.service.test.ts` | Reescrito |
| `src/__tests__/app/incidents/new-incident-screen.test.tsx` | Reescrito |
| `src/__tests__/hooks/use-create-incident.test.tsx` | Reescrito |

## Verificación

- `npx tsc --noEmit`  0 errores
- `npx expo lint`  limpio
- `npm test`  124/124 tests, 14 suites, sin regresiones
- 0 referencias huérfanas a `location.service`, `createLocation` o `Location`.

## Pendiente / diferido

- `civicId` es **provisional** hasta integrar la sesión real del ciudadano (ver issue #61).
- **No se conecta el backend todavía**: todo sigue contra `json-server` (`db.json`).
- Verificación manual end-to-end con `npm run mock` (con y sin ubicación) no ejecutada en esta sesión.
