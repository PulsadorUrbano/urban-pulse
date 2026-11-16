# 2026-11-16 — Especificación: crear el workflow de compilación y pruebas del frontend web

- Desarrollador responsable: Alejandro (Alewuito).
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: chore/161-workflow-frontend-web.
- Última actualización: 2026-11-16.
- Estado: implementado y verificado.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: issue #161 (Crear Workflows), PR #162 (workflow móvil) y PR #167 (workflow backend).

## Objetivo y decisiones vigentes

La issue #161 pide un workflow por módulo en `.github/workflows/<modulo>-build.yml` que, como mínimo, compile y ejecute las pruebas. Esta especificación cubre la parte del frontend web: cada cambio en `frontend-web/` debe pasar lint, pruebas y compilación en GitHub Actions antes de integrarse.

- Alcance confirmado: un workflow `.github/workflows/frontend-web-build.yml` con un único job que instala dependencias con `npm ci` y ejecuta `npm run lint`, `npm run test` y `npm run build`.
- Decisiones confirmadas:
  - Se ejecuta en PR hacia cualquier rama y en push a `dev`, solo cuando cambian `frontend-web/**` o el propio workflow. Así también corre en PR apiladas y subramas, igual que el workflow del backend.
  - Node 22, el mismo que usan el `Dockerfile` de la web y los otros dos workflows.
  - npm con `package-lock.json`, que es el gestor del frontend web, y caché de npm en `actions/setup-node`.
  - No hay paso de typecheck separado: `npm run build` ya ejecuta `tsc --noEmit` antes de `vite build`.
  - Permisos de solo lectura (`contents: read`) y límite de 15 minutos.
- Suposiciones por validar: ninguna.
- Fuera de alcance: marcar el check como obligatorio en las reglas de `dev`, despliegue, pruebas e2e y los workflows de `backend/` y `frontend-mobile/`.

## Contexto verificado

- Implementación actual: `dev` no tiene ningún workflow. Los del móvil (#162) y del backend (#167) están en PR abiertas.
- Contratos y referencias del dominio: scripts de `frontend-web/package.json` (`lint`: `eslint .`, `test`: `vitest run`, `build`: `tsc --noEmit && vite build`).
- Configuración y dependencias disponibles: Vite 8, Vitest 5, ESLint 10 y TypeScript 5.7 ya declarados en `package.json`. No se añaden dependencias.
- Diferencia entre estado actual y propuesto: las comprobaciones que hoy se ejecutan a mano pasan a ejecutarse en cada PR.

## Contrato de datos (backend real + mock)

No aplica. El workflow no consume ni simula endpoints: las pruebas unitarias ya simulan `fetch` y no necesitan backend, base de datos ni secretos.

### Backend real (consumo)

No aplica.

### Mock (`src/mocks/`)

No aplica.

## Contrato de UI y navegación

No aplica: no cambia ninguna vista.

## Tipos y datos mock

No aplica: no se crean ni modifican tipos.

## Diseño mínimo

Un solo archivo YAML en `.github/workflows/` con los pasos: obtener el repositorio, preparar Node 22 con caché de npm, `npm ci`, lint, pruebas y compilación, todos desde `frontend-web/`. Si un paso falla, los siguientes no se ejecutan y el check queda en rojo.

## Criterios de aceptación

1. Una PR que modifica `frontend-web/` dispara el workflow y este termina en verde cuando lint, pruebas y compilación pasan.
2. Si falla el lint, una prueba o la compilación (incluido un error de tipos), el workflow termina en rojo.
3. Una PR que no toca `frontend-web/` ni el workflow no lo dispara.
4. La instalación usa `npm ci` con el `package-lock.json` existente, sin modificarlo.
5. El workflow no necesita secretos ni servicios externos y solo tiene permiso de lectura.

## Estrategia de verificación

En local: validar la sintaxis YAML y ejecutar desde `frontend-web/` los mismos comandos que el workflow (`npm ci`, `npm run lint`, `npm run test`, `npm run build`). En GitHub: comprobar la primera ejecución en la PR de esta rama. Los criterios 2 y 3 se deducen de la configuración (`paths` y de que un comando con salida distinta de cero detiene el job); no se fuerza un fallo a propósito.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación).
