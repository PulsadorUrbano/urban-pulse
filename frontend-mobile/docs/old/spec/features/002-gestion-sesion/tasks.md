# 002 · Gestión de sesión (login) — Tareas

_Checklist accionable derivada del `plan.md`. Tareas pequeñas y concretas; marca `[x]` al completarlas._

- [x] T1 · Instalar `expo-secure-store` (`npx expo install`) y crear `src/types/auth.ts`.
- [x] T2 · Crear `src/services/lockout.service.ts` y `src/services/auth.service.ts` (con `InvalidCredentialsError`).
- [x] T3 · Crear hooks `src/hooks/use-session.ts` (SessionProvider) y `src/hooks/use-login.ts`.
- [x] T4 · Crear componentes `src/components/password-input.tsx` y `src/components/typewriter-text.tsx`.
- [x] T5 · Crear pantalla `src/app/login.tsx`.
- [x] T6 · Integrar en `src/app/_layout.tsx` y `src/app/(tabs)/index.tsx`.
- [x] T7 · Tests: `lockout.service`, `auth.service`, `typewriter-text` en `src/__tests__/`.
- [x] T8 · Ejecutar `npx expo lint` y `npx tsc --noEmit` sin errores.
- [x] T9 · Documentar en `docs/` (`YYYY-MM-DD-002-<topic>.md`).
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Verificación final

- `npx tsc --noEmit` — sin errores.
- `npx expo lint` — sin errores.
- `npx jest --ci` — 18 suites / 167 tests en verde.

## Notas de futuro (NO son pendientes de esta feature)

- Resetear el bloqueo de login al cambiar la contraseña de forma verificada.
- El enlace "¿Has olvidado tu contraseña?" no tiene acción (futuro).
- Inconsistencias en `src/types/civic.ts` (no se tocan, solo anotadas): la interfaz se llama `User` y usa
  `user_id`, mientras que `db.json` usa `userId`; `phone` no es opcional pese al comentario que lo indica.
- Cuando se use typewriter, que no se ejecuten saltos de línea en vivo si el componente detecta que es demasiado larga la frase como para caber en horizontal. Los saltos de línea deben estar definidos de antes para que no se vea un salto de línea brusco
