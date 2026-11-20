# Sesión — 2026-11-20 · Token en el listado y el detalle de incidencias (PR #193)

## Contexto

Implementación del plan de `docs/spec/bugs/mis-incidencias/20-11-26-token-listado-y-detalle-en-pr-193.md` (opción 2 de artina09): traer a la #193 el arreglo del token de la PR #158, usando `AuthToken | null` para que una sesión mock no envíe su token falso al backend.

## Alcance

- Servicio, hooks y pantallas de «Mis incidencias» y del detalle, con sus tests.
- Fuera de alcance: fotos duplicadas al reintentar (issue #200), `db.json` (cambios sin confirmar de la usuaria), commits.

## Cambios

| Archivo | Cambio |
| --- | --- |
| `src/services/incident.service.ts` | `fetchMyIncidents` y `fetchIncidentById` reciben `AuthToken | null`: Bearer, mock directo, sin token, 401 |
| `src/hooks/use-my-incidents.ts`, `src/hooks/use-incident-detail.ts` | Reciben el token; dependencias y `requestKey`; caso sin token |
| `src/app/(tabs)/my-incidents.tsx`, `src/app/incidents/[id].tsx` | Pasan el token de `useSession()` |
| `src/__tests__/` | Tests de servicio, hooks y pantallas actualizados |

## Checklist de la sesión

- [x] ST1 Servicio con token y tests.
- [x] ST2 Hooks, pantallas y tests.
- [x] ST3 Lint, typecheck y tests.
- [x] ST4 Documentación de cierre.
- [x] Prueba manual contra el backend de la PR #185: login, `POST /incidents` 201, `GET /incidents` 200 y `GET /incidents/:id` 200 sin ningún 401. Las fotos no se pudieron subir (503) porque el entorno local no tiene S3 configurado; se comentó en la PR #185 junto con `DB_SYNC` en Docker y `API_PORT=3001`.
- [x] Añadir el enlace a la #200 en la descripción de la #193.
- [ ] Cerrar la #158 una vez mergeada la #193. La #158 ya tiene un comentario que indica dónde quedó el arreglo y sigue abierta hasta el merge.

## Estado / Verificación

- Antes del cambio, los 8 tests nuevos del servicio fallaban (reproducción).
- `pnpm expo lint` exit 0, `pnpm tsc --noEmit` exit 0, `pnpm test` 62/62 suites y 797/797 tests.
- Prueba manual contra el backend real hecha; fotos sin probar por falta de S3. Fallo conocido: fotos duplicadas al reintentar (#200).
