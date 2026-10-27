# 2026-10-27 — Refactor: alinear la trazabilidad de frontend-web con frontend-mobile

- Feature afectada: independiente.
- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).
- Rama: feature/token-frontend-web (estructura inicial, PR #107) y docs/creacion-adr (alineación).
- Estado: Implementado y verificado.

## Motivo

Frontend-web no tenía una estructura de trazabilidad común con el resto del equipo; solo existía una especificación suelta en `frontend-web/spec/`. Se creó `frontend-web/docs/spec/` siguiendo `frontend-mobile/docs/spec/`, pero se le añadió una carpeta `prompts/` con un historial diario de prompts que no existe en mobile. El equipo decide mantener exactamente las mismas carpetas que mobile, así que se retira `prompts/`. El uso de IA se registra, como en mobile, con los campos de desarrollador, asistente y modelo de cada documento.

## Alcance

- Alcance confirmado: estructura `features/`, `refactor/`, `bugs/` y `templates/`; nombres de carpetas y archivos con fecha `DD-MM-YY`; plantillas sin referencias a prompts; `README.md` y `frontend-web/CLAUDE.md` actualizados.
- Fuera de alcance: migrar la documentación de días anteriores. `frontend-web/spec/2026-10-20-003-token-jwt-integration.md` se conserva como referencia histórica.
- Comportamiento preservado: no se toca código de la aplicación.

| Acción | Archivo |
| --- | --- |
| eliminar | frontend-web/docs/spec/prompts/2026-10-27.md |
| eliminar | frontend-web/docs/spec/templates/prompts-template.md |
| modificar | frontend-web/docs/spec/README.md |
| modificar | frontend-web/docs/spec/templates/spec-template.md |
| modificar | frontend-web/docs/spec/templates/plan-template.md |
| modificar | frontend-web/docs/spec/templates/bug-template.md |
| modificar | frontend-web/docs/spec/templates/refactor-template.md |
| modificar | frontend-web/docs/spec/bugs/todo.md |
| modificar | frontend-web/CLAUDE.md |

## Verificación

- [x] Estructura antes del cambio: `features/`, `refactor/`, `bugs/`, `prompts/` y `templates/` (con `prompts-template.md`).
- [x] Estructura después del cambio: mismas carpetas que `frontend-mobile/docs/spec/`; `grep -i prompt` sobre `frontend-web/docs` y `frontend-web/CLAUDE.md` sin resultados.
- [x] `npm run lint`, `npm run test` y `npm run build`: no aplica, cambio documental.

## Confirmación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-27.
- Resultado entregado: `frontend-web/docs/spec/` con las mismas carpetas y flujo que frontend-mobile.
- Decisiones y desviaciones: se adopta el formato de fecha `DD-MM-YY` de mobile en lugar de `AAAA-MM-DD`.
- Limitaciones y pendientes: el historial de prompts del 2026-10-27 ya se publicó en `feature/token` con la PR #107; desaparecerá al integrar este cambio.
