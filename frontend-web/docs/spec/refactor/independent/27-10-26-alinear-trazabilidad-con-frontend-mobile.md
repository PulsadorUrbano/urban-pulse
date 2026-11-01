# 27-10-26 — Refactor: alinear la trazabilidad de frontend-web con frontend-mobile

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

- Feature afectada: independiente.
- Rama: feature/token-frontend-web (estructura inicial, PR #107) y docs/creacion-adr (alineación).
- Última actualización: 2026-10-28.
- Estado: Implementado y verificado.

## Motivo

Frontend-web no tenía una trazabilidad común con el resto del equipo. En la PR #107 se creó `frontend-web/docs/spec/` con una carpeta `prompts/` de historial diario que no existe en `frontend-mobile` ni en `backend`, y con plantillas genéricas. El equipo decide que la web siga exactamente la trazabilidad de `frontend-mobile/` en `dev`: mismas carpetas, mismas plantillas adaptadas a la web, notas de sesión en `docs/` y uso de IA registrado con los campos de cada documento.

## Alcance

- Alcance confirmado:
  - 2026-10-27: se retira `prompts/` y `prompts-template.md`; fechas de carpetas y archivos en `DD-MM-YY`.
  - 2026-10-28: `docs/spec/README.md`, las cuatro plantillas y `bugs/todo.md` se calcan de `frontend-mobile/docs/spec/`, adaptados al stack de la web (React + Vite, Tailwind, Vitest, `src/mocks/`, comandos `npm`). Se añaden las notas de sesión (`docs/AAAA-MM-DD-NNN-nombre.md`), los campos de IA en spec, bug, refactor y nota de sesión, las secciones de trazabilidad y de documentación de sesión en `frontend-web/CLAUDE.md` y la skill `trazabilidad`.
- Fuera de alcance: migrar la documentación de días anteriores; `frontend-web/spec/2026-10-20-003-token-jwt-integration.md` se conserva como referencia histórica. No se toca `frontend-mobile/` ni `backend/`.
- Comportamiento preservado: no se modifica código de la aplicación.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Eliminar | frontend-web/docs/spec/prompts/2026-10-27.md | Historial de prompts retirado. |
| Eliminar | frontend-web/docs/spec/templates/prompts-template.md | Plantilla de prompts retirada. |
| Modificar | frontend-web/docs/spec/README.md | Estructura y flujos del móvil, campos de IA y notas de sesión. |
| Modificar | frontend-web/docs/spec/templates/spec-template.md | Plantilla del móvil adaptada a la web. |
| Modificar | frontend-web/docs/spec/templates/plan-template.md | Plantilla del móvil adaptada a la web. |
| Modificar | frontend-web/docs/spec/templates/bug-template.md | Plantilla del móvil adaptada a la web, con campos de IA. |
| Modificar | frontend-web/docs/spec/templates/refactor-template.md | Plantilla del móvil adaptada a la web, con campos de IA. |
| Modificar | frontend-web/docs/spec/bugs/todo.md | Formato del `todo.md` del móvil. |
| Modificar | frontend-web/CLAUDE.md | Trazabilidad y documentación de sesión, como en el móvil. |
| Crear | frontend-web/.claude/skills/trazabilidad/SKILL.md | Skill que aplica este flujo en cada feature, fix, refactor o docs. |

## Verificación

- [x] Registrar el comportamiento observado antes del cambio: `docs/spec/` con `prompts/`, plantillas sin el formato del móvil y sin notas de sesión.
- [x] Aplicar el refactor.
- [x] Confirmar el resultado: `find frontend-web/docs -ipath '*prompt*'` sin resultados; mismas carpetas que `frontend-mobile/docs/spec/`; ninguna plantilla con referencias a prompts.
- [x] `npm run lint` y `npx tsc --noEmit`: no aplica, cambio documental.
- [x] Tests: no aplica, no se toca código.

## Confirmación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-28.
- Resultado entregado: `frontend-web/docs/` con la misma trazabilidad que `frontend-mobile/docs/` y la skill `trazabilidad` para mantenerla.
- Decisiones y desviaciones: los campos de IA aparecen también en bugs, refactors y notas de sesión (en el móvil solo están en la spec), para que un fix sin spec también registre el uso de IA.
- Limitaciones y pendientes: ninguno.
