# Sesión — 2026-10-28 · Docs 27-10-26 · ADR reunidos y trazabilidad igual que frontend-mobile

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

La rama `docs/creacion-adr` tenía los ADR redactados el 27-10 (0002 y 0004 web de Alejandro, 0005 móvil de artina09 y 0006 token de Sofía) en `docs/adr/`, pero `dev` había movido los ADR a `backend/docs/adr/`. Además, `dev` traía de la PR #107 la versión antigua de la trazabilidad web, con historial de prompts. Esta sesión integra `dev` en `docs/creacion-adr`, reúne todos los ADR en un único sitio y deja la trazabilidad de la web igual que la de `frontend-mobile`, para subirlo todo a `dev` en una PR. Rama de trabajo: `docs/creacion-adr`.

Trazabilidad completa en `docs/spec/features/27-10-26-adr-frontend-web/` y `docs/spec/refactor/independent/27-10-26-alinear-trazabilidad-con-frontend-mobile.md`.

## Alcance

- Merge de `origin/dev` en `docs/creacion-adr`.
- Todos los ADR (0001 a 0006) en `docs/adr/`; se eliminan las copias vacías de `backend/docs/adr/`.
- Enlaces de los ADR 0002 y 0004 al stack móvil corregidos a `0005-frontend-mobile-stack.md`.
- `README.md` raíz apunta a `docs/adr/`.
- `docs/spec/` (README, plantillas y `todo.md`) calcado de `frontend-mobile`, adaptado a la web.
- Notas de sesión en `docs/` y secciones de trazabilidad en `frontend-web/CLAUDE.md`.
- Skill `trazabilidad` en `frontend-web/.claude/skills/trazabilidad/`.

## Decisiones clave

- Los ADR viven en `docs/adr/` (raíz): describen decisiones de todo el proyecto (dos frontends, stacks web y móvil, token), no solo del backend.
- Se mueven los ADR 0001 y 0003 (vacíos) para conservar la numeración; las copias vacías de 0002 y 0004 en `backend/docs/adr/` se eliminan porque ya existen los redactados.
- Los ADR de artina09 (0005) y de Sofía (0006) se integran con un merge, sin copiar ni cambiar su contenido, para que conserven su autoría.
- Sin historial de prompts: el uso de IA se registra con los campos de cada documento, como en el móvil.
- El arreglo del login web va en una PR aparte (`fix/login-frontend-web`), después de esta.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `docs/adr/0001-database.md`, `docs/adr/0003-backend-stack.md` | Movidos desde `backend/docs/adr/`. |
| `backend/docs/adr/0002-two-frontend.md`, `backend/docs/adr/0004-frontend-stack.md` | Eliminados (copias vacías). |
| `docs/adr/0002-two-frontend.md`, `docs/adr/0004-frontend-web-stack.md` | Enlace al ADR 0005 del stack móvil corregido. |
| `README.md` | Ruta de los ADR: `docs/adr/`. |
| `frontend-web/docs/spec/README.md`, `templates/*.md`, `bugs/todo.md` | Calcados de `frontend-mobile/docs/spec/`. |
| `frontend-web/CLAUDE.md` | Trazabilidad y documentación de sesión. |
| `frontend-web/.claude/skills/trazabilidad/SKILL.md` | Nuevo. |
| `frontend-web/docs/spec/features/27-10-26-adr-frontend-web/spec.md`, `plan.md` | Decisión de ubicación y tarea 4. |
| `frontend-web/docs/spec/refactor/independent/27-10-26-alinear-trazabilidad-con-frontend-mobile.md` | Reescrito con la plantilla nueva y ampliado. |

## Checklist de la sesión

- [x] Analizar la trazabilidad de `frontend-mobile` y `backend` en `dev`.
- [x] Merge de `origin/dev` y resolución del conflicto de `0002-two-frontend.md`.
- [x] ADR reunidos en `docs/adr/` y enlaces corregidos.
- [x] Plantillas, README y `todo.md` de `docs/spec/` calcados del móvil.
- [x] `CLAUDE.md` y skill `trazabilidad`.
- [x] Documentos de la feature y del refactor actualizados.

## Documentos actualizados

- [x] `docs/spec/features/27-10-26-adr-frontend-web/spec.md` y `plan.md` — tarea 4 y decisión de ubicación.
- [x] `docs/spec/refactor/independent/27-10-26-alinear-trazabilidad-con-frontend-mobile.md` — implementado y verificado.

## Estado / Verificación

Cambio documental **completado**.

- `find frontend-web/docs -ipath '*prompt*'` — sin resultados.
- Ningún marcador `{{` fuera de `templates/`.
- Enlaces entre ADR revisados.
- Tests, lint y build: no aplica, no se toca código.

## Pendiente / diferido

- [ ] PR de `fix/login-frontend-web` (login conectado al backend con datos simulados), después de mergear esta.
