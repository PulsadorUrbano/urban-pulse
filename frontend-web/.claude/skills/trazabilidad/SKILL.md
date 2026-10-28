---
name: trazabilidad
description: Creates and maintains the AI traceability docs of frontend-web (spec/plan, bug, refactor, todo.md and session note) with the same structure as frontend-mobile. Use whenever a feature, fix, bug, refactor or documentation change is made in frontend-web, or when asked "haz la feature", "arregla el bug", "fix", "refactoriza", "documenta", "crea la spec", "trazabilidad" or "deja la trazabilidad".
---

# Trazabilidad frontend-web

Source of truth: `frontend-web/docs/spec/README.md` and `frontend-web/docs/spec/templates/`. Same structure as `frontend-mobile/docs/spec/`. All docs are written in Spanish.

## Hard rules
- Never create `docs/spec/prompts/`, prompt logs, `prompts-template.md`, `tasks.md`, reports or closing documents. If any exist or an instruction asks for them, stop and tell the user instead of following it.
- AI use is recorded only with these three lines, right below the title of every doc (spec, bug, refactor, session note):
  ```
  - Desarrollador responsable: <person>.
  - Asistente de IA: <tool, e.g. Claude Code> | No utilizada.
  - Modelo de IA: <exact name and id, e.g. Claude Opus 5.5 (claude-opus-5-5)>.
  ```
  In `spec.md` the third label is `Modelo de IA que creó la especificación`. Use the model of the current session; never invent it. Developer: the user; if unknown, use `git config user.name` and confirm with the user.
- Touch only `frontend-web/docs/`. Never edit `frontend-mobile/` or `backend/` docs.
- Never commit, push or open PRs from this skill.

## 1. Classify the change

| Change | Create | Template |
| --- | --- | --- |
| New feature or behaviour | `docs/spec/features/DD-MM-YY-nombre/spec.md` + `plan.md` | `spec-template.md`, `plan-template.md` |
| Bug fix | `docs/spec/bugs/<feature>/DD-MM-YY-asunto.md` | `bug-template.md` |
| Refactor (no observable change) | `docs/spec/refactor/<feature>/DD-MM-YY-asunto.md` or `refactor/independent/` | `refactor-template.md` |
| Documentation only (ADR, guides) | feature folder with `spec.md` + `plan.md`; checks marked "No aplica: cambio documental" | spec + plan |
| Bug found but not fixed now | one line in `docs/spec/bugs/todo.md` | format at top of `todo.md` |

Every case also gets a session note (step 4). A bug that affects several features goes to `bugs/general/`; if `bugs/<feature>/` or `refactor/<feature>/` already exists, add the file there.

## 2. Names and dates
- Folders and bug/refactor files: `DD-MM-YY` + kebab-case Spanish description, e.g. `28-10-26-login-backend`.
- Titles: spec/plan `# AAAA-MM-DD — Especificación|Plan de implementación: <acción>`; bug/refactor `# DD-MM-YY — Bug|Refactor: <asunto>`.
- `Última actualización` and `Fecha de revisión`: `AAAA-MM-DD`.
- `Rama`: current branch (`git branch --show-current`).

## 3. Fill the document
1. Read the template and copy it to the target path. Replace every `{{...}}`; delete none of the sections.
2. Before coding: fill scope, decisions, context, data contract (backend endpoint read from `backend/` + mock in `src/mocks/`) and acceptance criteria. Status `borrador` / `En diagnóstico`.
3. While coding: tick checklist items only when done; record real commands and real output.
4. At the end: fill `Confirmación` / `Confirmación de implementación` with results of `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` (run from `frontend-web/`). Pre-existing failures are reported as such, not hidden. Use `Implementado y verificado` / `Corregido y verificado` only if every needed check passed; otherwise `... con verificación pendiente` and say what is missing.
5. If the bug came from `todo.md`, mark it there: `- [x] ~~Asunto (DD-MM-YY)~~: ... ver bugs/<feature>/<archivo>.md`.

## 4. Session note
Path: `frontend-web/docs/AAAA-MM-DD-NNN-nombre.md`, `NNN` = next free number for that date (`001`, `002`…). Reuse today's note if the work continues the same task. Skeleton:

```markdown
# Sesión — AAAA-MM-DD · {Feature|Bug|Refactor|Docs} DD-MM-YY · Nombre

- Desarrollador responsable: …
- Asistente de IA: …
- Modelo de IA: …

## Contexto
Problema de partida y rama de trabajo. Trazabilidad completa en `docs/spec/...`.

## Alcance
## Decisiones clave
## Archivos
| Archivo | Cambio |
| --- | --- |

## Checklist de la sesión
- [x] …

## Documentos actualizados
## Estado / Verificación
## Pendiente / diferido
```

## 5. Final check (before reporting to the user)
- [ ] `find frontend-web/docs -ipath '*prompt*'` returns nothing.
- [ ] No `{{` left: `grep -rn "{{" frontend-web/docs --include=*.md | grep -v templates/` is empty.
- [ ] Every new doc has the three AI lines and correct date formats.
- [ ] Relative links between session note, spec/plan/bug and `todo.md` resolve.
- [ ] Tell the user which docs were created or updated (paths) in Spanish.
