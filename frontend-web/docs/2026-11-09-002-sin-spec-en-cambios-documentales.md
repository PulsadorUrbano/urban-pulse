# Sesión — 2026-11-09 · Docs 09-11-26 · Sin especificación ni plan en cambios de documentación

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

Los cambios solo de documentación generaban `spec.md` y `plan.md` sin aportar nada. Rama de trabajo: `feature/web-typescript-migration`.

## Alcance

Cambiar la regla y quitar de la rama las especificaciones y planes de cambios solo documentales.

## Decisiones clave

- README, ADR, guías y skills llevan solo nota de sesión.
- Features, bugs y refactors mantienen su documentación.
- Lo eliminado sigue disponible en el historial de Git.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `.claude/skills/trazabilidad/SKILL.md`, `CLAUDE.md`, `docs/spec/README.md` | Regla nueva. |
| `docs/spec/templates/spec-template.md`, `plan-template.md` | Sin referencias a cambios documentales. |
| `docs/spec/features/27-10-26-adr-frontend-web/` | Eliminada. |
| `docs/spec/features/09-11-26-guias-diseno-y-codigo-web/` | Eliminada. |
| `docs/spec/refactor/independent/27-10-26-alinear-trazabilidad-con-frontend-mobile.md` | Eliminado: era un cambio solo de documentación. |
| `docs/2026-10-28-001-adr-y-trazabilidad.md`, `docs/2026-11-09-001-guias-diseno-y-codigo-web.md` | Sin enlaces a lo eliminado. |

## Checklist de la sesión

- [x] Cambiar la regla en la skill y en la documentación.
- [x] Eliminar las dos carpetas y el documento de refactor.
- [x] Quitar los enlaces rotos.

## Documentos actualizados

Ninguno: los cambios solo de documentación no llevan especificación ni plan.

## Estado / Verificación

Cambio documental **implementado y verificado**: sin enlaces a las carpetas eliminadas y `git diff --check` sin errores.

## Pendiente / diferido

Ninguno.
