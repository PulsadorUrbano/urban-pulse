# Sesión — 2026-11-07 · Feature 07-11-26 · Migración a TypeScript y conexión al backend

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

El panel web mezclaba JavaScript y TypeScript, mostraba una incidencia inventada y un usuario fijo, y el login seguía validando contra una lista local. Esta sesión migra `frontend-web` a TypeScript estricto y conecta cada funcionalidad al backend de `dev`, con la estructura y los contratos de `frontend-mobile`. Integra el arreglo del login preparado el 28-10 en `fix/login-frontend-web`, que no llegó a subirse. Rama de trabajo: `feature/web-typescript-migration`. Issue: #128.

Trazabilidad completa en `docs/spec/features/07-11-26-migracion-typescript-backend/` y `docs/spec/bugs/login/28-10-26-login-web-no-conecta-con-el-backend.md`.

## Alcance

- TypeScript estricto en todo `src`, `typescript-eslint` y script `typecheck`.
- Capa HTTP tipada con validación de las respuestas del backend.
- Login real-first, sesión restaurada contra `GET /auth/me` y rechazo del rol `civic`.
- Detalle de incidencia, validación con prioridad y descarte con motivo contra el backend.
- Imágenes servidas desde `/uploads` a través del proxy `/api`.
- Comprobación de que la web no tiene nada de Cloudinary.

## Decisiones clave

- Se retira el interruptor `VITE_AUTH_SOURCE`: la web es real-first como el móvil y los datos simulados quedan solo como respaldo del login sin conexión.
- Las incidencias no tienen datos simulados: sin backend se muestra el error con opción de reintentar.
- Las respuestas externas se validan con type guards en lugar de casts.
- El motivo de descarte y la justificación van juntos en `cause`; el actor del PATCH es el usuario de la sesión.
- Se retira "Análisis Automático", que era texto inventado sin origen en el backend.
- Interino: la incidencia se abre con `?incidencia=<id>`, porque el backend no tiene listado para el personal.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `tsconfig.json`, `eslint.config.js`, `package.json`, `package-lock.json`, `index.html` | Configuración de TypeScript estricto y lint. |
| `vite.config.ts`, `tailwind.config.ts`, `src/main.tsx`, `src/App.tsx` | Renombrados a TypeScript; sesión única en `App`. |
| `src/constants/config.ts`, `src/vite-env.d.ts` | Nuevos: URL del backend y tipos de entorno. |
| `src/types/` | Contratos alineados con backend y móvil. |
| `src/services/` | `http.ts`, `auth.service.ts`, `token.service.ts`, `session-storage.service.ts`, `incident.service.ts`. |
| `src/hooks/` | `use-auth.ts`, `use-incident-validation.ts`. |
| `src/components/` | `login-view.tsx`, `incident-validation-view.tsx`. |
| `src/mocks/auth-mock.ts`, `src/utils/display-name.ts` | Nuevos. |
| `src/__tests__/` | Tests de autenticación, incidencias y proxy. |
| `README.md`, `CLAUDE.md`, `.env.example` | Documentación de uso. |

## Checklist de la sesión

- [x] Inventario de backend, móvil y web (issue #128).
- [x] Configuración de TypeScript estricto.
- [x] Tipos y capa HTTP.
- [x] Autenticación.
- [x] Validación de incidencias.
- [x] Tests, typecheck, lint y build.
- [x] Prueba manual contra el backend local con Docker Compose.

## Documentos actualizados

- [x] `docs/spec/features/07-11-26-migracion-typescript-backend/spec.md` y `plan.md`.
- [x] `docs/spec/bugs/login/28-10-26-login-web-no-conecta-con-el-backend.md` — corregido y verificado.
- [x] `docs/spec/bugs/todo.md` — bugs resueltos y listado pendiente anotado.

## Estado / Verificación

Feature **implementada con verificación pendiente de una decisión** (cómo seleccionar la incidencia a validar).

- `npm run test` — 38/38.
- `npx tsc --noEmit` — sin errores.
- `npm run lint` — sin errores ni avisos.
- `npm run build` — correcto.
- Navegador contra el backend de `dev`:
  - login real, contraseña errónea y cuenta `civic` rechazada;
  - sesión restaurada al recargar;
  - incidencia con dos imágenes;
  - validación con prioridad (`validated`/`high`) y descarte (`rejected`), comprobados en la API;
  - errores 400, 404 y 409;
  - backend apagado, con reintento en incidencias y respaldo con aviso en el login.

## Pendiente / diferido

- [ ] Listado de incidencias pendientes para el personal en el backend.
- [ ] CORS del backend para producción.
- [ ] `docker compose build` falló en esta máquina con `invalid character` (problema local de Docker Desktop); se construyó con `docker build`.
