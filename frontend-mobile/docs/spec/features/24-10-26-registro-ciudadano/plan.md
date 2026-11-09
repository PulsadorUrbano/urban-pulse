# 2026-10-24 — Plan de implementación: Registro de ciudadano

- Objetivo: pantalla `/register` (enlazada desde `login.tsx`) para crear una cuenta de ciudadano nueva en el mock (`db.json`, `users` + `civics` opcional) con username, email, teléfono opcional con selector de prefijo de país, contraseña + confirmación con medidor de fuerza dinámico; al completar el registro válido, entra directo a la app con sesión iniciada.
- Arquitectura: tipos nuevos (`Country`, `Civic`/`CreateCivicInput` reemplazados, `RegisterUserInput`) + constantes (`COUNTRIES`/`DEFAULT_COUNTRY`) + dos componentes de UI nuevos (`CountryCodePicker` calcado de `CategoryPicker`, `PasswordStrengthMeter`) + un util puro (`password-strength.ts`) + un servicio nuevo (`civic.service.ts`, calcado de `image.service.ts`) + una función nueva en un servicio existente (`register()` en `auth.service.ts`) + un hook nuevo (`useRegister`, calcado de `useLogin` sin lockout) + una pantalla nueva (`register.tsx`, mismo layout que `login.tsx`) + wiring de navegación (`login.tsx`, `_layout.tsx`). Mock-only: no se consume ni simula ningún endpoint de backend real (el backend no expone registro todavía).
- Herramientas: Expo `^58.0.17` + React Native, TypeScript estricto, NativeWind, Expo Router `~58.0.25`, Jest + `jest-expo` + `@testing-library/react-native` (ya instaladas, sin dependencias nuevas).
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/registro-ciudadano-frontend-mobile.
- Estado: implementado y verificado (2026-10-24).

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos. El plan técnico (archivos, firmas, interfaces, reglas de validación y colores del medidor) ya fue diseñado y aprobado explícitamente por la usuaria: no rediseñar, solo implementar tal cual.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `npx expo install` (nunca npm/yarn/pnpm/bun add) y requiere aprobación explícita previa. Esta feature no necesita ninguna dependencia nueva.
- Backend y mock: esta feature es mock-only (el backend no expone ningún endpoint de registro); no aplica el real-first/fallback para `register()`/`createCivic()`. No tocar `TEMPORARY_CIVIC_ID` ni ningún otro camino real ya existente fuera de esta feature. No depurar ni arreglar el backend.
- Nunca borrar lógica o simulación mock que el backend aún no cubra de forma estable; esta feature no sustituye ningún camino previo (no existía registro antes), así que no hay nada que conservar de un camino real anterior.
- No tocar fixtures de `db.json`: las colecciones `users`/`civics` ya tienen la forma correcta; esta feature solo añade la operación de creación desde la app, no backfillea ni modifica registros existentes.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración adicionales a los ya descritos en la especificación.
- Preservar cambios ajenos y la rama acordada (`feature/registro-ciudadano-frontend-mobile`). No crear commits ni hacer push salvo petición explícita.
- Restricciones particulares:
  - `role: 'civic'` es fijo en `register()`, no seleccionable desde la UI (app estrictamente para ciudadanía).
  - El único umbral de contraseña que bloquea el envío es `invalid`; `acceptable` y `strong` permiten enviar el formulario por igual.
  - `createCivic()` solo se llama si el usuario escribió algún número de teléfono (tras `trim()`); su fallo nunca bloquea el registro ni se refleta en `errorMessage`.
  - `useRegister` NO implementa lockout (a diferencia de `useLogin`): sin estado de bloqueo, sin `lockout.service.ts`.
  - `Civic`/`CreateCivicInput` tienen exactamente los campos `{ userId: string; phone: string }`, sin `id` ni otros campos, aunque la respuesta real del mock (`json-server`) incluya un `id` adicional (se ignora al tipar la respuesta).

## Focos de revisión

- Riesgo: comprobar duplicados de username/email con peticiones mal ordenadas o que no corten pronto podría crear un usuario duplicado o dar un mensaje de error incorrecto → cubierto por el criterio 5; verificado en `auth.service.test.ts` (duplicado de username no llega a comprobar email ni a crear el usuario; duplicado de email tras pasar la comprobación de username; mensaje específico por cada campo).
- Riesgo: un fallo de `createCivic` (red/timeout o `!ok`) podría propagarse y bloquear un registro que ya tuvo éxito en `users`, dejando al usuario sin cuenta pese a que ya se creó → cubierto por el criterio 4; verificado en `use-register.test.ts` (fallo de `createCivic` no impide devolver `{ user, token }` ni rellena `errorMessage`).
- Riesgo: construir el teléfono completo (`dialCode` + número) aunque el usuario no haya escrito ningún número crearía un registro `civics` con `phone` igual solo al prefijo → cubierto por el criterio 3; verificado en `register.tsx`/su test de pantalla (sin número escrito, `submitRegister` se llama sin la clave `phone`) y en `use-register.test.ts` (sin `phone`, no se llama a `createCivic`).
- Riesgo: el límite exacto de 8 caracteres en `getPasswordStrengthLevel` podría quedar en el lado equivocado (7 válidos como `acceptable`, u 8 válidos como `invalid`) → cubierto por el criterio 7; verificado explícitamente en `password-strength.test.ts` con 7 y 8 caracteres como casos límite.
- Riesgo: el medidor de fuerza podría renderizar algo (p. ej. "rojo") antes de que el usuario escriba nada, dando una impresión negativa injustificada → cubierto por el criterio 7; verificado en `password-strength-meter.test.tsx` (`password: ''` no renderiza nada).
- Riesgo: un error de red/timeout en `register()` podría tratarse como duplicado (mismo `UsernameOrEmailTakenError`) o crear un registro parcial → cubierto por el criterio 8; verificado en `auth.service.test.ts` (fallo de red/timeout no es `UsernameOrEmailTakenError`, mismo patrón ya probado para `InvalidCredentialsError` en `login`).
- Riesgo: tocar `auth.service.ts` podría romper los tests ya verdes de `login()` → se ejecuta `npx jest src/__tests__/services/auth.service.test.ts` antes y después del cambio de la Tarea 3 para confirmar que los casos de `login` siguen pasando sin cambios.

## Mapa de archivos

Rutas relativas a la raíz del repositorio (`frontend-mobile/`).

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | `src/types/country.ts` | Interfaz `Country`. |
| Crear | `src/constants/countries.ts` | `COUNTRIES` (ES, FR, PT) + `DEFAULT_COUNTRY`. |
| Crear | `src/components/country-code-picker.tsx` | Selector de prefijo de país (bottom-sheet, patrón de `CategoryPicker`). |
| Crear | `src/__tests__/components/country-code-picker.test.tsx` | Tests del componente anterior. |
| Crear | `src/__tests__/constants/countries.test.ts` | Tests de `COUNTRIES`/`DEFAULT_COUNTRY` (añadido durante la Tarea 1, no previsto en el plan original). |
| Crear | `src/utils/password-strength.ts` | `getPasswordStrengthLevel`, `isEmailFormatValid`. |
| Crear | `src/__tests__/utils/password-strength.test.ts` | Tests del util anterior. |
| Crear | `src/components/password-strength-meter.tsx` | Medidor visual de fuerza de contraseña. |
| Crear | `src/__tests__/components/password-strength-meter.test.tsx` | Tests del componente anterior. |
| Modificar | `src/types/civic.ts` | Reemplaza el `User` roto por `Civic`/`CreateCivicInput`. |
| Crear | `src/services/civic.service.ts` | `createCivic` (patrón de `image.service.ts`). |
| Crear | `src/__tests__/services/civic.service.test.ts` | Tests del servicio anterior. |
| Modificar | `src/types/user.ts` | Añade `RegisterUserInput`. |
| Modificar | `src/services/auth.service.ts` | Añade `UsernameOrEmailTakenError` y `register()`. |
| Modificar | `src/__tests__/services/auth.service.test.ts` | Añade casos de `register()` (duplicados, éxito, red/timeout). |
| Crear | `src/hooks/use-register.ts` | `useRegister` (calcado de `useLogin`, sin lockout). |
| Crear | `src/__tests__/hooks/use-register.test.ts` | Tests del hook anterior. |
| Crear | `src/app/register.tsx` | Pantalla de registro. |
| Crear | `src/__tests__/app/register-screen.test.tsx` | Test de integración de la pantalla anterior. |
| Modificar | `src/app/login.tsx` | Añade el enlace "¿No tienes cuenta? Créate una". |
| Modificar | `src/__tests__/app/login-session-restore.test.tsx` | Añade 1 test para el nuevo enlace de `login.tsx` (añadido durante la Tarea 6, no previsto en el plan original). |
| Modificar | `src/app/_layout.tsx` | Registra `Stack.Screen name="register"`. |
| Actualizar | `docs/spec/features/24-10-26-registro-ciudadano/spec.md` y `plan.md` | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

## Preparación

- [ ] Leer CLAUDE.md, `spec.md`, los archivos afectados (`src/app/login.tsx`, `src/services/auth.service.ts`, `src/hooks/use-login.ts`, `src/components/category-picker.tsx`, `src/services/image.service.ts`, `src/types/civic.ts`, `src/types/user.ts`, `src/app/_layout.tsx`, `src/hooks/use-session.ts`, `src/services/token.service.ts`, `src/components/password-input.tsx`, `db.json`) y el estado de Git.
- [ ] Esta feature no consume ningún endpoint real: no aplica revisar contrato de backend.
- [ ] Comprobar las versiones instaladas; sin dependencias nuevas, no requiere consultar Context7.
- [ ] Registrar el estado inicial de lint/typecheck/tests antes de tocar código (`npx tsc --noEmit`, `npx expo lint`, `npx jest`), para distinguir problemas preexistentes de los introducidos por esta feature.

## Tarea 1: tipos + constantes + componente de país (`Country`, `COUNTRIES`, `CountryCodePicker`)

**Archivos:** `src/types/country.ts` (nuevo), `src/constants/countries.ts` (nuevo), `src/components/country-code-picker.tsx` (nuevo), `src/__tests__/components/country-code-picker.test.tsx` (nuevo).

**Interfaces:**
```ts
// src/types/country.ts
export interface Country {
  isoCode: 'ES' | 'FR' | 'PT';
  dialCode: string;
  flagEmoji: string;
  name: string;
}

// src/constants/countries.ts
export const COUNTRIES: Country[]; // España, Francia, Portugal, en ese orden
export const DEFAULT_COUNTRY: Country; // COUNTRIES[0] (España, +34)

// src/components/country-code-picker.tsx
export interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}
export function CountryCodePicker(props: CountryCodePickerProps): JSX.Element;
```
`CountryCodePicker` usa el mismo patrón que `CategoryPicker`: disparador compacto (emoji + `dialCode`) que abre `Modal transparent animationType="slide"` con backdrop `Pressable` (cierra al tocar fuera) y panel `ThemedView` listando `COUNTRIES` con `.map()` (lista estática de 3, sin `FlatList`); cada opción es `Pressable` con `accessibilityRole="button"` que llama a `onSelectCountry(country)` y cierra la hoja.

**Criterios cubiertos:** 1 (base de la fila de teléfono), 3 (país por defecto España/+34).

- [x] Definir los casos unitarios relevantes: muestra el país seleccionado (emoji + `dialCode`); al pulsar un país de la hoja llama a `onSelectCountry` con el país correcto exactamente una vez y cierra la hoja; tocar el backdrop cierra la hoja sin llamar a `onSelectCountry`. No añadir pruebas que solo repliquen el layout.
- [x] Ejecutar `npx jest src/__tests__/components/country-code-picker.test.tsx` antes del cambio y registrar el resultado (debe fallar: ni el componente ni el test existen).
- [x] Implementar el cambio mínimo: crear los 3 archivos con las interfaces exactas de arriba (más `src/__tests__/constants/countries.test.ts`, añadido por el tester para cubrir `COUNTRIES`/`DEFAULT_COUNTRY`).
- [x] Ejecutar `npx jest src/__tests__/components/country-code-picker.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest` sobre los archivos de esta tarea → PASA (incluidos en el total de 67/67 tests verdes de las Tareas 1-4). `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores (solo los 2 warnings preexistentes y ajenos ya conocidos en `login-session-restore.test.tsx`, no tocados). Un ❌ transitorio reportado antes por el compiler fue descartado: ocurrió porque el tester de esta misma tarea todavía estaba escribiendo sus archivos de test cuando `tsc` corrió en paralelo; con todo ya escrito, limpio.

## Tarea 2: util de fuerza de contraseña + componente del medidor (`password-strength.ts`, `PasswordStrengthMeter`)

**Archivos:** `src/utils/password-strength.ts` (nuevo), `src/__tests__/utils/password-strength.test.ts` (nuevo), `src/components/password-strength-meter.tsx` (nuevo), `src/__tests__/components/password-strength-meter.test.tsx` (nuevo).

**Interfaces:**
```ts
// src/utils/password-strength.ts
export type PasswordStrengthLevel = 'invalid' | 'acceptable' | 'strong';
export function getPasswordStrengthLevel(password: string): PasswordStrengthLevel;
export function isEmailFormatValid(email: string): boolean;

// src/components/password-strength-meter.tsx
export interface PasswordStrengthMeterProps { password: string }
export function PasswordStrengthMeter(props: PasswordStrengthMeterProps): JSX.Element | null;
```
`getPasswordStrengthLevel`: `invalid` si `length < 8` o sin `/[A-Z]/` o sin `/[0-9]/`; si no, `acceptable`; si además hay `/[^A-Za-z0-9]/`, `strong`. `isEmailFormatValid`: regex simple de formato. `PasswordStrengthMeter` devuelve `null` si `password === ''`; en otro caso pinta color/etiqueta según el nivel: `invalid` → `#d92d20` ("Débil"), `acceptable` → `#d97706` ("Aceptable"), `strong` → `#16a34a` ("Robusta").

**Criterios cubiertos:** 6, 7.

- [x] Definir los casos unitarios relevantes: `getPasswordStrengthLevel` — `invalid` para longitud <8, para ≥8 sin mayúscula, para ≥8 sin número; frontera exacta 7 vs. 8 caracteres (con mayúscula y número) como `invalid`/`acceptable`; `acceptable` sin carácter especial; `strong` con carácter especial. `isEmailFormatValid` — casos válidos e inválidos representativos. `PasswordStrengthMeter` — no renderiza nada con `password: ''`; color/etiqueta correctos para un ejemplo de cada nivel. No añadir pruebas que repliquen el regex carácter a carácter ni pruebas para texto visual suelto.
- [x] Ejecutar `npx jest src/__tests__/utils/password-strength.test.ts src/__tests__/components/password-strength-meter.test.tsx` antes del cambio y registrar el resultado (debe fallar: ni los archivos ni los tests existen).
- [x] Implementar el cambio mínimo: crear los 2 archivos de implementación con las interfaces exactas de arriba.
- [x] Ejecutar `npx jest src/__tests__/utils/password-strength.test.ts src/__tests__/components/password-strength-meter.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest` sobre los archivos de esta tarea → PASA (incluidos en el total de 67/67 tests verdes de las Tareas 1-4). `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores (solo los 2 warnings preexistentes y ajenos ya conocidos en `login-session-restore.test.tsx`, no tocados).

## Tarea 3: tipos `Civic`/`CreateCivicInput` + servicio `civic.service.ts`

**Archivos:** `src/types/civic.ts` (modificar, reemplazo completo), `src/services/civic.service.ts` (nuevo), `src/__tests__/services/civic.service.test.ts` (nuevo).

**Interfaces:**
```ts
// src/types/civic.ts (reemplaza por completo el contenido actual, roto)
export interface Civic { userId: string; phone: string }
export interface CreateCivicInput { userId: string; phone: string }

// src/services/civic.service.ts
export const CIVICS_ENDPOINT: string; // `${API_BASE_URL}/civics`
export async function createCivic(input: CreateCivicInput): Promise<Civic>;
```
`createCivic` sigue el patrón exacto de `createImage` en `image.service.ts`: `POST` con `fetchWithTimeout`, mensajes de error amigables propios para timeout/fallo de red, lanza `Error` genérico en `!response.ok`, devuelve la respuesta tipada como `Civic`.

**Criterios cubiertos:** 3, 4.

- [x] Definir los casos unitarios relevantes: `createCivic` envía el `POST` correcto (`CIVICS_ENDPOINT`, cuerpo `{ userId, phone }`); devuelve el `Civic` creado; timeout (`RequestTimeoutError`) y fallo de red (`TypeError`) traducen a mensajes amigables propios distintos entre sí; `!response.ok` lanza un error genérico. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/services/civic.service.test.ts` antes del cambio y registrar el resultado (debe fallar: ni el servicio ni el test existen; el tipo `Civic` actual tampoco compila con el uso previsto).
- [x] Implementar el cambio mínimo: reemplazar `src/types/civic.ts` por completo y crear `civic.service.ts` con las interfaces exactas de arriba.
- [x] Ejecutar `npx jest src/__tests__/services/civic.service.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest` sobre los archivos de esta tarea → PASA (incluidos en el total de 67/67 tests verdes de las Tareas 1-4). `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores. Un ❌ transitorio reportado antes por el compiler fue descartado: ocurrió porque testers de otras tareas (1 y 2) todavía estaban escribiendo sus archivos en paralelo cuando `tsc` corrió globalmente; con todo ya escrito, limpio.

**Observación no bloqueante (tester, 2026-10-24):** `Civic` no declara `id` aunque `json-server` lo genera al crear el registro en el mock (se ignora al tipar la respuesta, tal como ya prevé la restricción particular de este plan). No bloquea las Tareas 5/6 actuales; queda anotado por si se quiere tipar `id` más adelante.

## Tarea 4: `RegisterUserInput` + `register()`/`UsernameOrEmailTakenError` en `auth.service.ts`

**Archivos:** `src/types/user.ts` (modificar), `src/services/auth.service.ts` (modificar), `src/__tests__/services/auth.service.test.ts` (modificar).

**Interfaces:**
```ts
// src/types/user.ts (añade, sin tocar lo existente)
export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

// src/services/auth.service.ts (añade, sin tocar login/fetchUsersByField/InvalidCredentialsError)
export class UsernameOrEmailTakenError extends Error {}
export async function register(input: RegisterUserInput): Promise<User>;
```
`register()`: recorta `username`/`email`; comprueba duplicado con `fetchUsersByField('username', trimmedUsername)` ya existente (si hay coincidencia, lanza `UsernameOrEmailTakenError` con mensaje específico de username, sin llegar a comprobar email); si no hay duplicado de username, comprueba `fetchUsersByField('email', trimmedEmail)` (si hay coincidencia, lanza con mensaje específico de email); si ninguno está duplicado, `POST ${USERS_ENDPOINT}` con `{ username: trimmedUsername, email: trimmedEmail, password: input.password, role: 'civic' }` (sin `id`), mismo manejo de `RequestTimeoutError`/fallo de red/`!response.ok` ya usado en el archivo; devuelve el `User` creado.

**Criterios cubiertos:** 2, 5, 6, 8.

- [x] Definir los casos unitarios relevantes: duplicado de username (lanza `UsernameOrEmailTakenError`, no llega a comprobar email); duplicado de email (tras pasar username); creación exitosa (`POST` con el cuerpo exacto, sin `id`, devuelve el `User` con `id`); recorte de espacios antes de comprobar y de enviar; fallo de red/timeout en cualquiera de las peticiones no es `UsernameOrEmailTakenError`. No añadir pruebas que repliquen `fetchUsersByField` ya probado por `login`.
- [x] Ejecutar `npx jest src/__tests__/services/auth.service.test.ts` antes del cambio y registrar el resultado (deben fallar solo los casos nuevos de `register`; los de `login` ya existentes deben seguir pasando, confirmando que no hay regresión previa).
- [x] Implementar el cambio mínimo descrito arriba, sin modificar `login`, `fetchUsersByField` ni `InvalidCredentialsError`.
- [x] Ejecutar `npx jest src/__tests__/services/auth.service.test.ts` y registrar evidencia (debe pasar la suite completa, incluidos los casos previos de `login` sin regresiones).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest src/__tests__/services/auth.service.test.ts` → PASA, incluidos los casos previos de `login` sin regresiones (total incluido en los 67/67 tests verdes de las Tareas 1-4). `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores. Un ❌ transitorio reportado antes por el compiler fue descartado por la misma causa que la Tarea 3 (testers de las Tareas 1/2 todavía escribiendo en paralelo); con todo ya escrito, limpio.

## Tarea 5: hook `use-register.ts`

**Archivos:** `src/hooks/use-register.ts` (nuevo), `src/__tests__/hooks/use-register.test.ts` (nuevo).

**Interfaces:**
```ts
export interface RegisterSuccess { user: User; token: AuthToken | null }
export interface UseRegisterResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  submitRegister: (input: RegisterUserInput) => Promise<RegisterSuccess | null>;
}
export function useRegister(): UseRegisterResult;
```
Calcado de `useLogin` pero **sin** ningún estado ni lógica de lockout (sin `lockout.service.ts`, sin `isLocked`/`lockMessage`). Mismo guard `isSubmittingRef` para evitar envíos duplicados. `submitRegister`: llama a `register(input)` dentro de `try/catch` (cualquier error, incluido `UsernameOrEmailTakenError`, rellena `errorMessage` con `error.message` y devuelve `null`); en éxito, si `input.phone?.trim()` no está vacío, llama a `createCivic({ userId: user.id, phone: input.phone })` dentro de su propio `try/catch` cuyo fallo se ignora por completo (no rellena `errorMessage`, no bloquea el resultado); por último llama a `requestToken(user.id)` fuera de cualquier `catch` que pueda bloquear el resultado (igual que `useLogin`), devuelve `{ user, token }`.

**Criterios cubiertos:** 2, 3, 4, 5, 8.

- [x] Definir los casos unitarios relevantes: éxito sin `phone` (no llama a `createCivic`); éxito con `phone` (llama a `createCivic` con `userId`/`phone` correctos); fallo de `createCivic` no impide devolver `{ user, token }` ni rellena `errorMessage`; `UsernameOrEmailTakenError`/error de red de `register()` rellenan `errorMessage` y devuelven `null`; guard de envío duplicado (`isSubmitting`) evita una segunda llamada concurrente. No añadir pruebas que repliquen `requestToken`, ya probado en `use-login`.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-register.test.ts` antes del cambio y registrar el resultado (debe fallar: ni el hook ni el test existen).
- [x] Implementar el cambio mínimo: crear el hook con la interfaz exacta de arriba, consumiendo `register`/`UsernameOrEmailTakenError` (Tarea 4) y `createCivic` (Tarea 3).
- [x] Ejecutar `npx jest src/__tests__/hooks/use-register.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest src/__tests__/hooks/use-register.test.ts` → PASA (13/13 tests verdes). `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores. Confirmado también en la verificación global final (`npx jest` completo → 548/548 tests verdes, 41/41 suites).

## Tarea 6: pantalla `register.tsx` + wiring de navegación (`login.tsx`, `_layout.tsx`)

**Archivos:** `src/app/register.tsx` (nuevo), `src/__tests__/app/register-screen.test.tsx` (nuevo), `src/app/login.tsx` (modificar), `src/app/_layout.tsx` (modificar).

**Interfaces:** `RegisterScreen()` usa `useRegister()` (Tarea 5) + estado local de formulario (`username`, `email`, `phoneNumber`, `selectedCountry` inicial `DEFAULT_COUNTRY`, `password`, `confirmPassword`). Validación manual: `username.trim() !== ''`, `email.trim() !== ''`, `isEmailFormatValid(email.trim())`, `getPasswordStrengthLevel(password) !== 'invalid'`, `confirmPassword === password`; botón deshabilitado si falla cualquiera o `isSubmitting`. Layout calcado de `login.tsx` (mismos `styles`/`ERROR_COLOR`), con `CountryCodePicker` + `TextInput` numérico junto a `PasswordInput` + `PasswordStrengthMeter` + segundo `PasswordInput` de confirmación. Al enviar: si `phoneNumber.trim() !== ''`, `phone = \`${selectedCountry.dialCode}${phoneNumber.trim()}\``; `submitRegister({ username: username.trim(), email: email.trim(), password, phone })` (sin `phone` si no se escribió número); si el resultado no es `null`, `await signIn(result.user, result.token); router.replace('/')`. Enlace inferior "¿Ya tienes cuenta? Inicia sesión" → `router.back()`. `login.tsx` añade el enlace "¿No tienes cuenta? Créate una" (`onPress={() => router.push('/register')}`) junto al enlace existente de "¿Has olvidado tu contraseña?". `_layout.tsx` añade `<Stack.Screen name="register" options={{ headerShown: false }} />`.

**Criterios cubiertos:** 1, 2, 3, 6, 9.

- [x] Definir los casos unitarios relevantes (test de integración, mismo nivel que `login-session-restore.test.tsx`): botón deshabilitado por cada condición de validación (campos vacíos, email inválido, password `invalid`, confirmación distinta); envío exitoso llama a `signIn` y navega con `router.replace('/')`; sin número escrito, `submitRegister` se llama sin la clave `phone`; con número escrito, se llama con el `phone` completo (prefijo + número); enlace "¿Ya tienes cuenta?" llama a `router.back()`; mensaje de error visible cuando `useRegister` devuelve `errorMessage`. No añadir pruebas que solo repliquen el layout.
- [x] Ejecutar `npx jest src/__tests__/app/register-screen.test.tsx` antes del cambio y registrar el resultado (debe fallar: ni la pantalla ni el test existen, y `register` aún no está registrada en `_layout.tsx`).
- [x] Implementar el cambio mínimo: crear la pantalla con la estructura descrita arriba, modificar `login.tsx`/`_layout.tsx` como se describe.
- [x] Ejecutar `npx jest src/__tests__/app/register-screen.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar la especificación y este plan.

**Evidencia (coordinador, 2026-10-24):** `npx jest src/__tests__/app/register-screen.test.tsx` → PASA (28/28 tests verdes); `src/__tests__/app/login-session-restore.test.tsx` ampliado (+1 test, total 5) para cubrir el nuevo enlace "¿No tienes cuenta? Créate una" → PASA. `npx tsc --noEmit` → 0 errores. `npx expo lint` → 0 errores. Incidencia menor ya resuelta: un primer compiler marcó ❌ por 3 warnings de lint nuevos en `register-screen.test.tsx` (import `ActivityIndicator` sin usar + 2 `require()` dentro del mock de `expo-router`); corregido por un tester (import eliminado, `require()` silenciados con `eslint-disable-next-line`, mismo patrón ya preexistente en `login-session-restore.test.tsx`). Confirmado en la verificación global final (`npx jest` completo → 548/548 tests verdes, 41/41 suites; `npx tsc --noEmit` → 0 errores; `npx expo lint` → 0 errores, solo los 2 warnings preexistentes y ajenos ya conocidos en `login-session-restore.test.tsx`, no relacionados con esta feature).

## Comprobaciones finales

Ejecutar desde `frontend-mobile/`.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | `npx jest` (suite completa) | PASA — 548/548 tests verdes, 41/41 suites, sin regresiones en el resto de la app. |
| Typecheck | `npx tsc --noEmit` | PASA — 0 errores. |
| Lint | `npx expo lint` | PASA — 0 errores; 0 warnings propios de esta feature (solo quedan los 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no relacionados con esta feature, no tocados en su contenido original). |
| Diff, desde la raíz | `git diff --check` | PASA — sin problemas de espacios en blanco/conflictos en el diff. |

- [x] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [x] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance (en particular: `backend/`, `database/`, `TEMPORARY_CIVIC_ID`, `lockout.service.ts`, el camino de `login`/`fetchUsersByField`, fixtures de `db.json`).

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: **Implementado y verificado**.
- Fecha de revisión: 2026-10-24.
- Resultado entregado: pantalla `/register` enlazada desde `login.tsx` ("¿No tienes cuenta? Créate una"), con username, email, fila de teléfono opcional (`CountryCodePicker` con España/+34 por defecto, Francia/+33 y Portugal/+351) y contraseña + confirmación con medidor de fuerza dinámico (`PasswordStrengthMeter`, rojo/naranja/verde). Al completar un registro válido se crea el usuario en el mock (`role: 'civic'` fijo), se crea opcionalmente el registro de `civics` con el teléfono completo (prefijo + número) de forma no bloqueante, se inicia sesión automáticamente (`signIn`) y se navega a `/`. Duplicados de username/email muestran un mensaje de error específico; errores de red/timeout muestran un mensaje genérico amigable; ninguno de los dos casos crea registros parciales. Todo mock-only, sin ningún endpoint de backend real nuevo.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Navegación login↔register | Tarea 6 (`register-screen.test.tsx`: enlace "¿Ya tienes cuenta?" llama a `router.back()`; `login-session-restore.test.tsx` ampliado: enlace "¿No tienes cuenta?" navega a `/register`) | Cumplido |
| 2. Registro válido crea usuario e inicia sesión | Tarea 4 (`register()` crea el `User` en el mock) + Tarea 5 (`useRegister` orquesta `register`→`requestToken`) + Tarea 6 (`register-screen.test.tsx`: envío exitoso llama a `signIn` y navega con `router.replace('/')`) | Cumplido |
| 3. Teléfono opcional crea `civics` con prefijo correcto | Tarea 1 (`DEFAULT_COUNTRY`/`COUNTRIES`) + Tarea 3 (`createCivic`) + Tarea 5 (`use-register.test.ts`: llama a `createCivic` con `userId`/`phone` correctos solo si hay teléfono) + Tarea 6 (`register-screen.test.tsx`: `phone` completo prefijo+número solo si se escribió número) | Cumplido |
| 4. Fallo de `createCivic` no bloquea el registro | Tarea 5 (`use-register.test.ts`: fallo de `createCivic` no impide devolver `{ user, token }` ni rellena `errorMessage`) | Cumplido |
| 5. Duplicado de username/email con mensaje específico | Tarea 4 (`auth.service.test.ts`: `UsernameOrEmailTakenError` con mensaje específico por campo, orden username→email) | Cumplido |
| 6. Validación manual deshabilita el botón | Tarea 2 (`password-strength.test.ts`) + Tarea 6 (`register-screen.test.tsx`: botón deshabilitado por cada condición de validación) | Cumplido |
| 7. Medidor de fuerza (vacío/rojo/naranja/verde, límite de 8) | Tarea 2 (`password-strength.test.ts`: frontera exacta 7/8 caracteres; `password-strength-meter.test.tsx`: vacío no renderiza nada, color/etiqueta por nivel) | Cumplido |
| 8. Error de red/timeout sin registro parcial | Tarea 4 (`auth.service.test.ts`: fallo de red/timeout no es `UsernameOrEmailTakenError`) + Tarea 5 (`use-register.test.ts`: rellena `errorMessage` y devuelve `null`) | Cumplido |
| 9. `register.tsx` accesible sin guard de sesión nuevo | Tarea 6 (`register.tsx` sin `<Redirect>` ni comprobación de `useSession`, igual que `login.tsx`) | Cumplido |

- Comprobaciones: `npx jest` (suite completa) → PASA, 548/548 tests verdes en 41/41 suites. `npx tsc --noEmit` → PASA, 0 errores. `npx expo lint` → PASA, 0 errores y 0 warnings propios de esta feature (quedan 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no relacionados con esta feature). `git diff --check` → PASA, sin problemas.
- Decisiones y desviaciones: ninguna desviación relevante no documentada ya en las tareas. Dos añadidos menores respecto al mapa de archivos original, ambos decisiones razonables del tester dentro del alcance ya previsto: (a) `src/__tests__/constants/countries.test.ts` (Tarea 1), cobertura adicional de `COUNTRIES`/`DEFAULT_COUNTRY`; (b) ampliación de `src/__tests__/app/login-session-restore.test.tsx` con 1 test nuevo (Tarea 6) para el enlace "¿No tienes cuenta?" añadido a `login.tsx`. Una corrección de lint aplicada durante la Tarea 6 (import `ActivityIndicator` sin usar eliminado, `require()` del mock de `expo-router` silenciados con `eslint-disable-next-line`, mismo patrón ya preexistente en ese archivo).
- Limitaciones y pendientes: una observación no bloqueante, no especificada en `spec.md` y no corregida en este ciclo: `Civic` (Tarea 3) no declara `id` en su tipo, aunque `json-server` lo genera al crear el registro en el mock (se ignora al tipar la respuesta, tal como ya prevé la restricción particular de este plan); queda anotado por si se quiere tipar `id` en una futura revisión.

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente. No copiar resultados históricos ni prometer persistencia real por usar el mock (db.json) o tipos de src/types/.
