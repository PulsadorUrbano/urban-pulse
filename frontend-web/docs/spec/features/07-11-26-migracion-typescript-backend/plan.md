# 2026-11-07 — Plan de implementación: migrar frontend-web a TypeScript estricto y conectarlo al backend

> Crear únicamente este plan y su especificación. Copiar a frontend-web/docs/spec/features/DD-MM-YY-nombre-feature/plan.md.

- Objetivo: panel web en TypeScript estricto, funcionando de punta a punta contra el backend de `dev`.
- Arquitectura: capa HTTP tipada + servicios por dominio + hooks + vistas existentes adaptadas; sesión única en `App.tsx`.
- Herramientas: React 19, Vite 8, TypeScript 5.9, Vitest 5, ESLint 10 con `typescript-eslint` 8 (nuevo) y `@types/node` (nuevo).
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/web-typescript-migration.
- Estado: implementado con verificación pendiente de una decisión.

## Restricciones generales

- Sin cambios en `backend/` ni en `frontend-mobile/`.
- Sin `any`, `@ts-ignore` ni casts sobre datos externos; sin desactivar reglas de lint.
- Sin rediseñar la interfaz ni añadir funcionalidades nuevas.
- Restricciones particulares: no inventar un listado de incidencias que el backend no ofrece.

## Focos de revisión

- Respuestas del backend con otra forma → `BackendContractError` (tests de `auth.service` e `incident.service`).
- `401` nunca cae al mock (test "un 401 se muestra como credenciales incorrectas").
- Validación a medias (estado guardado, prioridad fallida) → reintento solo de la prioridad (`use-incident-validation.ts`).
- URL de imágenes relativas → `resolveBackendAssetUrl` (test).

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | frontend-web/tsconfig.json, eslint.config.js, package.json, index.html | TypeScript estricto, lint TS y script `typecheck`. |
| Renombrar | vite.config.js → vite.config.ts, tailwind.config.js → tailwind.config.ts | Configuración en TypeScript. |
| Renombrar | src/main.jsx → main.tsx, App.jsx → App.tsx | Entrada y sesión única. |
| Crear | src/constants/config.ts, src/vite-env.d.ts | URL del backend y de sus archivos. |
| Crear | src/types/user.ts, token.ts, incident.ts; modificar types/auth.ts | Contratos alineados con backend y móvil. |
| Crear | src/services/http.ts, token.service.ts, session-storage.service.ts | Capa HTTP y sesión. |
| Renombrar y reescribir | services/authService.ts → auth.service.ts, incidentService.js → incident.service.ts | Servicios contra el backend. |
| Renombrar y reescribir | hooks/useAuth.ts → use-auth.ts, useIncidentValidation.js → use-incident-validation.ts | Estado de sesión y de validación. |
| Renombrar y modificar | components/LoginView.tsx → login-view.tsx, IncidentValidationView.jsx → incident-validation-view.tsx | Vistas con datos reales. |
| Crear | src/mocks/auth-mock.ts, src/utils/display-name.ts | Respaldo del login y utilidades. |
| Modificar y crear | src/__tests__/services/auth.service.test.ts, incident.service.test.ts, config/vite.config.test.ts | Pruebas. |
| Actualizar | frontend-web/README.md, CLAUDE.md, .env.example | Documentación de uso. |

## Preparación

- [x] Leer `CLAUDE.md`, backend (auth e incidencias), móvil (`types/`, `services/`) y web.
- [x] Contratos del backend revisados en código y en `backend/docs/spec/endpoint/`.
- [x] Estado inicial: `npx tsc --noEmit` fallaba (`import.meta.env` sin tipos); `npm run lint` con 2 errores previos en `useIncidentValidation.js` e `incidentService.js`, que desaparecen al reescribirlos.

## Tarea 1: configuración de TypeScript estricto

**Archivos:** tsconfig.json, eslint.config.js, package.json, vite.config.ts, tailwind.config.ts, index.html, src/main.tsx, src/vite-env.d.ts.

**Criterios cubiertos:** 1.

- [x] `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`; ESLint con `typescript-eslint` para `.ts`/`.tsx`.
- [x] `npm run typecheck` sin errores.

## Tarea 2: tipos y capa HTTP

**Archivos:** src/types/*, src/constants/config.ts, src/services/http.ts.

**Criterios cubiertos:** 1, 5.

- [x] Tipos alineados con el backend y el móvil; type guards y `readJson`.

## Tarea 3: autenticación

**Archivos:** auth.service.ts, token.service.ts, session-storage.service.ts, mocks/auth-mock.ts, hooks/use-auth.ts, components/login-view.tsx.

**Criterios cubiertos:** 2, 5.

- [x] Casos unitarios: login backend, 401, 400, contrato roto, sin conexión, 502, `civic`, sesión caducada o corrupta, restaurar, verificar token.
- [x] `npm run test`: correcto.

## Tarea 4: validación de incidencias

**Archivos:** incident.service.ts, hooks/use-incident-validation.ts, components/incident-validation-view.tsx, App.tsx, utils/display-name.ts.

**Criterios cubiertos:** 3, 4, 5.

- [x] Casos unitarios: detalle, 404, 400, contrato roto, sin conexión y 502, PATCH de estado y prioridad, 409, URL de imágenes.
- [x] Prueba manual en el navegador (ver Confirmación).

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | 3 archivos, 38/38 tests. |
| Typecheck | npx tsc --noEmit | Sin errores. |
| Lint | npm run lint | Sin errores ni avisos. |
| Build | npm run build | Correcto (incluye `tsc --noEmit`). |
| Diff, desde la raíz | git diff --check | Sin errores. |

- [x] Cada criterio tiene evidencia.
- [x] No se tocaron `backend/` ni `frontend-mobile/`.

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente (decisión sobre cómo seleccionar la incidencia a validar).
- Fecha de revisión: 2026-11-07.
- Resultado entregado: panel web en TypeScript estricto, conectado al backend real para login, sesión, detalle, validación con prioridad y descarte.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. TypeScript estricto y comprobaciones | `find` sin `.js`/`.jsx` en `src`; typecheck, lint, test y build correctos | Cumplido |
| 2. Login | Navegador: `admin`/`admin` real; contraseña mala, "Usuario o contraseña incorrectos."; `ciudadano`, rechazado; backend apagado, datos simulados con aviso | Cumplido |
| 3. Detalle con imágenes | Navegador: incidencia creada con 2 PNG; imágenes y miniaturas servidas por `/api/uploads/...` (200 image/png) | Cumplido |
| 4. Validar y descartar | Navegador + `GET /incidents/:id`: `validated`/`high` y `rejected`; incidencia resuelta sin formulario | Cumplido |
| 5. Errores | Navegador: 404 "no existe", 400 "uuid is expected", 409 con el motivo del backend, backend apagado con reintento | Cumplido |
| 6. Sin Cloudinary | `grep -ri cloudinary frontend-web` (sin `node_modules`) sin resultados | Cumplido |

- Comprobaciones: las de la tabla anterior; prueba manual con Docker Compose (PostgreSQL + backend de `dev` + web compilada con nginx).
- Decisiones y desviaciones: se retira el bloque "Análisis Automático" (sin origen en el backend); el motivo de descarte va dentro de `cause`; al restaurar una sesión válida se entra al panel directamente, como en el móvil.
- Limitaciones y pendientes: no hay listado de incidencias pendientes en el backend; la web abre la incidencia con `?incidencia=<id>` hasta que se decida otra cosa. El backend no activa CORS (anotado en `bugs/todo.md`).
