# 2026-10-27 — Especificación: ADR del stack del frontend web y de la elección de dos frontends

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: docs/creacion-adr.
- Última actualización: 2026-10-27.
- Estado: implementado y verificado (ver [Confirmación de implementación](./plan.md#confirmación-de-implementación)).
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: petición del desarrollador de redactar los ADR que corresponden a frontend-web; archivos vacíos creados en el commit 6a7ca60 ("distribución de adr").

## Objetivo y decisiones vigentes

Los ADR del repositorio (`docs/adr/`) existían pero estaban vacíos. Esta tarea redacta los dos que afectan al frontend web: la decisión de tener dos frontends separados y el stack elegido para la web. Así, quien se incorpore al proyecto sabe por qué la web existe y con qué está construida.

- Alcance confirmado: `docs/adr/0002-two-frontend.md` y `docs/adr/0004-frontend-web-stack.md`. Antes de redactarlos se fusiona `origin/feature/token` en la rama, por ser la que tiene el código más completo.
- Decisiones confirmadas: la separación se justifica por el tipo de usuario y de dispositivo. La ciudadanía usa el móvil (cámara, GPS, reporte en la calle); el personal municipal y los analistas usan el ordenador (validación, asignación, priorización, analítica). Era la hipótesis del equipo y se ha contrastado con el repositorio.
- Suposiciones por validar: que los técnicos (`technician`) trabajen desde la web. Si necesitan registrar resoluciones en la calle, habrá que revisar el ADR 0002.
- Fuera de alcance: los ADR 0001 (base de datos), 0003 (backend) y 0004 del stack móvil, que corresponden a otros equipos. No se modifica código.

## Contexto verificado

- Implementación actual: los cinco archivos de `docs/adr/` estaban vacíos (0 bytes) en `dev`, `feature/token` y `docs/creacion-adr`. `docs/adr/0004-frontend-stack.md` se sustituye por los archivos separados de web y móvil.
- Evidencias de la separación:
  - visión del producto en el `README.md` raíz;
  - enum `profile_role` en `backend/prisma/schema.prisma`: `civic` frente a `administrative`, `department`, `team`, `technician`, `admin` y `analyst`;
  - `POST /auth/register` asigna siempre `civic`;
  - alcance del móvil en `frontend-mobile/CLAUDE.md`;
  - misión antigua del móvil en `frontend-mobile/docs/old/spec/constitution/mission.md`;
  - issues RF09, RF13, RF24, #47 y #48 (operadores y técnicos) frente a #35 y #41 (ciudadanía).
- Dependencias disponibles: versiones tomadas de `frontend-web/package.json`: React 19, Vite 8, TypeScript 5.7, Tailwind CSS 3, Vitest 5, ESLint 10 y lucide-react.

## Contrato de datos (backend real + fallback)

No aplica: es un cambio documental y no consume ni simula endpoints.

## Contrato de UI

No aplica: no se modifican componentes, hooks, servicios ni tipos.

## Criterios de aceptación

1. `0002-two-frontend.md` explica contexto, decisión, alternativas descartadas y consecuencias, y cita evidencias reales del repositorio.
2. `0004-frontend-web-stack.md` recoge cada pieza del stack con su versión real y el motivo de la elección, además de las alternativas descartadas.
3. Ningún dato de los ADR contradice el código: versiones, endpoints, roles y variables de entorno.
4. Los ADR de otros equipos no se modifican.

## Estrategia de verificación

Contrastar cada afirmación de los ADR con los archivos citados y revisar los enlaces relativos entre ADR. No se ejecuta la aplicación.

Los resultados reales se registran en [el plan](./plan.md#confirmación-de-implementación).
