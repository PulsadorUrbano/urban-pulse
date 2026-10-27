# 2026-10-27 — Plan de implementación: ADR del stack del frontend web y de la elección de dos frontends

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).
- Objetivo: ADR 0002 y 0004 (web) redactados y contrastados con el repositorio.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: docs/creacion-adr.
- Estado: implementado y verificado.

## Restricciones

- Solo documentación; no se modifica código.
- No tocar los ADR de otros equipos (0001, 0003 y 0004 móvil).
- No hacer commits, push ni PR sin confirmación explícita del desarrollador.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | docs/adr/0002-two-frontend.md | Decisión de dos frontends separados. |
| Modificar | docs/adr/0004-frontend-web-stack.md | Stack del frontend web. |
| Eliminar | docs/adr/0004-frontend-stack.md | Sustituido por los ADR separados de web y móvil. |
| Crear | frontend-web/docs/spec/features/27-10-26-adr-frontend-web/ | Esta especificación y este plan. |

## Tarea 1: traer el código de feature/token

- [x] Fusionar `origin/feature/token` en `docs/creacion-adr`: sin conflictos (commit de merge local).

## Tarea 2: investigar el motivo de los dos frontends

- [x] Revisar el README, `profile_role`, `auth.controller.ts`, `frontend-mobile/CLAUDE.md`, la misión antigua del móvil y las issues de GitHub.
- [x] Resultado: se confirma la hipótesis del equipo (ciudadanía en el móvil, personal municipal en la web).

## Tarea 3: redactar los ADR

- [x] ADR 0002: contexto, decisión, tres alternativas descartadas y consecuencias.
- [x] ADR 0004 web: tabla del stack con versión y motivo, cinco alternativas descartadas y consecuencias.
- [x] Contrastar los datos con el código. Corrección aplicada: la URL de producción ya es configurable con `VITE_BACKEND_URL`.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | No aplica: cambio documental. |
| Lint | npm run lint | No aplica: cambio documental. |
| Build | npm run build | No aplica: cambio documental. |
| Diff, desde la raíz | git diff --cached --check | Sin errores. |

## Confirmación de implementación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-27.
- Resultado entregado: ADR 0002 y 0004 (web) redactados; `feature/token` fusionada en la rama.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. ADR 0002 completo y con evidencias | docs/adr/0002-two-frontend.md | Cumplido |
| 2. ADR 0004 web con versiones y motivos | docs/adr/0004-frontend-web-stack.md, frontend-web/package.json | Cumplido |
| 3. Sin contradicciones con el código | Revisión de package.json, schema.prisma, auth.controller.ts y authService.ts | Cumplido |
| 4. ADR ajenos sin tocar | git status: solo 0002, 0004 web y el borrado de 0004-frontend-stack | Cumplido |

- Decisiones y desviaciones: los nombres de carpeta siguen `DD-MM-YY`, como en frontend-mobile.
- Limitaciones y pendientes: durante la revisión se detectó que `authService.ts` usa `POST /auth/token`, ya retirado del backend. Queda anotado en [bugs/todo.md](../../bugs/todo.md).
