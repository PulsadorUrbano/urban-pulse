# Sesión — 2026-11-18 · Adaptar el registro de incidencias al contrato de la PR #185 (issue #191)

## Contexto

La issue #191 (relacionada con la PR #185 del backend, `fix/prisma-model-integrity`, aún abierta) pide adaptar el móvil al nuevo contrato de `POST /incidents`:

- JSON autenticado con JWT, sin `civicId` ni archivos.
- Categoría del catálogo activo y coordenadas obligatorias.
- Fotos subidas después a `POST /incidents/:id/images`, con sus errores gestionados por separado y sin duplicar la incidencia.

Se creó la rama `refactor/191-adaptar-frontend-mobile-contrato-incidencias` desde `refactor/182-limpieza-frontend-mobile`.

## Alcance

- Lectura de la issue #191 y del contrato real en la PR #185: controlador, pipe de validación, servicio de fotos y `backend/docs/spec/endpoint/post-incidents/README.md` (solo lectura).
- Implementación del refactor y actualización de los tests.
- Documentación en `docs/spec/refactor/registro-incidencia/18-11-26-contrato-incidencias-pr-185.md` (detalle técnico, archivos y verificación).

## Decisiones clave

Confirmadas con la usuaria:

- Se elimina "Otros".
- El interruptor de ubicación se mantiene, pero bloquea el envío si está apagado.
- Una descripción de 1 a 9 caracteres es un error de validación.
- Si falla la subida de fotos, se muestra un aviso con un botón que reintenta solo esa subida.

Decisión técnica tomada sin consultar:

- Un token de origen mock registra directamente en el mock, porque su token no es un JWT válido para el backend.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/types/incident.ts` | Contrato de creación (input, payload JSON, autor, resultado con estado de fotos) |
| `src/services/incident.service.ts` | POST JSON + Bearer, `uploadIncidentImages`, fallback mock equivalente |
| `src/utils/incident-validator.ts` | Validaciones de categoría, descripción y ubicación |
| `src/hooks/use-create-incident.ts` | Token de sesión y `uploadPendingImages` |
| `src/hooks/use-incident-location-submit.ts` | Ubicación obligatoria con reintento, reintento de fotos |
| `src/components/category-picker.tsx` | Sin "Otros" |
| `src/app/incidents/new.tsx` | Nuevos errores y bloque de reintento de fotos |
| `src/__tests__/**` (6 ficheros) | Tests del servicio, hooks, validador, picker y pantalla |
| `docs/spec/refactor/registro-incidencia/18-11-26-contrato-incidencias-pr-185.md` | Nuevo: documento del refactor |
| `docs/spec/bugs/todo.md` | Fotos descartadas sin aviso (PR #158) marcado como resuelto |
| `docs/2026-11-18-001-contrato-incidencias-pr-185.md` | Nuevo: esta nota de sesión |

## Checklist de la sesión

- [x] Leer la issue #191 y crear la rama `refactor/191-adaptar-frontend-mobile-contrato-incidencias`.
- [x] Revisar el contrato de `POST /incidents` y `POST /incidents/:id/images` en la PR #185.
- [x] Plan propuesto y decisiones de UX confirmadas por la usuaria.
- [x] Tipos y servicio: JSON con Bearer, subida de fotos separada y fallback mock.
- [x] Validador: categoría, descripción mínima y ubicación obligatorias.
- [x] Hooks: token de sesión, bloqueo sin ubicación y reintento de fotos.
- [x] UI: selector sin "Otros", errores nuevos y reintento de fotos en la confirmación.
- [x] Tests actualizados (servicio, hooks, validador, picker, pantalla).
- [x] `pnpm expo lint`, `pnpm tsc --noEmit` y `pnpm test` en verde.
- [x] Documentación en `docs/spec/refactor/registro-incidencia/` y `bugs/todo.md`.
- [ ] Prueba manual en dispositivo contra el backend de la PR #185.
- [ ] Commit / PR (solo cuando la usuaria lo pida).

## Estado / Verificación

- `pnpm expo lint`: 0 errores y 0 warnings.
- `pnpm tsc --noEmit`: 0 errores.
- `pnpm test`: 62 suites / 764 tests en verde.

Pendiente: prueba manual en dispositivo/Expo Go contra el backend levantado con la rama de la PR #185. No se levantó el backend en esta sesión porque no se pidió.
