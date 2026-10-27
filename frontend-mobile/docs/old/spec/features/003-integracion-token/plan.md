# 003 · Integración de token — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

## Enfoque

Diseño "real-first + simulación mock": un `token.service.ts` intenta `POST /auth/token` en el backend y degrada a un token simulado en la capa de servicio (patrón de `storage.service.ts`). La persistencia en SecureStore se aísla en `token-storage.service.ts` (espejo de `lockout.service.ts`) y el token se expone vía el contexto de sesión. El hook de login orquesta validación mock + token sin alterar la semántica de bloqueo.

## Implementación

1. **Config** — `src/constants/config.ts`: añadir `BACKEND_SERVER_PORT = 4000` y exportar `BACKEND_API_URL` con la misma lógica que `API_BASE_URL` (prioridad `process.env.EXPO_PUBLIC_BACKEND_URL`, luego host de `Constants.expoConfig.hostUri`, fallback `http://localhost:4000`), reutilizando el helper de resolución de host existente.
2. **Tipos** — `src/types/auth.ts` (o nuevo `src/types/token.ts`): `TokenPayload { userId; username; role: UserRole }`, `CreateTokenRequest { userId }`, `CreateTokenResponse { accessToken }`, `TokenSource = 'backend' | 'mock'`, `AuthToken { accessToken; source }`.
3. **Servicio de token** — `src/services/token.service.ts`: `requestToken(userId): Promise<AuthToken | null>` con `fetchWithTimeout` (`http.ts`) a `${BACKEND_API_URL}/auth/token`; `200` -> `source: 'backend'`; `404`/`!ok`/`RequestTimeoutError`/error de red -> `simulateToken(userId)`; fallo absoluto -> `null`; nunca lanza. `simulateToken` genera `mock.<base64(payload)>.<sig>` con `setTimeout` simulando red, sin criptografía real.
4. **Persistencia** — `src/services/token-storage.service.ts`: clave `urbanpulse.auth.token`; `saveToken(AuthToken)`, `loadToken(): Promise<AuthToken | null>` (valida/sanea el JSON con `try/catch`), `clearToken()`.
5. **Contexto de sesión** — `src/hooks/use-session.ts`: añadir `token: AuthToken | null`; `signIn(user, token)` guarda con `saveToken`; `signOut()` llama a `clearToken()`. El `user` sigue solo en memoria.
6. **Hook de login** — `src/hooks/use-login.ts`: tras `authService.login(input)` exitoso, llamar a `requestToken(user.id)`; `submitLogin` devuelve `{ user, token }`. El fallo de token queda fuera del `catch` de `InvalidCredentialsError` y no dispara `registerFailure`.
7. **Pantalla de login** — `src/app/login.tsx`: en `handleSubmit`, `const result = await submitLogin(input); if (result?.user) { signIn(result.user, result.token); router.replace('/'); }`. Opcional: aviso suave no bloqueante si `token === null` o `token.source === 'mock'`.
8. **Convención** — `CLAUDE.md` (sección *Flujo de trabajo*, nuevo bullet): "Backend real + simulación mock: si una feature ya está implementada en el backend, el móvil la consume del backend real; además, el mock mantiene una simulación equivalente para trazabilidad y desarrollo sin backend".
9. **Tests** — `src/__tests__/services/token.service.test.ts` y `src/__tests__/services/token-storage.service.test.ts` (estilo de `auth.service.test.ts` / `lockout.service.test.ts`): 200 -> backend; fallback a simulación en 404, timeout y error de red; `null` en fallo total; guardar/cargar/limpiar y JSON corrupto.

## Decisiones

- **Real-first con simulación en servicio** — trazabilidad y desarrollo offline; se descarta consumir solo el mock (ignora el backend ya hecho) o solo el backend (hoy ningún ciudadano obtiene token).
- **Fallo de token no bloquea el login** — se entra con token simulado o `null`; se descarta tratarlo como error de login para no castigar al usuario ni contaminar el bloqueo.
- **SecureStore para el token** — igual que el bloqueo; se descarta AsyncStorage (no seguro). Sin dependencias nuevas.
- **Sin fixture admin en `db.json`** — el camino real no se prueba hasta que el backend admita ciudadanos.
- **Segunda URL base separada** (`BACKEND_API_URL`) — el mock (3000) y el backend (4000) conviven.

## Riesgos

- **Backend sin registro de ciudadanía** — el camino real queda diferido; la simulación cubre el flujo.
- **Seed del admin requiere `NODE_ENV=development`** y el `docker-compose` actual no lo fija — documentado; no se modifica fuera de `frontend-mobile/`.
- **`localhost` no sirve en dispositivo físico** — `BACKEND_API_URL` usa el host del dev server o `EXPO_PUBLIC_BACKEND_URL`.
- **Token simulado confundido con real** — `source: 'mock'` explícito y comentarios en español en el servicio.
- **Regresión del bloqueo** — tests y revisión para asegurar que `registerFailure` no se invoca por fallos de token.
