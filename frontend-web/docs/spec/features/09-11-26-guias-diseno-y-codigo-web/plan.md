# 2026-11-09 — Plan de implementación: guías de diseño y de estilo de código del panel web

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

- Objetivo: dos skills del proyecto con el diseño y el estilo de código reales del panel web.
- Arquitectura: un `SKILL.md` por guía, referenciado desde `frontend-web/CLAUDE.md`.
- Herramientas: las ya disponibles en el repositorio.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/web-typescript-migration.
- Estado: implementado y verificado.

## Restricciones generales

- Solo documentación; no se modifica código ni estilos.
- Confinar los cambios a `frontend-web/`.
- Sin atribución de IA en commits ni en GitHub.

## Focos de revisión

Que la guía no presente como norma los defectos actuales: se listan aparte como problemas conocidos.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | frontend-web/.claude/skills/diseno-web/SKILL.md | Colores, tipografía, formas y recetas. |
| Crear | frontend-web/.claude/skills/estilo-codigo-web/SKILL.md | Capas, nombres, TypeScript, React y comprobaciones. |
| Modificar | frontend-web/CLAUDE.md | Referencia a las dos guías. |
| Crear | frontend-web/docs/spec/features/09-11-26-guias-diseno-y-codigo-web/ | Esta especificación y este plan. |
| Crear | frontend-web/docs/2026-11-09-001-guias-diseno-y-codigo-web.md | Nota de sesión. |

## Preparación

- [x] Leer `frontend-web/CLAUDE.md`, configuración, componentes, servicios y estado de Git.
- [x] Medir el uso de colores, tipografía y espaciado en `src/` con un script.

## Tarea 1: guía de diseño

**Archivos:** `frontend-web/.claude/skills/diseno-web/SKILL.md`.

**Criterios cubiertos:** 1, 2 y 4.

- [x] Redactar la guía a partir de las mediciones.
- [x] Contrastar clases y colores con `src/` y con la paleta de Tailwind.

## Tarea 2: guía de estilo de código

**Archivos:** `frontend-web/.claude/skills/estilo-codigo-web/SKILL.md`.

**Criterios cubiertos:** 3 y 4.

- [x] Comprobar en el código las convenciones: exportaciones, ausencia de `any` y de conversiones `as` sobre datos externos.
- [x] Redactar la guía.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | No aplica: cambio documental. |
| Typecheck | npx tsc --noEmit | No aplica: cambio documental. |
| Lint | npm run lint | No aplica: cambio documental. |
| Build | npm run build | No aplica: cambio documental. |
| Diff, desde la raíz | git diff --check | Sin errores. |

- [x] Cada criterio de aceptación tiene evidencia.
- [x] No se tocaron archivos ajenos ni credenciales.

## Confirmación de implementación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-11-09.
- Resultado entregado: skills `diseno-web` y `estilo-codigo-web`, referenciadas desde `frontend-web/CLAUDE.md`.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Contenido de la guía de diseño | `diseno-web/SKILL.md` | Cumplido |
| 2. Valores reales | Contraste por script con `src/` y con `tailwindcss/colors` | Cumplido |
| 3. Contenido de la guía de código | `estilo-codigo-web/SKILL.md` | Cumplido |
| 4. Lo que no se debe imitar | Apartado de problemas conocidos y reglas estrictas | Cumplido |

- Comprobaciones: contraste por script correcto y `git diff --check` sin errores; el resto no aplica por ser un cambio documental.
- Decisiones y desviaciones: ninguna.
- Limitaciones y pendientes: los defectos visuales que recoge la guía de diseño siguen sin corregir, porque quedan fuera de alcance.
