# 17-11-26 — Review: workflow de CI de frontend-mobile (PR #162)

- Feature afectada: independiente (CI de `frontend-mobile`).
- Rama: chore/161-workflow-frontend-mobile (PR #162).
- Última actualización: 2026-11-17.
- Estado: Corregido con verificación pendiente (falta la re-review).
- Origen: review de Alewuito en la PR #162 (2026-11-16, "changes requested").

> No es un bug de la app, sino cambios pedidos en una PR. Se registra aquí, a petición de la
> usuaria, para que las tres PRs pendientes tengan su plan en `bugs/`.

## Síntoma observado

La PR sigue marcada como "changes requested" aunque los cuatro puntos de la review ya parecen
resueltos.

## Diagnóstico

Estado de cada punto, comprobado el 2026-11-17 contra `c93580f`:

| # | Petición | Estado |
| --- | --- | --- |
| 1 | Quitar el commit de #158 y `frontend-web/pnpm-lock.yaml` | ✅ La PR solo toca `.github/workflows/frontend-mobile-build.yml` |
| 2 | `permissions: contents: read` | ✅ Presente |
| 3 | Descripción con los pasos y el enlace al CI | ✅ Pasos 1-7 y enlace a la ejecución `43858056085` (de `c93580f`, en verde) |
| 4 | Igualar `actions/*` a `@v6` | ✅ `checkout@v6` y `setup-node@v6` (`pnpm/action-setup@v4` es otra action, no aplica) |

Detalle menor encontrado: la descripción pone "#161" sin palabra clave, así que GitHub no vincula
la issue (`closingIssuesReferences` vacío) y no se cerrará sola al mergear.

## Corrección propuesta

No hace falta tocar código. `.github/` está fuera de `frontend-mobile/` y, según CLAUDE.md, es de
solo lectura para el agente; si hubiera que cambiar el workflow, lo hace la usuaria.

1. ~~Vincular la issue en la descripción~~: la usuaria decide dejar "#161" tal cual (2026-11-17).
2. Responder a la review con un resumen punto por punto (la tabla de arriba).
3. Pedir re-review a Alewuito (`gh pr edit 162 --add-reviewer Alewuito`).

## Archivos tocados (previstos)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| — | (ninguno) | Solo la descripción de la PR, el comentario y la re-review en GitHub |

## Verificación

- [x] La PR solo contiene el workflow (`gh pr view 162 --json files`).
- [x] El CI de la PR está en verde (`gh pr checks 162` → "Lint, typecheck y tests: pass").
- [ ] Re-review solicitada y aprobada.

## Confirmación

- Estado final: {{pendiente de la aprobación}}.
- Fecha de revisión: {{AAAA-MM-DD}}.
- Evidencia: {{enlace a la aprobación}}.
- Limitaciones y pendientes: ninguna.
