# 26-10-26 — Refactor: auth real-first con fallback a mock (login, registro y sesión)

- Feature afectada: independiente (cruza login, registro de ciudadano y persistencia de sesión).
- Rama: feature/token.
- Última actualización: 2026-10-26.
- Estado: Implementado con verificación manual pendiente.

## Motivo

El login y el registro del móvil hablaban exclusivamente con el mock de `json-server` (`auth.service.ts` solo usaba `API_BASE_URL`), aunque el backend real de `feature/token` ya implementa `POST /auth/register`, `POST /auth/login` y `GET /auth/me`. Además, `token.service.ts` intentaba `POST /auth/token`, endpoint retirado del backend (404 siempre), por lo que todo intento de token real fallaba en silencio y caía al mock aunque login/registro hubieran sido reales.

El resto de servicios (p. ej. `incident.service.ts`) ya sigue el patrón "real-first con fallback a mock": intenta el backend real primero y cae al mock solo si falla la conexión (timeout/red), avisando en pantalla; si el backend rechaza la petición (401/409/400) es un resultado definitivo y no cae al mock. Este refactor aplica el mismo patrón a login y registro para que prioricen el backend real allí donde ya está disponible.

> Nota sobre el término "refactor": a diferencia de una refactorización pura, este cambio sí introduce comportamiento nuevo observable cuando hay backend disponible (login/registro reales, validación de sesión contra `/auth/me`, avisos nuevos en pantalla). Se documenta aquí, bajo `refactor/`, porque así se decidió con el usuario y porque el comportamiento mock existente se preserva intacto como fallback; no es un bug fix.

## Alcance

- Alcance confirmado:
  - `login`/`register` en `auth.service.ts` intentan primero el backend real (`POST /auth/login`, `POST /auth/register` + `GET /auth/me`) y caen al mock solo ante fallo de conexión.
  - Restauración de sesión (`use-session.ts`) valida contra `GET /auth/me` cuando el token guardado es de origen backend, con fallback a confiar en lo local si no hay conexión; si el backend dice que el token es inválido/expirado, se cierra sesión.
  - Eliminación de `requestToken` (llamaba a `POST /auth/token`, retirado del backend); `simulateToken` se conserva como generador de token para el camino mock.
  - Tipos `User`/`SessionUser` pasan a unión discriminada (`MockUser | BackendUser`) para representar ambos orígenes sin `any`.
  - Nuevos avisos en `login.tsx`/`register.tsx`: fallback a mock ("No se ha podido conectar al backend, realizando en el mock") y caso especial de registro backend-ok-pero-login-automático-falla ("Tu cuenta se ha creado, pero no se pudo iniciar sesión automáticamente. Inicia sesión.").
- Fuera de alcance:
  - Incidencias (registrar, ver mis incidencias, categorías): el backend de `feature/token` no tiene módulo de incidencias, siguen 100% mock, sin cambios.
  - `backend/` y `frontend-web/`: no se tocan.
  - Logout: no cambia (no hay endpoint de logout, JWT sin estado, ya era puramente local).
- Comportamiento preservado:
  - El camino mock de login/registro (búsqueda en `/users`, `fetchUsersByField`, mensajes de error `InvalidCredentialsError`/`UsernameOrEmailTakenError`) conserva su lógica línea por línea; solo se activa cuando no hay conexión con el backend real.
  - `user?.civicId` sigue estando disponible para "mis incidencias"/"registrar incidencia" sea cual sea el origen del usuario: en `BackendUser` se sintetiza igual a `userId` (el backend no tiene ese concepto, pero esas dos pantallas lo leen directamente y no se tocan).
  - Un usuario con sesión mock sigue restaurándose igual que antes (sin llamada de red añadida).

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/types/user.ts` | `User`/`SessionUser` pasan a unión discriminada `MockUser \| BackendUser`. |
| Modificar | `src/types/token.ts` | Elimina `CreateTokenRequest`/`CreateTokenResponse` (contrato del endpoint retirado). |
| Modificar | `src/services/http.ts` | Añade `extractBackendErrorMessage`/`buildBackendRejectionMessage` como exports reutilizables (copiados de `incident.service.ts`, que conserva su copia privada intacta). |
| Modificar | `src/services/token.service.ts` | Elimina `requestToken` (llamaba al endpoint retirado); `simulateToken` pasa a export. |
| Modificar | `src/services/auth.service.ts` | Pieza central: `login`/`register` real-first con fallback; nuevo `validateBackendSession`. |
| Modificar | `src/services/session-user-storage.service.ts` | Reconstruye `SessionUser` campo a campo según `source` (mock/backend). |
| Modificar | `src/hooks/use-login.ts` | `submitLogin` ya no orquesta `requestToken` aparte; propaga `source`. |
| Modificar | `src/hooks/use-register.ts` | `submitRegister` ya no orquesta `requestToken`; `createCivic` solo en camino mock; propaga `source`/`autoLoginFailed`. |
| Modificar | `src/hooks/use-session.ts` | Valida token backend contra `/auth/me` al restaurar sesión; `toSessionUser` para quitar `password` solo en usuarios mock. |
| Modificar | `src/app/login.tsx` | Aviso de fallback a mock (retiene `signIn` hasta confirmar, para no disparar el guard `if (user)` antes de tiempo). |
| Modificar | `src/app/register.tsx` | Aviso de fallback a mock + aviso de `autoLoginFailed`. |
| Modificar | `src/__tests__/services/token.service.test.ts` | Reescrito: solo `simulateToken`, sin los casos de `requestToken`. |
| Modificar | `src/__tests__/services/auth.service.test.ts` | Reescrito: casos real-first/fallback de `login`/`register`, `validateBackendSession`. |
| Crear | `src/__tests__/hooks/use-login.test.ts` | Nuevo (no existía). |
| Modificar | `src/__tests__/hooks/use-register.test.ts` | Adaptado a `RegisterResult`, casos `source`/`autoLoginFailed`. |
| Modificar | `src/__tests__/hooks/use-session.test.ts` | Mock de `validateBackendSession`, casos `valid`/`invalid`/`unknown`. |
| Modificar | `src/__tests__/app/login-session-restore.test.tsx` | Mock defensivo de `validateBackendSession`. |
| Crear | `src/__tests__/app/login-screen-submit.test.tsx` | Nuevo: flujo de envío de login (backend/mock/fallo). |
| Modificar | `src/__tests__/app/register-screen.test.tsx` | Fixture `RegisterSuccess` con `source`/`autoLoginFailed`; casos de aviso mock y `autoLoginFailed`. |
| Modificar | `src/__tests__/services/session-user-storage.service.test.ts`, `src/__tests__/app/incidents/new-incident-screen.test.tsx`, `src/__tests__/app/tabs/home-screen-logout.test.tsx`, `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx`, `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Fixtures de `User`/`SessionUser` actualizados con el campo `source`. |

## Verificación

- [x] Registrar el comportamiento observado antes del cambio: login/registro 100% mock, documentado en el contexto de la conversación (no se repite aquí para no duplicar).
- [x] Aplicar el refactor en servicios, hooks y pantallas (`auth.service.ts`, `token.service.ts`, `http.ts`, `use-login.ts`, `use-register.ts`, `use-session.ts`, `session-user-storage.service.ts`, `login.tsx`, `register.tsx`).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos (solo quedan los 2 warnings preexistentes de `require()` en `login-session-restore.test.tsx`, ajenos a este cambio).
- [x] Tests existentes en `src/__tests__/` siguen pasando (589/589, 43 suites); no se elimina cobertura salvo la de `requestToken` (código eliminado porque llamaba a un endpoint retirado del backend); se añade cobertura nueva para los caminos backend/fallback/`autoLoginFailed` y para la validación de sesión contra `/auth/me`.
- [ ] Confirmar manualmente el comportamiento real-first/fallback con el backend y el mock levantados (pendiente, requiere arrancar ambos servicios).

## Confirmación

- Estado final: Implementado con verificación manual pendiente.
- Fecha de revisión: 2026-10-26.
- Resultado entregado: `auth.service.ts` prioriza el backend real en login/registro (con `GET /auth/me` para completar los datos de usuario y el login automático tras el registro) con fallback automático a mock ante fallo de conexión; `use-session.ts` valida la sesión restaurada contra `/auth/me` cuando el token es de origen backend; se retiró la llamada muerta a `POST /auth/token`; `login.tsx`/`register.tsx` muestran los avisos de fallback y de `autoLoginFailed`. Typecheck, lint y las 589 pruebas de la suite pasan.
- Decisiones y desviaciones:
  - `civicId` se mantiene también en `BackendUser` (sintetizado como `userId`), desviación respecto al primer borrador del diseño, para no romper `my-incidents.tsx`/`new.tsx` (fuera de alcance) que leen `user?.civicId` directamente.
  - En `login.tsx`/`register.tsx` se retiene `signIn` hasta que el usuario confirma el aviso de fallback, en vez de llamarlo antes de mostrar el aviso: el guard existente `if (user) return <Redirect .../>` navegaría de inmediato en cuanto `signIn` se ejecutara, sin dar tiempo a ver el aviso. Esto se detectó y corrigió durante la propia implementación de las pantallas.
- Limitaciones y pendientes:
  - Falta la verificación manual end-to-end (backend + mock levantados) descrita en el plan de implementación: confirmar en los logs que las peticiones llegan a `/auth/login`, `/auth/register`, `/auth/me` con el formato esperado, probar el fallback con el backend apagado, y probar el caso de `autoLoginFailed` cortando la red entre el registro y el login automático.
