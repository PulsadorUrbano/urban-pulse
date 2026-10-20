# 003 · Integración de token — Tareas

_Checklist accionable derivada del `plan.md`. Tareas pequeñas y concretas; marca `[x]` al completarlas._

- [x] T1 · Config: segunda URL base del backend (`src/constants/config.ts`).
  - [x] Añadir `BACKEND_SERVER_PORT = 4000`.
  - [x] Exportar `BACKEND_API_URL` (`EXPO_PUBLIC_BACKEND_URL` > host del dev server > `http://localhost:4000`).
  - [x] Reutilizar el helper de host existente (sin duplicar el `split(':')`).
- [x] T2 · Tipos de token (`src/types/token.ts`).
  - [x] `TokenPayload`, `CreateTokenRequest`, `CreateTokenResponse`.
  - [x] `TokenSource` y `AuthToken`.
- [x] T3 · `src/services/token.service.ts` (depende de T1, T2).
  - [x] `requestToken(userId)` con `fetchWithTimeout` a `/auth/token`; 200 -> `source: 'backend'`.
  - [x] Degradar a `simulateToken` en 404, `!ok`, timeout y error de red; `null` si todo falla; nunca lanza.
  - [x] `simulateToken(userId)` con `setTimeout` simulado y formato `mock.<base64>.<sig>`.
- [x] T4 · `src/services/token-storage.service.ts` (depende de T2).
  - [x] Clave `urbanpulse.auth.token`; `saveToken`, `loadToken` (sanea JSON con `try/catch`), `clearToken`.
- [x] T5 · `src/hooks/use-session.ts` (depende de T2, T4).
  - [x] Añadir `token: AuthToken | null` al contexto.
  - [x] `signIn(user, token)` guarda el token; `signOut()` llama a `clearToken()`.
- [x] T6 · `src/hooks/use-login.ts` (depende de T3).
  - [x] Llamar a `requestToken(user.id)` tras login válido; `submitLogin` devuelve `{ user, token }`.
  - [x] Verificar que el fallo de token no dispara `registerFailure` ni entra al `catch` de credenciales.
- [x] T7 · `src/app/login.tsx` (depende de T5, T6).
  - [x] `signIn(result.user, result.token)` y `router.replace('/')`.
  - [x] (Opcional) aviso suave no bloqueante si el token es `mock` o `null`.
- [x] T8 · Convención en `CLAUDE.md` (bullet "Backend real + simulación mock" en *Flujo de trabajo*).
- [x] T9 · Tests (pueden ir en paralelo por servicio tras T3 y T4).
  - [x] `src/__tests__/services/token.service.test.ts`: 200, fallback en 404/timeout/error de red, `null` en fallo total.
  - [x] `src/__tests__/services/token-storage.service.test.ts`: guardar/cargar/limpiar y JSON corrupto.
  - [x] `src/__tests__/constants/` (config): resolución de `BACKEND_API_URL`.
- [x] T10 · Ejecutar `npx expo lint`, `npx tsc --noEmit` y `npm test`.
  - [x] `npx tsc --noEmit`: OK.
  - [x] `npx expo lint`: limpio, sin errores ni warnings.
  - [x] `npx jest` (suite completa): 223 passed, 1 failed. El único fallo es `src/__tests__/components/typewriter-text.test.tsx` ("usa 45 ms por defecto..."), **preexistente y ajeno a la 003** (componente y test idénticos a la rama base `feature/login-frontend-mobile`). Todos los tests de la 003 y los de login/sesión pasan.
- [x] T11 · Documentar en `docs/2026-10-19-003-integracion-token.md` (checklist de subtareas).
- [x] Validar contra los criterios de aceptación de `spec.md` (camino real de ciudadanía marcado como DIFERIDO).
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Verificación final

- [x] `npx tsc --noEmit` y `npx expo lint` — sin errores.
- [x] `npm test` — suites de la 003 y de login/sesión verdes; único fallo preexistente en `typewriter-text.test.tsx` (ajeno a la 003, seguimiento aparte).
- [x] E2E (camino simulado): `npm run mock`, login `sofia13`/`sofia13` -> backend 404/caído -> token simulado en SecureStore -> navega a `/`; el logout limpia el token.
- [ ] DIFERIDO · Camino real: backend en `:4000` con `NODE_ENV=development` y usuario existente en su BD -> `source: 'backend'`. Motivo: el backend aún no expone registro/creación de ciudadanos; solo el admin sembrado obtiene token real.
