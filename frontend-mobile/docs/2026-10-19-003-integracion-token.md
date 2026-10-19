# Sesión — 2026-10-19 · Feature 003 · Integración de token

## Contexto

La feature 002 (login) está en "Hecho ✅". El backend (rama `feature/token`) ya emite JWT con `POST /auth/token`,
así que la app se prepara para consumirlo. Se adopta la convención **"Backend real + simulación mock"**: si la
funcionalidad existe en el backend se consume de él y el mock mantiene una simulación equivalente. Rama de trabajo:
`feature/token-frontend-mobile`.

## Alcance

- El login valida credenciales contra el mock (`users`) como en la 002.
- Tras validar, `requestToken(user.id)` intenta `POST /auth/token` en `BACKEND_API_URL` (puerto 4000).
- Ante 404, respuesta no OK, timeout o error de red se genera un token simulado (`source: 'mock'`).
- Si incluso la simulación falla, se entra con `token = null`.
- El token se guarda en `expo-secure-store` y se expone en `useSession`; `signOut()` lo elimina.
- Aviso suave no bloqueante en `login.tsx` si el token es simulado o ausente.

## Decisiones clave

- **Real-first + simulación:** el servicio intenta primero el backend y degrada en la capa de servicio; la UI no conoce el origen salvo por `source`.
- **SecureStore:** el token se persiste en `expo-secure-store` (clave `urbanpulse.auth.token`); un JSON corrupto se trata como ausencia de token.
- **Entrar sin token como fallback:** un fallo de token nunca bloquea el login ni invoca `registerFailure`, por lo que no afecta al bloqueo escalado.
- **Sin fixture admin:** no se añade un usuario admin a `db.json`; el admin sembrado del backend no es ciudadanía y queda fuera del alcance móvil.
- `BACKEND_API_URL`: `EXPO_PUBLIC_BACKEND_URL` > host del dev server en puerto 4000 > `http://localhost:4000`, reutilizando el helper de host existente.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/constants/config.ts` | Modificado: `BACKEND_SERVER_PORT` y `BACKEND_API_URL`. |
| `src/types/token.ts` | Nuevo: `TokenPayload`, `CreateTokenRequest`, `CreateTokenResponse`, `TokenSource`, `AuthToken`. |
| `src/services/token.service.ts` | Nuevo: `requestToken` y `simulateToken`. |
| `src/services/token-storage.service.ts` | Nuevo: `saveToken`, `loadToken`, `clearToken`. |
| `src/hooks/use-session.ts` | Modificado: `token` en el contexto, `signIn(user, token)`, `signOut()` limpia. |
| `src/hooks/use-login.ts` | Modificado: solicita token tras login válido; devuelve `{ user, token }`. |
| `src/app/login.tsx` | Modificado: `signIn(user, token)` y aviso suave. |
| `CLAUDE.md` | Modificado: convención "Backend real + simulación mock". |
| `src/__tests__/services/token.service.test.ts` | Nuevo. |
| `src/__tests__/services/token-storage.service.test.ts` | Nuevo. |
| `src/__tests__/constants/` | Nuevo: tests de config. |

## Checklist de la sesión

- [x] T1 · Config `BACKEND_API_URL`.
- [x] T2 · Tipos de token.
- [x] T3 · `token.service.ts`.
- [x] T4 · `token-storage.service.ts`.
- [x] T5 · `use-session.ts`.
- [x] T6 · `use-login.ts`.
- [x] T7 · `login.tsx`.
- [x] T8 · Convención en `CLAUDE.md`.
- [x] T9 · Tests de `token.service`, `token-storage` y config.
- [x] T10 · Lint, typecheck y tests.
- [x] T11 · Documentación en `docs/`.
- [x] Criterios de aceptación de `spec.md` validados (camino real DIFERIDO).
- [x] Feature movida a "Hecho" en el roadmap.

## Documentos actualizados

- [x] `spec/features/003-integracion-token/spec.md` — estado "implementado", criterios `[x]` y uno DIFERIDO.
- [x] `spec/features/003-integracion-token/tasks.md` — todas las tareas `[x]`.
- [x] `spec/constitution/roadmap.md` — 003 en "Hecho ✅"; "Siguiente" vacío.

## Estado / Verificación

Feature **completada y verificada** (camino real de ciudadanía diferido).

- `npx tsc --noEmit` — sin errores.
- `npx expo lint` — sin errores ni warnings.
- `npx jest` — 223 passed, 1 failed (fallo preexistente, ver abajo).

## Pendiente / diferido

- [ ] **Camino del token real:** a la espera de que el backend exponga registro/creación de ciudadanos. Hoy solo el admin sembrado (`admin`/`admin`, `NODE_ENV=development`) obtiene token real; los usuarios del mock no existen en su BD, así que la app usa la simulación.
- [ ] **Bug ajeno a documentar y seguir aparte:** `src/__tests__/components/typewriter-text.test.tsx` ("usa 45 ms por defecto...") falla. Es preexistente: componente y test son idénticos a la rama base `feature/login-frontend-mobile` y la 003 no los toca.
- Fuera de alcance (futuro): uso del token en peticiones autenticadas (`Authorization`, `GET /auth/me`), refresco/expiración y restaurar sesión al reiniciar a partir del token.

> Detalle granular en `spec/features/003-integracion-token/tasks.md`
