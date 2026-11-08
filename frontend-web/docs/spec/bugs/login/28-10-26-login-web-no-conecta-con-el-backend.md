# 28-10-26 — Bug: el login web no se conecta con el backend real

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

- Feature afectada: login.
- Rama: fix/login-frontend-web (28-10, sin mergear) e integrado en feature/web-typescript-migration.
- Última actualización: 2026-11-07.
- Estado: Corregido y verificado.
- Origen: entrada de `bugs/todo.md` (27-10-26) y revisión del login tras mergear `feature/token` en `dev` (PR #110).

## Síntoma observado

Con el backend levantado, el login del panel web nunca obtiene un token real: la sesión siempre se marca como «JWT Emulado». Además:

- Un usuario real del backend que no esté en la lista fija de la web no puede entrar, y uno de la lista entra aunque su contraseña real sea otra.
- Una cuenta de ciudadanía (`civic`) podría entrar al panel del personal municipal.
- Al recargar la página, un usuario real pierde la sesión.

## Diagnóstico

- Archivo y línea donde está la causa real: `frontend-web/src/services/authService.ts` (versión de `dev`): `requestToken` (`fetch(`${API_BASE_URL}/auth/token`)`), `login()` (búsqueda en `MOCK_USERS` antes de pedir el token), `signHmacSha256`/`generateUniqueJwtToken` (`DEV_JWT_SECRET = 'urban-pulse-dev-secret'`) y `getCurrentSession()` (`MOCK_USERS.find`).
- Causa:
  1. `POST /auth/token` está retirado del backend (`backend/src/auth/auth.controller.ts` solo expone `register`, `login` y `me`); la petición fallaba siempre y se caía al respaldo.
  2. Las credenciales se validaban contra `MOCK_USERS`, nunca contra el backend.
  3. El respaldo firmaba el JWT en el navegador con el mismo valor que `JWT_SECRET` en `backend/.env.example`: con ese secreto, un token fabricado en el navegador se aceptaba en `GET /auth/me` y se mostraba como verificado.
  4. No había filtro por rol (ADR 0002: la web es solo para el personal municipal).
  5. La sesión reconstruía el usuario desde `MOCK_USERS`.
  6. Con el backend apagado, el proxy de Vite responde `502` en lugar de un error de red, y eso no se trataba como falta de conexión.
- Alcance del fallo: login, restauración de sesión y consola técnica de `LoginView`. La vista de incidencias no usa el token.
- El backend funciona según su contrato; no se toca.

## Corrección aplicada

Se sigue el patrón de `frontend-mobile/src/services/auth.service.ts` (real-first con fallback al mock). La primera versión (28-10) tenía un interruptor `VITE_AUTH_SOURCE` con datos simulados por defecto; nunca llegó a `dev` y se retiró al integrarse en la migración a TypeScript (feature [07-11-26](../../features/07-11-26-migracion-typescript-backend/spec.md)):

- `POST /auth/login` con `{ usernameOrEmail, password }` y, con el token, `GET /auth/me`. Un `401` es «credenciales incorrectas» y nunca cae al mock; otros rechazos muestran el mensaje del backend. Solo sin conexión (error de red, timeout o `502`/`503`/`504` del proxy) se usan los datos simulados, con un aviso visible que no se salta al entrar al panel.
- Las respuestas se validan con type guards; una respuesta sin `accessToken` o con otro formato produce `BackendContractError`.
- Datos simulados en `src/mocks/auth-mock.ts`. Token simulado `mock.<payload>.simulated`, sin firma ni secreto, que nunca se envía al backend.
- Se rechaza el rol `civic` (`ForbiddenRoleError`) con un mensaje que remite a la app móvil.
- La sesión guarda el usuario que devuelve el backend, en `localStorage` («Mantener sesión iniciada») o `sessionStorage`. Al recargar, un token del backend se revalida con `GET /auth/me`: `401` cierra la sesión; sin conexión se conserva.
- La consola técnica deja de describir cookies HttpOnly (el backend no las usa) y muestra los endpoints reales.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | frontend-web/.env.example | `VITE_BACKEND_URL` y `URBAN_PULSE_PROXY_URL` documentados. |
| Crear | frontend-web/src/constants/config.ts, src/vite-env.d.ts | URL del backend y tipos de `import.meta.env`. |
| Crear | frontend-web/src/services/http.ts, token.service.ts, session-storage.service.ts | Capa HTTP, token y sesión. |
| Crear | frontend-web/src/mocks/auth-mock.ts | Usuarios simulados y token simulado sin firma. |
| Reescribir | frontend-web/src/services/auth.service.ts (antes authService.ts) | Login real-first, filtro de rol, sesión y verificación del token. |
| Reescribir | frontend-web/src/hooks/use-auth.ts, src/components/login-view.tsx | Sesión única, aviso de respaldo y consola técnica. |
| Reescribir | frontend-web/src/__tests__/services/auth.service.test.ts | Casos del login, la sesión y el token. |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: en `dev` (antes de la #115), `authService.ts` llamaba a `POST /auth/token`, que no existe en `auth.controller.ts`; `npx tsc --noEmit` daba `Property 'env' does not exist on type 'ImportMeta'`.
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: en el navegador contra el backend de `dev` (Docker Compose, 2026-11-07), `admin`/`admin` entra con JWT real verificado en `GET /auth/me`; una contraseña errónea muestra «Usuario o contraseña incorrectos.»; `ciudadano` se rechaza; con el backend apagado se entra con datos simulados y aviso; al recargar, la sesión se restaura.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.
- [x] Tests en `src/__tests__/services/auth.service.test.ts`.

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-11-07.
- Evidencia de que no reaparece: `npm run test` 38/38, `npx tsc --noEmit` sin errores, `npm run lint` sin errores, `npm run build` correcto, y la prueba manual descrita.
- Limitaciones y pendientes: CORS en producción anotado en `bugs/todo.md`.
