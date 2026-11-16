# 2026-11-16 — Plan de implementación: crear el workflow de compilación y pruebas del frontend web

- Objetivo: que cada PR que toque `frontend-web/` ejecute lint, pruebas y compilación en GitHub Actions.
- Arquitectura: un workflow con un único job; reutiliza los scripts de `package.json` sin añadir otros nuevos.
- Herramientas: Node 22, npm con `package-lock.json`, `actions/checkout@v6` y `actions/setup-node@v6`.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: chore/161-workflow-frontend-web.
- Estado: implementado; verificación en GitHub Actions pendiente.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- No instalar dependencias nuevas ni modificar `package.json` o `package-lock.json`.
- El único archivo fuera de `frontend-web/` es `.github/workflows/frontend-web-build.yml`, que la issue #161 exige en esa ruta.
- No crear commits ni hacer push salvo petición explícita.
- Restricciones particulares: sin secretos, sin servicios externos y con permiso `contents: read`.

## Focos de revisión

- Gestor de paquetes: la web usa npm; usar pnpm rompería `npm ci` y la caché (criterio 4).
- Filtro de rutas: debe incluir el propio workflow para que su primera PR lo ejecute (criterios 1 y 3).
- Typecheck: lo cubre `npm run build` (`tsc --noEmit && vite build`); no se duplica (criterio 2).

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | .github/workflows/frontend-web-build.yml | Workflow de lint, pruebas y compilación del frontend web. |
| Crear | frontend-web/docs/spec/features/16-11-26-workflow-frontend-web/spec.md | Requisitos y criterios de aceptación. |
| Crear | frontend-web/docs/spec/features/16-11-26-workflow-frontend-web/plan.md | Ejecución y resultados reales. |
| Crear | frontend-web/docs/2026-11-16-002-workflow-frontend-web.md | Nota de sesión. |

## Preparación

- [x] Leer `frontend-web/CLAUDE.md`, la issue #161 y los workflows de las PR #162 (móvil) y #167 (backend).
- [x] Comprobar los scripts y versiones de `frontend-web/package.json` y la versión de Node del `Dockerfile` (22).
- [x] Crear la rama desde `origin/dev` (`2f5cea1`).

## Tarea 1: workflow del frontend web

**Archivos:** `.github/workflows/frontend-web-build.yml`.

**Interfaces:** scripts `lint`, `test` y `build` de `frontend-web/package.json`.

**Criterios cubiertos:** 1, 2, 3, 4 y 5.

- [x] Definir disparadores: `pull_request` hacia cualquier rama y `push` a `dev`, filtrados por `frontend-web/**` y el propio workflow.
- [x] Definir el job: Node 22 con caché de npm, `npm ci`, `npm run lint`, `npm run test` y `npm run build`, con `working-directory: frontend-web`, `timeout-minutes: 15` y `permissions: contents: read`.
- [x] Validar la sintaxis: `yaml.safe_load` lee el archivo con los eventos `pull_request` y `push` y los seis pasos esperados.
- [x] Reproducir los pasos en local sobre una copia limpia de `frontend-web/` sin `node_modules`.
- [ ] Comprobar la primera ejecución en GitHub Actions en la PR de esta rama.

## Comprobaciones finales

Ejecutadas desde una copia limpia de `frontend-web/` con Node 22.14.0 y npm 10.9.2 en Windows.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Instalación | npm ci | 239 paquetes instalados en 9 s |
| Lint | npm run lint | Sin errores |
| Tests | npm run test | 5 archivos, 60 pruebas correctas |
| Typecheck y build | npm run build | `tsc --noEmit` sin errores y build de Vite correcto |
| Sintaxis YAML | yaml.safe_load | Correcta |
| Diff, desde la raíz | git diff --check | Sin errores |

- [x] Revisar que cada criterio de aceptación tiene evidencia.
- [x] Confirmar que no se tocaron `backend/`, `frontend-mobile/`, dependencias ni credenciales.

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente.
- Fecha de revisión: 2026-11-16.
- Resultado entregado: `.github/workflows/frontend-web-build.yml` y esta trazabilidad.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Una PR sobre `frontend-web/` dispara el workflow y termina en verde | Comandos reproducidos en local con éxito; falta la ejecución en GitHub | Pendiente |
| 2. Un fallo de lint, pruebas o compilación lo deja en rojo | Cada paso es un comando que detiene el job si sale con error; el typecheck va dentro de `npm run build` | Cumplido por configuración |
| 3. Una PR que no toca la web no lo dispara | Filtro `paths` en ambos eventos | Cumplido por configuración |
| 4. Instalación con `npm ci` sin modificar el lockfile | `npm ci` en local; `package-lock.json` sin cambios | Cumplido |
| 5. Sin secretos ni servicios y con permiso de lectura | `permissions: contents: read`; las pruebas simulan `fetch` | Cumplido |

- Comprobaciones: ver la tabla anterior.
- Decisiones y desviaciones: ninguna respecto a la especificación.
- Limitaciones y pendientes: registrar aquí la primera ejecución en GitHub Actions. El check no es obligatorio en las reglas de `dev`; hacerlo obligatorio queda fuera de alcance.
