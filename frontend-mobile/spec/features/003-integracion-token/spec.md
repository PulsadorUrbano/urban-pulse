# 003 · Integración de token

**Estado:** implementado (camino real de ciudadanía diferido)

## Qué hace

Tras iniciar sesión, la app obtiene un **token de acceso** para la sesión. El flujo es:

1. El login **valida las credenciales contra el mock** (`json-server`, colección `users`), igual que en la 002.
2. Solo tras validar, la app intenta obtener el token **real del backend** (`POST /auth/token` con `{ userId }`, puerto 4000).
3. Si el backend no puede emitirlo (404 por usuario inexistente, caído, timeout o error de red), la capa de servicio genera un **token simulado** (`source: 'mock'`), con retardo de red simulado, para mantener trazabilidad y permitir desarrollo sin backend.
4. El token se guarda en `expo-secure-store` (clave `urbanpulse.auth.token`) y se expone en el contexto de sesión (`useSession`). Al cerrar sesión se elimina.

Un fallo de token **nunca bloquea el login** ni cuenta como intento fallido para el bloqueo escalado. Si incluso la simulación fallara, se entra con `token = null`. Opcionalmente se muestra un aviso suave y no bloqueante cuando el token es simulado o ausente.

## Por qué

El backend (rama `feature/token`) ya implementa autenticación por JWT, y la app debe prepararse para consumirla. Se adopta la convención "backend real + simulación mock": si una feature existe en el backend se consume de él, y el mock mantiene una simulación equivalente para trazabilidad y pruebas sin backend levantado.

**Limitación actual:** el backend **no tiene registro de ciudadanía** (`createUser`); el único usuario es el admin sembrado (`admin`/`admin`, solo con `NODE_ENV=development`). Los usuarios del mock no existen en su BD, así que **hoy ningún ciudadano puede obtener un token real**. El camino real queda **diferido** y hoy todos los logins entran con token simulado.

## Criterios de aceptación

- [x] El login sigue validando contra el mock; credenciales incorrectas se comportan exactamente como en la 002.
- [x] Tras un login válido se llama a `requestToken(user.id)`; con backend respondiendo `200` el token resultante tiene `source: 'backend'` (verificado en tests del servicio con respuesta simulada; ver DIFERIDO abajo para el camino real).
- [x] Con `404`, respuesta no OK, timeout o error de red, se obtiene un token `source: 'mock'` mediante `simulateToken` (con retardo simulado).
- [x] Si falla incluso la simulación, el login continúa con `token = null` y no lanza error.
- [x] Un fallo de token no cuenta como fallo de login ni invoca `registerFailure` (el bloqueo de `lockout.service.ts` no se ve afectado).
- [x] El token se persiste en `expo-secure-store` con la clave `urbanpulse.auth.token`; un JSON corrupto se trata como ausencia de token sin lanzar.
- [x] `useSession` expone `token`; `signIn(user, token)` lo guarda y `signOut()` lo limpia.
- [x] `BACKEND_API_URL` se resuelve con prioridad `EXPO_PUBLIC_BACKEND_URL`, luego host del dev server en puerto 4000, y fallback `http://localhost:4000`.
- [x] `CLAUDE.md` incluye la convención "Backend real + simulación mock".
- [x] Tests de `token.service` y `token-storage.service` pasan; `npx expo lint` y `npx tsc --noEmit` sin errores; cero `any`. (La suite completa tiene 1 fallo preexistente ajeno: `typewriter-text.test.tsx`.)
- [ ] **DIFERIDO** · Un ciudadano real obtiene un token `source: 'backend'` de extremo a extremo. Motivo: el backend aún no expone registro/creación de ciudadanos; solo el admin sembrado (`admin`/`admin`, `NODE_ENV=development`) obtiene token real. Hoy la app usa la simulación mock para todos los logins.

## Fuera de alcance

- Registro de ciudadanía y camino real de extremo a extremo con ciudadanos (depende del backend).
- Fixture de usuario admin en `db.json`.
- Uso del token en peticiones autenticadas (`GET /auth/me`, cabecera `Authorization`), refresco y expiración del token.
- Restaurar la sesión al reiniciar la app a partir del token (el usuario sigue solo en memoria).
- Modificar `backend/`.
