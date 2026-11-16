# Sesión — 2026-11-16 · Feature 16-11-26 · Workflow del frontend web

- Desarrollador responsable: Alejandro (Alewuito).
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

Parte web de la issue #161 (Crear Workflows), en la rama `chore/161-workflow-frontend-web` creada desde `dev`. Los workflows del móvil y del backend están en las PR #162 y #167.

## Alcance

Crear `.github/workflows/frontend-web-build.yml` para ejecutar lint, pruebas y compilación del frontend web en GitHub Actions.

## Decisiones clave

Se sigue el patrón del workflow del backend (PR hacia cualquier rama, push a `dev`, permisos de lectura y límite de 15 minutos) adaptado a npm. El typecheck no va en un paso aparte porque `npm run build` ya ejecuta `tsc --noEmit`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `../.github/workflows/frontend-web-build.yml` | Workflow nuevo |
| `docs/spec/features/16-11-26-workflow-frontend-web/` | Especificación y plan |

## Checklist de la sesión

- [x] Revisar la issue #161 y los workflows del móvil y del backend.
- [x] Crear el workflow.
- [x] Reproducir sus pasos en local sobre una copia limpia.
- [ ] Comprobar la primera ejecución en GitHub Actions.

## Documentos actualizados

[Especificación](spec/features/16-11-26-workflow-frontend-web/spec.md) y [plan](spec/features/16-11-26-workflow-frontend-web/plan.md).

## Estado / Verificación

En local, `npm ci`, lint, 60 pruebas y build pasan; la sintaxis YAML es válida.

## Pendiente / diferido

Abrir la PR hacia `dev` y registrar en el plan el resultado de la primera ejecución en GitHub.
