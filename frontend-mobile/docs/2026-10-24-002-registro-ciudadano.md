# Sesión — 2026-10-24 · Feature 24-10-26 · Registro de ciudadano

## Contexto

Hasta ahora `src/app/login.tsx` solo permitía iniciar sesión contra el mock (`db.json`, colección
`users`, vía `src/services/auth.service.ts`); no existía ningún camino para crear una cuenta nueva
desde la app. El backend NestJS todavía no expone ningún endpoint de registro, así que esta sesión
implementa el alta de ciudadano como **mock-only** sobre `db.json` (colecciones `users` + `civics`),
igual que ya era el caso de `login()`. Tras un registro válido, el usuario entra directo a la
interfaz de inicio con sesión iniciada (reutilizando `useSession`/`token.service.ts`, igual que hace
`login`). Rama de trabajo: `feature/registro-ciudadano-frontend-mobile`.

Trazabilidad completa en `docs/spec/features/24-10-26-registro-ciudadano/` (`spec.md` y `plan.md`).

## Alcance

- Enlace "¿No tienes cuenta? Créate una" en `login.tsx` (calcado de "¿Has olvidado tu contraseña?")
  que navega a la nueva pantalla `/register`.
- Pantalla `src/app/register.tsx`: username, email (obligatorio, formato validado), fila de
  teléfono opcional (`CountryCodePicker` + número) y contraseña + confirmación con medidor de
  fuerza dinámico (`PasswordStrengthMeter`). Enlace inferior "¿Ya tienes cuenta? Inicia sesión"
  (`router.back()`).
- Selector de prefijo de país (`CountryCodePicker`), bottom-sheet con el mismo patrón visual que
  `CategoryPicker`: España (`+34`) por defecto, Francia (`+33`) y Portugal (`+351`) también
  disponibles.
- Medidor de fuerza de contraseña (`getPasswordStrengthLevel`): rojo/`invalid` si no cumple mínimo
  8 caracteres + 1 mayúscula + 1 número; naranja/`acceptable` si cumple eso (permite crear la
  cuenta); verde/`strong` si además tiene un carácter especial.
- `register()` nuevo en `auth.service.ts`: comprueba duplicados de `username`/`email` contra el
  mock (reutiliza `fetchUsersByField` ya existente) y, si no hay duplicados, crea el usuario
  (`role: 'civic'` fijo, sin selector en la UI — esta app es solo para ciudadanía).
- `createCivic()` nuevo en `civic.service.ts`: si se escribió teléfono, crea el registro de
  `civics` (`userId` + `phone` con prefijo completo); su fallo es no bloqueante.
- `useRegister()` nuevo (calcado de `useLogin`, **sin** lockout) que orquesta
  `register()` → `createCivic()` (si hay teléfono) → `requestToken(user.id)`.
- Tras un registro válido: `signIn(user, token)` + `router.replace('/')`, igual que `login.tsx`.

## Decisiones clave

- `role: 'civic'` es un valor fijo en `register()`, no seleccionable desde la UI (app estrictamente
  para la ciudadanía, ver "Alcance y restricciones" de `CLAUDE.md`).
- El medidor de fuerza es una guía visual, no un bloqueo progresivo: el único umbral que impide
  crear la cuenta es `invalid`; `acceptable` y `strong` permiten enviar el formulario por igual.
- `UsernameOrEmailTakenError` es una única clase de error para ambos duplicados (username o
  email), con mensaje de texto distinto según cuál de los dos campos está duplicado. Orden de
  comprobación: primero `username`, después `email` (mismo orden que ya usa `login()` para buscar).
- El teléfono completo que se envía a `createCivic` es `${selectedCountry.dialCode}${número}`,
  construido solo si el usuario escribió algún número; si no, no se llama a `createCivic` en
  absoluto (no se crea un registro `civics` vacío).
- `Civic`/`CreateCivicInput` quedan tipados exactamente como `{ userId: string; phone: string }`,
  reemplazando por completo el `src/types/civic.ts` anterior, que estaba roto (nombre duplicado con
  el `User` de `src/types/user.ts`, campo `user_id` inconsistente, sin uso en el código).
- Esta feature es mock-only de principio a fin: no existe ningún endpoint de registro en el
  backend real, por lo que no aplica el patrón real-first/fallback salvo en `requestToken`
  (ya existente, reutilizado sin cambios).
- No se backfillea ni modifica ningún registro existente de `db.json`: las colecciones `users`/
  `civics` ya tenían la forma correcta; esta feature solo añade la operación de creación desde la
  app.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/types/country.ts` | Nuevo: interfaz `Country`. |
| `src/constants/countries.ts` | Nuevo: `COUNTRIES` (ES, FR, PT) + `DEFAULT_COUNTRY`. |
| `src/components/country-code-picker.tsx` | Nuevo: selector de prefijo de país (bottom-sheet, patrón de `CategoryPicker`). |
| `src/__tests__/components/country-code-picker.test.tsx` | Nuevo. |
| `src/__tests__/constants/countries.test.ts` | Nuevo (añadido durante la implementación, no previsto en el plan original). |
| `src/utils/password-strength.ts` | Nuevo: `getPasswordStrengthLevel`, `isEmailFormatValid`. |
| `src/__tests__/utils/password-strength.test.ts` | Nuevo. |
| `src/components/password-strength-meter.tsx` | Nuevo: medidor visual de fuerza de contraseña. |
| `src/__tests__/components/password-strength-meter.test.tsx` | Nuevo. |
| `src/types/civic.ts` | Modificado: reemplaza por completo el `User` roto por `Civic`/`CreateCivicInput`. |
| `src/services/civic.service.ts` | Nuevo: `createCivic` (patrón de `image.service.ts`). |
| `src/__tests__/services/civic.service.test.ts` | Nuevo. |
| `src/types/user.ts` | Modificado: añade `RegisterUserInput`. |
| `src/services/auth.service.ts` | Modificado: añade `UsernameOrEmailTakenError` y `register()`. |
| `src/__tests__/services/auth.service.test.ts` | Modificado: casos nuevos de `register()` (duplicados, éxito, red/timeout). |
| `src/hooks/use-register.ts` | Nuevo: `useRegister` (calcado de `useLogin`, sin lockout). |
| `src/__tests__/hooks/use-register.test.ts` | Nuevo. |
| `src/app/register.tsx` | Nuevo: pantalla de registro. |
| `src/__tests__/app/register-screen.test.tsx` | Nuevo. |
| `src/app/login.tsx` | Modificado: añade el enlace "¿No tienes cuenta? Créate una". |
| `src/__tests__/app/login-session-restore.test.tsx` | Modificado: +1 test para el nuevo enlace (añadido durante la implementación, no previsto en el plan original). |
| `src/app/_layout.tsx` | Modificado: registra `Stack.Screen name="register"`. |
| `docs/spec/features/24-10-26-registro-ciudadano/spec.md`, `plan.md` | Trazabilidad de la feature (contrato, plan, criterios, confirmación de implementación). |

## Checklist de la sesión

- [x] T1 · Tipos + constantes + componente de país (`Country`, `COUNTRIES`, `CountryCodePicker`).
- [x] T2 · Util de fuerza de contraseña + componente del medidor (`password-strength.ts`, `PasswordStrengthMeter`).
- [x] T3 · Tipos `Civic`/`CreateCivicInput` + servicio `civic.service.ts`.
- [x] T4 · `RegisterUserInput` + `register()`/`UsernameOrEmailTakenError` en `auth.service.ts`.
- [x] T5 · Hook `use-register.ts`.
- [x] T6 · Pantalla `register.tsx` + wiring de navegación (`login.tsx`, `_layout.tsx`).
- [x] Criterios de aceptación de `spec.md` validados (los 9, ver tabla en `plan.md#confirmación-de-implementación`).
- [x] Comprobaciones finales (`npx jest`, `npx tsc --noEmit`, `npx expo lint`, `git diff --check`).

## Documentos actualizados

- [x] `docs/spec/features/24-10-26-registro-ciudadano/spec.md` — estado "implementado y verificado".
- [x] `docs/spec/features/24-10-26-registro-ciudadano/plan.md` — las 6 tareas `[x]`, comprobaciones finales y confirmación de implementación rellenas.

## Estado / Verificación

Feature **completada y verificada**.

- `npx jest` (suite completa del proyecto) — 548/548 tests verdes, 41/41 suites, sin regresiones en el resto de la app.
- `npx tsc --noEmit` — 0 errores.
- `npx expo lint` — 0 errores, 0 warnings propios de esta feature (quedan 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no relacionados con esta feature).
- `git diff --check` — sin problemas.

Durante la verificación se detectaron y corrigieron dos incidencias transitorias, ninguna bloqueante al cierre:

- Compiler intermedio de las Tareas 3/4 marcó ❌ porque los testers de las Tareas 1/2 todavía
  estaban escribiendo sus archivos de test en paralelo cuando `tsc` corrió globalmente; con todo
  ya escrito, limpio.
- Compiler intermedio de las Tareas 5/6 marcó ❌ por 3 warnings de lint nuevos en
  `register-screen.test.tsx` (import `ActivityIndicator` sin usar + 2 `require()` dentro del mock
  de `expo-router`); corregido (import eliminado, `require()` silenciados con
  `eslint-disable-next-line`, mismo patrón ya preexistente en `login-session-restore.test.tsx`).

## Pendiente / diferido

- [ ] **`Civic` sin `id` tipado:** el tipo `Civic`/`CreateCivicInput` (Tarea 3) no declara `id`,
  aunque `json-server` lo genera al crear el registro en el mock (se ignora al tipar la
  respuesta). No bloqueante, no especificado en la spec; queda anotado por si se quiere tipar `id`
  en una futura revisión.
- Fuera de alcance (ya documentado en `spec.md`): cualquier endpoint de registro en el backend
  real, recuperación de contraseña, verificación de email/teléfono, 2FA, edición del perfil tras
  el registro, backfill de `db.json`, países distintos a España/Francia/Portugal, lockout en el
  registro.

> Detalle granular en `docs/spec/features/24-10-26-registro-ciudadano/plan.md`.
