# 2026-10-24 — Especificación: Registro de ciudadano

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: feature/registro-ciudadano-frontend-mobile.
- Última actualización: 2026-10-24.
- Estado: implementado y verificado (2026-10-24, ver [Confirmación de implementación](./plan.md#confirmación-de-implementación)).
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: plan técnico ya diseñado y aprobado explícitamente por la usuaria (archivos a crear/modificar, firmas e interfaces exactas); `src/app/login.tsx`, `src/services/auth.service.ts`, `src/hooks/use-login.ts`, `src/components/category-picker.tsx`, `src/services/image.service.ts` (patrones de referencia, solo lectura).

## Objetivo y decisiones vigentes

Hoy `src/app/login.tsx` solo permite iniciar sesión contra el mock (`db.json`, colección `users`, vía `src/services/auth.service.ts`); no existe ningún camino para crear una cuenta nueva desde la app. El backend NestJS todavía no expone ningún endpoint de registro, así que esta feature es **mock-only** sobre `db.json` (colecciones `users` + `civics`), igual que `login()` hoy. Esta feature añade una pantalla de registro (`/register`) enlazada desde el login, con nombre de usuario, email (obligatorio), teléfono opcional con selector de prefijo de país, contraseña + confirmación con medidor de fuerza dinámico. Al completar el registro válido, se crea el usuario (y, si procede, el ciudadano) en el mock y se entra directamente a la interfaz de inicio con sesión iniciada (reutilizando `useSession`/`token.service.ts`, igual que hace `login`).

- Alcance confirmado:
  - Enlace "¿No tienes cuenta? Créate una" en `src/app/login.tsx`, calcado del enlace existente "¿Has olvidado tu contraseña?", que navega a `/register`.
  - Nueva pantalla `src/app/register.tsx` (fuera de `(tabs)/`, empujada desde el `Stack` raíz) con el mismo layout visual que `login.tsx`: username, email, fila de teléfono opcional (selector de prefijo de país + número), contraseña + medidor de fuerza, confirmación de contraseña, enlace inferior "¿Ya tienes cuenta? Inicia sesión" (`router.back()`).
  - Selector de prefijo de país (`CountryCodePicker`) en forma de hoja inferior (bottom-sheet), mismo patrón visual que `CategoryPicker`, con España (`ES`, `+34`) por defecto y Francia (`FR`, `+33`) y Portugal (`PT`, `+351`) también disponibles.
  - Medidor de fuerza de contraseña dinámico y puramente visual (sin bloquear la escritura): rojo/`invalid` si no cumple mínimo 8 caracteres + 1 mayúscula + 1 número; naranja/`acceptable` si cumple eso (estado mínimo aceptable, permite crear la cuenta); verde/`strong` si además tiene un carácter especial (robusta).
  - `register()` nuevo en `auth.service.ts`: comprueba duplicados de `username`/`email` contra el mock reutilizando `fetchUsersByField` ya existente y, si no hay duplicados, crea el usuario (`POST ${USERS_ENDPOINT}`, sin `id`, `role: 'civic'` fijo — esta app es solo para ciudadanía, ver CLAUDE.md).
  - `createCivic()` nuevo en `civic.service.ts`: si el teléfono no está vacío, crea el registro de `civics` (`POST ${API_BASE_URL}/civics`, `{ userId, phone }`) asociado al usuario recién creado; un fallo en este paso es **no bloqueante** (el registro del usuario ya tuvo éxito, el teléfono es opcional).
  - `useRegister()` nuevo (calcado de `useLogin`, **sin** lockout: el registro no tiene intentos fallidos que bloquear) que orquesta `register()` → `createCivic()` (si hay teléfono) → `requestToken(user.id)`, igual que `useLogin` hace con `login()` → `requestToken`.
  - Tras un registro válido: `signIn(user, token)` + `router.replace('/')`, exactamente igual que hace `login.tsx` en su `handleSubmit`.
- Decisiones confirmadas:
  - El teléfono completo que se envía a `createCivic` es `${selectedCountry.dialCode}${numeroEscrito}` (p. ej. `+34600123456`), construido solo si el usuario escribió algún número; si no escribió nada, no se llama a `createCivic` en absoluto (el teléfono es opcional de principio a fin, no se envía un `civics` vacío).
  - `role: 'civic'` es un valor fijo en `register()`, no seleccionable desde la UI: esta app móvil es estrictamente para la ciudadanía (ver "Alcance y restricciones" de CLAUDE.md), por lo que no existe ningún flujo de registro de personal del ayuntamiento.
  - El medidor de fuerza es una guía visual, no un bloqueo progresivo: el único umbral que impide crear la cuenta es `invalid` (no cumple longitud/mayúscula/número); `acceptable` y `strong` permiten enviar el formulario por igual, la diferencia es solo visual/informativa.
  - `UsernameOrEmailTakenError` es una única clase de error para ambos duplicados (username o email), reutilizando el patrón ya existente de `InvalidCredentialsError`; el mensaje de texto que lleva la instancia sí distingue cuál de los dos campos está duplicado, para dar al usuario un error accionable.
  - El orden de comprobación de duplicados es el mismo que ya usa `login()` para buscar: primero `username`, después `email` (mismo campo, mismo orden, reutilizando `fetchUsersByField` sin modificarla).
  - La lista de países (`COUNTRIES`) es un array estático de 3 países (España por defecto, Francia, Portugal) con emoji de bandera, nombre y prefijo; no se consulta ningún servicio ni API de países.
- Suposiciones por validar: ninguna; el plan técnico (archivos, firmas, interfaces, reglas de validación y colores del medidor) ya fue diseñado y aprobado explícitamente por la usuaria antes de redactar esta especificación.
- Fuera de alcance:
  - Cualquier endpoint de registro en el backend real: esta feature es mock-only sobre `db.json`, igual que el login hoy. No se modifica `backend/` bajo ninguna circunstancia.
  - Recuperación de contraseña, verificación de email/teléfono, 2FA o cualquier flujo de seguridad adicional al ya existente en login.
  - Edición del perfil tras el registro (cambiar username/email/teléfono/contraseña una vez creada la cuenta).
  - Backfill o cambio de los datos ya existentes en `db.json` (`users`, `civics`): se conservan exactamente igual; la feature solo añade registros nuevos cuando alguien se registra desde la app.
  - Añadir países distintos a España/Francia/Portugal al selector, o permitir introducirlos a mano.
  - Bloqueo por intentos fallidos (lockout) en el registro: a diferencia de `login`, `useRegister` no lo implementa (no hay credenciales que "adivinar" al registrarse).

## Contexto verificado

- Implementación actual:
  - `src/app/login.tsx`: pantalla de referencia para el layout visual (hero con título/subtítulo, `View` con `gap-3`, `TextInput` de usuario, `PasswordInput`, enlace `Pressable` + `ThemedText type="link"` "¿Has olvidado tu contraseña?" en las líneas ~109-115, bloque de error con `ThemedText type="small" style={{ color: ERROR_COLOR }}` donde `ERROR_COLOR = '#d92d20'`, botón de envío con `ActivityIndicator` mientras `isSubmitting`). No existe hoy ningún enlace a una pantalla de registro.
  - `src/services/auth.service.ts`: expone `USERS_ENDPOINT`, `InvalidCredentialsError` y `login()`; internamente usa `fetchUsersByField(field, value)` (ya filtra en cliente por igualdad exacta tras una consulta `GET ${USERS_ENDPOINT}?${field}=${value}`), reutilizable tal cual para comprobar duplicados. No existe hoy `register()` ni ninguna clase de error de duplicado.
  - `src/hooks/use-login.ts`: patrón de referencia para `useRegister` — expone `{ isSubmitting, errorMessage, submitLogin }` (más el lockout, que no aplica aquí), usa `isSubmittingRef`/`setIsSubmitting` para evitar envíos duplicados, llama a `requestToken(user.id)` fuera del `try/catch` de credenciales (un fallo de token nunca bloquea el login) y devuelve `{ user, token } | null`.
  - `src/services/image.service.ts`: patrón de referencia para `civic.service.ts` — `createImage(input)` hace `POST` con `fetchWithTimeout`, traduce `RequestTimeoutError`/fallo de red a mensajes amigables, lanza en `!response.ok`, devuelve el recurso creado tipado.
  - `src/components/category-picker.tsx`: patrón de referencia para `CountryCodePicker` — `Modal transparent animationType="slide"` con backdrop `Pressable` que cierra la hoja al tocar fuera, panel `ThemedView` con las opciones listadas mediante `.map()` (lista estática y acotada: 3 países, no requiere `FlatList`), cada opción es un `Pressable` con `accessibilityRole="button"`.
  - `src/types/civic.ts`: hoy define `interface User { user_id: string; phone: string }`, que está roto (nombre duplicado con el `User` real de `src/types/user.ts`, campo `user_id` en snake_case inconsistente con el resto del código en camelCase, y no se usa en ningún sitio del código). Se reemplaza completamente.
  - `src/types/user.ts`: hoy define `UserRole`, `User`, `SessionUser`, `LoginUserInput`. No existe `RegisterUserInput`.
  - `src/app/_layout.tsx`: `Stack` raíz con `login`, `(tabs)`, `incidents/new`, `incidents/[id]` registradas. No existe `register`.
  - `db.json`: la colección `civics` ya existe y ya tiene la forma `{ userId, phone, id }` (p. ej. `{"userId": "20ac442e-0f00-4fe4-bad3-61c8e8e0bff5", "phone": "600388787", "id": "J3_knLzOgNI"}`), coherente con el `Civic`/`CreateCivicInput` que define esta feature; no requiere ningún backfill. La colección `users` tiene la forma `{ username, email, password, role, id }` (sin `id` al crear, lo genera `json-server`).
  - `src/constants/config.ts`: expone `API_BASE_URL` (mock, json-server) y `BACKEND_API_URL` (backend real, usado hoy solo por `requestToken`).
  - `src/hooks/use-session.ts`: `useSession()` expone `{ user, token, isRestoringSession, signIn, signOut }`; `signIn(user: User, token: AuthToken | null)` ya acepta un `User` recién creado (quita `password` y persiste), reutilizable sin cambios.
  - `src/components/password-input.tsx`: componente ya existente y reutilizable tal cual, tanto para la contraseña como para su confirmación.
- Contratos y referencias del dominio: no aplica ningún contrato de backend real (ver "Fuera de alcance"); el único contrato relevante es el mock ya documentado en `db.json` (colecciones `users` y `civics`, ambas ya existentes).
- Configuración y dependencias disponibles: Expo `^58.0.17`, TypeScript estricto, NativeWind, Expo Router `~58.0.25`, Jest + `jest-expo` + `@testing-library/react-native` (ya instaladas). No se añade ninguna dependencia nueva (sin librerías de validación tipo Zod, sin librerías de selector de país de terceros: el selector es un componente propio calcado de `CategoryPicker`).
- Diferencia entre estado actual y propuesto: hoy la ciudadanía solo puede iniciar sesión con una cuenta ya existente en `db.json`; tras esta feature, puede crearse una cuenta nueva desde la propia app (mock-only) y entra directamente con sesión iniciada, sin pasar por el login.

## Contrato de datos (backend real + mock)

Esta feature no consume ni simula ningún endpoint del backend real: el backend NestJS no expone todavía ningún endpoint de registro, por lo que el alta de usuario y de ciudadano es **mock-only** sobre `db.json`, igual que ya es el caso de `login()` hoy (sin fallback a backend real porque no hay ningún camino real que intentar primero).

### Backend real (consumo)

No aplica: no existe ningún endpoint de registro documentado por backend. El único contacto con el backend real en todo este flujo es el ya existente `POST ${BACKEND_API_URL}/auth/token` de `requestToken` (reutilizado sin cambios, real-first con fallback a un token simulado, igual que en `login`).

### Mock (json-server / db.json)

Las entidades `users` y `civics` ya existen en `db.json` con la forma requerida; esta feature no amplía su esquema, solo añade la operación de creación (`POST`) que hoy falta para ambas desde la app.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `username` (users) | `string` | Sí | Recortado (`trim()`) antes de comprobar duplicado y de enviar; duplicado exacto (case-sensitive, mismo criterio que `fetchUsersByField`) rechazado con `UsernameOrEmailTakenError` | Vacío tras `trim()` nunca llega a `register()`: el botón de la UI está deshabilitado |
| `email` (users) | `string` | Sí | Recortado; formato validado en cliente con `isEmailFormatValid` antes de enviar; duplicado exacto rechazado con `UsernameOrEmailTakenError` | Vacío o con formato inválido nunca llega a `register()`: el botón está deshabilitado |
| `password` (users) | `string` | Sí | Debe cumplir como mínimo el nivel `acceptable` de `getPasswordStrengthLevel` (≥8 caracteres + 1 mayúscula + 1 número); se envía en texto plano, igual que ya hace `login`/`password-input.tsx` (deuda ya documentada en `src/types/user.ts`, no se corrige aquí) | Password `invalid` nunca llega a `register()`: el botón está deshabilitado |
| `role` (users) | `string` | Sí | Fijo `'civic'`, no editable desde la UI | No aplica (siempre se envía) |
| `userId` (civics) | `string` | Sí (solo si se crea el registro) | Igual al `id` devuelto por el `users` recién creado | No aplica: `createCivic` solo se llama cuando ya existe un `user.id` |
| `phone` (civics) | `string` | No (el registro de `civics` es opcional en su conjunto) | `${selectedCountry.dialCode}${numeroEscrito.trim()}` solo si `numeroEscrito.trim() !== ''` | Si no se escribió ningún número, no se llama a `createCivic` en absoluto (no se crea un registro `civics` vacío ni con `phone: ''`) |

- Recurso simulado: `users` y `civics` ya existen en `db.json` (ver "Contexto verificado" para su forma exacta); esta feature no modifica ningún registro existente, solo añade los que resulten de un registro nuevo desde la app, con `id` generado por `json-server` en ambos casos.
- Errores simulados: `register()` reutiliza el mismo manejo de errores de red/timeout ya existente en `auth.service.ts` (`RequestTimeoutError`/`TypeError` → mensaje de conexión amigable; `!response.ok` del `POST` de creación → error genérico); `createCivic()` reutiliza el mismo patrón que `createImage` (`RequestTimeoutError`/fallo de red → mensaje amigable propio; `!response.ok` → error genérico), pero su fallo nunca interrumpe el flujo de registro (se captura en `useRegister` y se ignora, dejando `phone` sin persistir si falla).

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/` (Expo Router):
  - `src/app/register.tsx` (nueva, ruta `/register`, pantalla empujada desde el `Stack` raíz, registrada en `src/app/_layout.tsx`).
  - `src/app/login.tsx` (modificada: nuevo enlace hacia `/register`).
- Ubicación: `register` vive fuera de `(tabs)/`, igual que `login` (ninguna de las dos es una sección de contenido de la app autenticada, son pantallas del flujo de acceso) y se abre con `router.push('/register')`/`router.back()`, nunca como tab.
- Componentes nuevos vs. reutilizados:
  - Nuevos: `CountryCodePicker`, `PasswordStrengthMeter`.
  - Reutilizados sin modificar: `ThemedView`, `ThemedText`, `useTheme`, `useSession`, `PasswordInput`, `SafeAreaView` de `react-native-safe-area-context`, `router`/`Redirect` de `expo-router`, `Spacing`/`MaxContentWidth` de `@/constants/theme`.
- Estados explícitos de carga/error (evitan envíos duplicados, mismo patrón que `login.tsx`):
  - Botón de envío deshabilitado mientras `isSubmitting` (muestra `ActivityIndicator` en su lugar) o mientras la validación manual del formulario falla (username/email vacíos, email con formato inválido, password `invalid`, confirmación distinta de la contraseña).
  - Mensaje de error único (`errorMessage` de `useRegister`) mostrado con el mismo estilo que `login.tsx` (`ThemedText type="small" style={{ color: ERROR_COLOR }}`), para duplicados de username/email y para errores de red/timeout.
  - El medidor de fuerza de contraseña (`PasswordStrengthMeter`) no renderiza nada si el campo de contraseña está vacío (evita alarmar con "rojo" antes de que el usuario empiece a escribir).

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `Country` (nuevo, `src/types/country.ts`) | `isoCode: 'ES' \| 'FR' \| 'PT'`; `dialCode: string`; `flagEmoji: string`; `name: string` | Sin relaciones; valores fijos definidos en `COUNTRIES` |
| `Civic` (reemplaza por completo el `src/types/civic.ts` actual) | `userId: string`; `phone: string` | `userId` referencia el `id` de un `User` ya creado; `phone` siempre con prefijo internacional incluido |
| `CreateCivicInput` (nuevo, mismo archivo) | `userId: string`; `phone: string` | Forma exacta del cuerpo que envía `createCivic` |
| `RegisterUserInput` (nuevo, añadido a `src/types/user.ts`) | `username: string`; `email: string`; `password: string`; `phone?: string` | `phone` opcional y ya sin prefijo resuelto a nivel de tipo (se resuelve en `register.tsx` antes de llamar a `submitRegister`); el resto obligatorios |

- Estrategia de medios: no aplica, esta feature no captura ni muestra ninguna imagen.
- Almacenamiento de esta fase: mock-only (`db.json`, persistente hasta que se edite a mano); no hay ningún camino de backend real que conservar ni ningún camino mock que borrar (no existía ninguno de registro antes de esta feature).
- Ciclo de vida: los registros de `users`/`civics` creados desde esta pantalla persisten en `db.json` igual que cualquier otro registro del mock, hasta que se edite el archivo a mano.

## Diseño mínimo

- **`src/types/country.ts`** (nuevo): solo la interfaz `Country` descrita arriba.
- **`src/constants/countries.ts`** (nuevo): `export const COUNTRIES: Country[]` con España (`{ isoCode: 'ES', dialCode: '+34', flagEmoji: '🇪🇸', name: 'España' }`), Francia (`{ isoCode: 'FR', dialCode: '+33', flagEmoji: '🇫🇷', name: 'Francia' }`) y Portugal (`{ isoCode: 'PT', dialCode: '+351', flagEmoji: '🇵🇹', name: 'Portugal' }`), en ese orden; `export const DEFAULT_COUNTRY = COUNTRIES[0]` (España).
- **`src/components/country-code-picker.tsx`** (nuevo): mismo patrón que `CategoryPicker` — un disparador compacto (`Pressable` con el emoji + `dialCode` del país seleccionado) que abre un `Modal transparent animationType="slide"` con backdrop `Pressable` (cierra al tocar fuera) y un panel `ThemedView` que lista `COUNTRIES` con `.map()` (lista estática de 3 elementos, no requiere `FlatList`); cada opción es un `Pressable` con el emoji + nombre + prefijo que llama a `onSelectCountry(country)` y cierra la hoja. Props: `selectedCountry: Country`, `onSelectCountry: (country: Country) => void`.
- **`src/utils/password-strength.ts`** (nuevo): `getPasswordStrengthLevel(password: string): 'invalid' | 'acceptable' | 'strong'` — `invalid` si `password.length < 8` o no contiene `/[A-Z]/` o no contiene `/[0-9]/`; en otro caso `acceptable`; si además contiene `/[^A-Za-z0-9]/`, `strong`. `isEmailFormatValid(email: string): boolean` — regex simple de formato (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` o equivalente), sin comprobar existencia real del dominio.
- **`src/components/password-strength-meter.tsx`** (nuevo): recibe `password: string`; si `password === ''` devuelve `null` (no renderiza nada); en otro caso calcula `getPasswordStrengthLevel(password)` y pinta una barra/texto con el color correspondiente (`invalid` → `#d92d20`, `acceptable` → `#d97706`, `strong` → `#16a34a`) y una etiqueta corta coherente con el color (p. ej. "Débil"/"Aceptable"/"Robusta").
- **`src/services/civic.service.ts`** (nuevo): mismo patrón que `image.service.ts` — `export const CIVICS_ENDPOINT = \`${API_BASE_URL}/civics\`` y `export async function createCivic(input: CreateCivicInput): Promise<Civic>` (`POST` con `fetchWithTimeout`, mensajes de error amigables propios, lanza en `!response.ok`, devuelve el recurso creado tipado).
- **`src/services/auth.service.ts`** (modificado): añade `export class UsernameOrEmailTakenError extends Error` (mismo patrón que `InvalidCredentialsError`, con `name = 'UsernameOrEmailTakenError'`) y `export async function register(input: RegisterUserInput): Promise<User>` — recorta `username`/`email`; comprueba duplicado de `username` con `fetchUsersByField('username', trimmedUsername)` (si hay alguno, lanza `UsernameOrEmailTakenError` con mensaje específico de username); comprueba duplicado de `email` con `fetchUsersByField('email', trimmedEmail)` (si hay alguno, lanza con mensaje específico de email); si no hay duplicados, `POST ${USERS_ENDPOINT}` con `{ username: trimmedUsername, email: trimmedEmail, password: input.password, role: 'civic' }` (sin `id`), mismo manejo de `RequestTimeoutError`/fallo de red/`!response.ok` que `fetchUsersByField`, devuelve el `User` creado (con el `id` que asigna `json-server`).
- **`src/hooks/use-register.ts`** (nuevo): calcado de `use-login.ts` pero sin ningún estado ni lógica de lockout. `export interface UseRegisterResult { isSubmitting: boolean; errorMessage: string | null; submitRegister: (input: RegisterUserInput) => Promise<{ user: User; token: AuthToken | null } | null> }`. `submitRegister` usa el mismo guard por `isSubmittingRef` que `useLogin` (evita envíos duplicados); llama a `register(input)` dentro de un `try/catch` (captura cualquier error, incluido `UsernameOrEmailTakenError`, y lo vuelca en `errorMessage` con `error.message`, devolviendo `null`); en éxito, si `input.phone` no está vacío tras `trim()`, llama a `createCivic({ userId: user.id, phone: input.phone })` dentro de su propio `try/catch` cuyo fallo se ignora (no bloqueante, no se refleja en `errorMessage`); por último llama a `requestToken(user.id)` fuera de cualquier `catch` que pueda bloquear el resultado (igual que `useLogin`), y devuelve `{ user, token }`.
- **`src/app/register.tsx`** (nuevo): mismo layout visual que `login.tsx` (mismos `styles`, `ThemedView`/`SafeAreaView`/`KeyboardAvoidingView`, hero con título). Campos: `TextInput` de username; `TextInput` de email (`keyboardType="email-address"`); fila de teléfono = `CountryCodePicker` (estado `selectedCountry`, inicial `DEFAULT_COUNTRY`) + `TextInput` numérico opcional (`keyboardType="phone-pad"`) en una `View` con `flexDirection: 'row'`; `PasswordInput` + `PasswordStrengthMeter` justo debajo; segundo `PasswordInput` para confirmar. Validación manual (sin Zod ni ninguna librería nueva, igual que `login.tsx`): `username.trim() !== ''`, `email.trim() !== ''`, `isEmailFormatValid(email.trim())`, `getPasswordStrengthLevel(password) !== 'invalid'`, `confirmPassword === password`; el botón de envío se deshabilita si falla cualquiera de estas o si `isSubmitting`. Mensaje de error con el mismo `ERROR_COLOR` (`'#d92d20'`) que `login.tsx`. Al enviar con éxito: si el número escrito (tras `trim()`) no está vacío, construye `phone = \`${selectedCountry.dialCode}${numero.trim()}\``; llama a `submitRegister({ username: username.trim(), email: email.trim(), password, phone })` (sin la clave `phone` si no se escribió número); si el resultado no es `null`, `await signIn(result.user, result.token); router.replace('/')`. Enlace inferior "¿Ya tienes cuenta? Inicia sesión" (`Pressable` + `ThemedText type="link"`) → `router.back()`.
- **`src/app/login.tsx`** (modificado): nuevo `Pressable` + `ThemedText type="link"` "¿No tienes cuenta? Créate una", calcado del enlace existente "¿Has olvidado tu contraseña?" (mismas clases/estilo), `onPress={() => router.push('/register')}`, colocado junto a él en el mismo `View`.
- **`src/app/_layout.tsx`** (modificado): añade `<Stack.Screen name="register" options={{ headerShown: false }} />` dentro del `Stack` raíz, junto a `login`.
- No se añaden capas especulativas: no hay Zod (ninguna pantalla del repo lo usa hoy, se mantiene la validación manual ya usada por `login.tsx`), no hay ninguna dependencia nueva de selector de país ni de validación de teléfono.

## Criterios de aceptación

1. Desde `login.tsx`, pulsar "¿No tienes cuenta? Créate una" navega a `/register`; desde `register.tsx`, pulsar "¿Ya tienes cuenta? Inicia sesión" vuelve atrás (`router.back()`).
2. Con username y email no usados todavía, email con formato válido, contraseña que cumpla al menos el nivel `acceptable` (≥8 caracteres + 1 mayúscula + 1 número) y confirmación idéntica, el botón de registro está habilitado; al pulsarlo se crea el usuario en el mock (`role: 'civic'` fijo), se inicia sesión automáticamente (`signIn` + persistencia igual que `login`) y se navega a `/` (equivalente a `router.replace('/')`).
3. Si se escribió un número de teléfono, al completar el registro se crea también el registro correspondiente en `civics` con `userId` del usuario recién creado y `phone` igual al prefijo del país seleccionado (por defecto España, `+34`) concatenado con el número escrito; si no se escribió ningún número, no se crea ningún registro en `civics`.
4. Un fallo al crear el registro de `civics` (red/timeout o `!ok` del mock) no impide completar el registro ni iniciar sesión: el usuario entra igualmente a la app, sin ningún mensaje de error visible por este fallo puntual.
5. Username o email ya existentes en `db.json` (comparación exacta, mismo criterio que usa `login` para buscar) muestran un mensaje de error específico (indicando cuál de los dos está duplicado) y no crean ningún registro nuevo ni inician sesión.
6. Email con formato inválido, username/email vacíos (tras `trim()`), contraseña por debajo del nivel `acceptable` (nivel `invalid`) o confirmación distinta de la contraseña dejan el botón de registro deshabilitado, sin necesidad de pulsarlo para detectarlo.
7. El medidor de fuerza de contraseña no muestra nada mientras el campo está vacío; muestra color/etiqueta rojo (`invalid`) por debajo de 8 caracteres o sin mayúscula o sin número; naranja (`acceptable`) al cumplir exactamente longitud ≥8 + mayúscula + número sin carácter especial; verde (`strong`) al cumplir además un carácter especial. El límite exacto de 8 caracteres se valida en ambos sentidos (7 caracteres válidos restantes → `invalid`; 8 caracteres válidos → al menos `acceptable`).
8. Un fallo de red/timeout al llamar a `register()` (duplicados o creación) muestra un mensaje de error genérico y amigable, sin crear ningún registro parcial ni iniciar sesión.
9. La pantalla `register.tsx` permanece accesible y funcional incluso con el usuario ya autenticado navegando manualmente hacia atrás desde `/` (no es una ruta protegida por sesión, igual que `login.tsx` no lo es para un usuario deslogueado); no se añade ningún guard de sesión nuevo fuera del alcance de esta feature.

## Estrategia de verificación

- `src/__tests__/services/auth.service.test.ts` (modificar + ampliar): casos nuevos para `register()` — duplicado de username (lanza `UsernameOrEmailTakenError`, no llega a comprobar email ni a crear el usuario), duplicado de email (tras pasar la comprobación de username), creación exitosa (`POST` con el cuerpo exacto `{ username, email, password, role: 'civic' }`, sin `id`, devuelve el `User` creado con su `id`), recorte de espacios en username/email antes de comprobar y de enviar, fallo de red/timeout no se trata como duplicado (mismo patrón que los casos ya existentes de `login`).
- `src/__tests__/services/civic.service.test.ts` (nuevo): `createCivic` envía el `POST` correcto (`userId`, `phone`) al endpoint correcto, devuelve el `Civic` creado, traduce timeout/fallo de red a mensajes amigables propios, lanza en `!response.ok`.
- `src/__tests__/utils/password-strength.test.ts` (nuevo): `getPasswordStrengthLevel` — `invalid` para longitud <8, para longitud ≥8 sin mayúscula, para longitud ≥8 sin número; límite exacto en 7 vs. 8 caracteres (con mayúscula y número) como frontera `invalid`/`acceptable`; `acceptable` para ≥8 + mayúscula + número sin carácter especial; `strong` para lo mismo añadiendo un carácter especial. `isEmailFormatValid` — formatos válidos e inválidos representativos (sin `@`, sin dominio, con espacios). No se añaden pruebas que solo repliquen el regex carácter a carácter.
- `src/__tests__/hooks/use-register.test.ts` (nuevo): éxito sin teléfono (no llama a `createCivic`); éxito con teléfono (llama a `createCivic` con el `userId`/`phone` correctos); fallo de `createCivic` no impide devolver `{ user, token }` ni se refleja en `errorMessage`; `UsernameOrEmailTakenError`/error de red de `register()` rellenan `errorMessage` y devuelven `null`; guard de envío duplicado (`isSubmitting`) igual que el ya probado en `useLogin`.
- `src/__tests__/components/password-strength-meter.test.tsx` (nuevo): no renderiza nada con `password: ''`; color/etiqueta correctos para un ejemplo de cada nivel (`invalid`/`acceptable`/`strong`).
- `src/__tests__/components/country-code-picker.test.tsx` (nuevo): muestra el país seleccionado (emoji + prefijo); al pulsar un país de la hoja llama a `onSelectCountry` con el país correcto y cierra la hoja; tocar el backdrop cierra la hoja sin llamar a `onSelectCountry`.
- `src/__tests__/app/register-screen.test.tsx` (nuevo, opcional según lo acordado con la usuaria, mismo nivel que `login-session-restore.test.tsx`): formulario con botón deshabilitado por cada condición de validación (campos vacíos, email inválido, password `invalid`, confirmación distinta); envío exitoso llama a `signIn` y navega con `router.replace('/')`; enlace "¿Ya tienes cuenta?" llama a `router.back()`; mensaje de error visible cuando `useRegister` devuelve `errorMessage`.
- `src/app/login.tsx` (test existente, revisar sin romper): si existe algún test de integración de `login.tsx` que enumere todos los elementos accesibles de la pantalla, revisar que el nuevo enlace "¿No tienes cuenta? Créate una" no rompe ninguna aserción existente por conteo de elementos.

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e/integración adicionales a los ya descritos. Esta feature no consume ningún endpoint real, por lo que no aplica la distinción real-first/fallback en la verificación: toda la comprobación es contra el mock, salvo `requestToken` (ya existente, no se modifica, no se vuelve a verificar aquí).

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
