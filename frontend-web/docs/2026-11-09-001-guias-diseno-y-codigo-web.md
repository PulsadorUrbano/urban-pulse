# Sesión — 2026-11-09 · Docs 09-11-26 · Guías de diseño y de estilo de código

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

Hace falta que otra IA, en el ordenador de una compañera, siga el mismo diseño y estilo de código en el panel web. Rama de trabajo: `feature/web-typescript-migration`. Trazabilidad completa en `docs/spec/features/09-11-26-guias-diseno-y-codigo-web/`.

## Alcance

Crear las skills `diseno-web` y `estilo-codigo-web` y referenciarlas desde `CLAUDE.md`, sin cambiar código.

## Decisiones clave

- Skills del proyecto: se versionan con el repositorio y se activan solas en Claude Code.
- Valores medidos en el código, no escritos de memoria.
- Los defectos actuales se listan aparte para que no se copien.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `.claude/skills/diseno-web/SKILL.md` | Nuevo. |
| `.claude/skills/estilo-codigo-web/SKILL.md` | Nuevo. |
| `CLAUDE.md` | Referencia a las guías. |

## Checklist de la sesión

- [x] Medir colores, tipografía y espaciado.
- [x] Redactar las dos guías.
- [x] Contrastar la guía de diseño con el código y con Tailwind.

## Documentos actualizados

- [x] `docs/spec/features/09-11-26-guias-diseno-y-codigo-web/spec.md`.
- [x] `docs/spec/features/09-11-26-guias-diseno-y-codigo-web/plan.md`.

## Estado / Verificación

Cambio documental **implementado y verificado**: contraste por script correcto y `git diff --check` sin errores.

## Pendiente / diferido

Corregir los defectos visuales que recoge la guía de diseño, si el equipo decide incluirlos en el sprint.
