# 2026-10-23 — Especificación: Persistencia de sesión (usuario + token) en SecureStore

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: feature/logout-frontend-mobile.
- Última actualización: 2026-10-23.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: petición explícita del usuario para que la sesión sobreviva a cerrar la app, con diseño ya validado y aprobado antes de esta especificación. Ampliación directa de la persistencia de token ya existente (`src/services/token-storage.service.ts`), cubierta previamente por la feature `23-10-26-logout-frontend-mobile`.

## Objetivo y decisiones vigentes

Hoy el token ya se persiste en `expo-secure-store` (`token-storage.service.ts`), pero el usuario vive solo en memoria y `loadToken()` nunca se llama desde ningún sitio: al reabrir la app, siempre se vuelve al login aunque hubiera una sesión reciente. Esta feature amplía esa persistencia para que también se guarde el usuario (sin su `password`) y la sesión completa se restaure automáticamente al arrancar la app, redirigiendo directo a Home sin pasar por el formulario de login.

- Alcance confirmado:
  - Persistir el usuario autenticado (sin `password`) en `expo-secure-store`, junto al token ya persistido.
  - Restaurar ambos (usuario y token) al arrancar la app, antes de que se muestre el formulario de login.
  - Si hay usuario persistido pero no token, restaurar igualmente la sesión (el token queda `null`, estado ya soportado por `SessionContextValue`).
  - Si no hay usuario persistido, mostrar el formulario de login normalmente (con o sin token huérfano persistido).
  - `signOut()` sigue limpiando tanto el token como el usuario persistidos.
- Decisiones confirmadas:
  - **Nunca se persiste `User.password`** (hoy viaja en texto plano, fase mock). Se define `SessionUser = Omit<User, 'password'>` en `src/types/user.ts` y el nuevo servicio de almacenamiento reconstruye el objeto campo a campo (nunca con spread), para que ningún campo inesperado —ni siquiera una `password` que acabara colada en el JSON persistido— pueda volver a aparecer al leerlo.
  - El usuario se persiste en un **servicio nuevo** `src/services/session-user-storage.service.ts` (no se amplía `token-storage.service.ts`, que ya tiene un contrato cerrado y testeado), con la misma cohesión que ya tienen otros servicios de sesión agrupados junto al de token (p. ej. `lockout.service.ts`).
  - **No hay contrato de backend nuevo ni llamada de red**: sigue siendo una operación 100% local vía `expo-secure-store` (ya instalado, sin dependencias nuevas), igual que la persistencia de token ya existente.
  - **La restauración se resuelve en `src/app/login.tsx`** (vía un nuevo campo `isRestoringSession` del contexto de sesión), **no en `src/app/_layout.tsx`**. Motivo: `unstable_settings.initialRouteName = 'login'` (ya existente en `src/app/_layout.tsx`) ya fuerza `login.tsx` como primera pantalla en cualquier arranque en frío, así que resolver el gate ahí es suficiente. Alternativa descartada: retener la splash screen en el layout raíz hasta resolver la restauración — más invasiva (afecta a todas las pantallas del `Stack`, no solo al login) y redundante dado lo anterior.
  - **Sin expiración/caducidad de sesión**: `AuthToken` no tiene `expiresAt` y esta feature no lo añade; la sesión persiste indefinidamente hasta un `signOut()` explícito. Queda fuera de alcance.
  - Usuario persistido válido + token `null` → se restaura igual (estado ya soportado). Token persistido válido + usuario `null`/inválido → no se restaura nada (equivalente a "sin sesión"; el token huérfano se sobrescribirá en el próximo login).
- Suposiciones por validar: ninguna; el diseño fue validado y aprobado explícitamente por el usuario antes de redactar esta especificación.
- Fuera de alcance:
  - Cualquier llamada de red, endpoint de backend o simulación mock (ver "Contrato de datos").
  - Expiración, refresco o caducidad de sesión/token.
  - Modificar `token-storage.service.ts` (su contrato no cambia) ni `(tabs)/index.tsx` (su guard `if (!user) return <Redirect href="/login" />` sigue siendo válido tal cual una vez restaurada la sesión).
  - Blindar un hipotético deep-link directo a `(tabs)/index.tsx` en arranque en frío: ya hoy, sin esta feature, un arranque así redirigiría a `/login` sin necesidad (no hay restauración en absoluto); esta feature no empeora ese caso, solo no lo corrige, por no haber sido pedido.

## Contexto verificado

- Implementación actual:
  - `src/services/token-storage.service.ts`: `saveToken`/`loadToken`/`clearToken` vía `expo-secure-store`, clave `urbanpulse.auth.token`. `loadToken()` nunca lanza (reconstrucción campo a campo, nunca spread, devuelve `null` ante cualquier forma inesperada). Ya testeado en `token-storage.service.test.ts`; esta feature no lo modifica.
  - `src/hooks/use-session.ts`: `SessionProvider` mantiene `user: User | null` y `token: AuthToken | null` solo en memoria. `signIn(user, token)` hace `setUser`/`setToken` y, si hay token, `saveToken(token)` en un `try/catch` que no relanza. `signOut()` hace `setUser(null)`/`setToken(null)` y `clearToken()` en un `try/catch` que no relanza. No existe ningún efecto que llame a `loadToken()`: la sesión nunca se restaura hoy.
  - `src/app/login.tsx`: `LoginScreen` desestructura `{ signIn }` de `useSession()`; tras un login correcto hace `await signIn(user, token)` y `router.replace('/')`. No lee hoy `user` ni ningún estado de restauración de `useSession()`.
  - `src/app/(tabs)/index.tsx`: `HomeScreen` hace `const { user } = useSession()` y `if (!user) return <Redirect href="/login" />`; no se toca en esta feature.
  - `src/app/_layout.tsx`: `Stack` raíz con `unstable_settings.initialRouteName = 'login'`, `Stack.Screen name="login"` y `name="(tabs)"` (ambas `headerShown: false`), envuelto en `<SessionProvider>`.
  - `src/hooks/use-login.ts`: ya usa el patrón `useEffect` con guard local `isActive` para cargar estado persistido al montar (`loadLockoutState().then((storedState) => { if (!isActive) return; ... })`), patrón de referencia para la restauración de sesión de esta feature.
  - `src/types/user.ts`: `User` incluye `password: string` (texto plano, comentario explícito en el propio archivo: "Ahora la usaremos en texto plano porque será en el backend donde se comprobará el hash"). No existe hoy ningún tipo derivado sin `password`.
- Contratos y referencias del dominio: no aplica contrato de backend/mock (ver "Contrato de datos").
- Configuración y dependencias disponibles: `expo-secure-store` (ya instalado y en uso por `token-storage.service.ts`), `expo-router` (`Redirect`, `unstable_settings.initialRouteName`) — todas ya instaladas y en uso en el repo; no se añade ninguna dependencia nueva.
- Diferencia entre estado actual y propuesto: hoy la sesión (usuario + token) nunca sobrevive a cerrar la app; tras esta feature, si hubo un login previo con persistencia exitosa, la app restaura usuario y token al arrancar y navega directo a Home sin mostrar el login.

## Contrato de datos (backend real + mock)

Esta feature no consume ni simula ningún endpoint. La persistencia y restauración de sesión es una operación 100% local/cliente: `signIn`/`signOut` y el nuevo efecto de restauración solo leen y escriben en el almacén seguro del dispositivo (`expo-secure-store`), igual que ya hace hoy la persistencia de token. No hay ninguna llamada de red, ni a backend real ni a `json-server`/mock, implicada. No aplica, por tanto, ninguna de las subsecciones de "Backend real" ni "Mock".

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/` (Expo Router): `src/app/login.tsx` (ruta `/login`, primera pantalla forzada en frío por `unstable_settings.initialRouteName`).
- Ubicación: pantalla ya existente fuera de `(tabs)/`, empujada/forzada por el `Stack` raíz; no se crea ninguna ruta nueva.
- Componentes nuevos vs. reutilizados: no se crea ningún componente nuevo. Se reutilizan `ThemedView`, `ActivityIndicator` (ya importado en `login.tsx`) y `Redirect` (`expo-router`, ya usado en `(tabs)/index.tsx` con el mismo patrón).
- Estados explícitos de carga/error: nuevo estado `isRestoringSession` (booleano, `true` al montar, `false` al terminar el intento de restauración) expuesto por `useSession()`. Mientras es `true`, `login.tsx` muestra un `ActivityIndicator` (con `testID="session-restoring-indicator"` como único ancla añadida, para el test de integración) en vez del formulario, evitando que la ciudadanía vea parpadear el login antes de ser redirigida. No hay mensajes de error de UI: si falla la lectura de un almacén, el efecto de restauración simplemente no restaura esa parte (mismo patrón tolerante a fallos que ya usan `signIn`/`signOut`).

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `SessionUser` (nuevo, `src/types/user.ts`) | `Omit<User, 'password'>`: `id: string`, `username: string`, `email: string`, `role: string` | Forma persistible y expuesta del usuario; nunca incluye `password`. `User` no se modifica. |
| `SessionContextValue.user` (modificado, `src/hooks/use-session.ts`) | pasa de `User \| null` a `SessionUser \| null` | Confirmado seguro: ningún consumidor actual lee `.password` de `useSession().user`. |
| `SessionContextValue.isRestoringSession` (nuevo, `src/hooks/use-session.ts`) | `boolean` | `true` al montar el `SessionProvider`, `false` en cuanto termina el intento de restauración (con o sin éxito). |

No se introduce ninguna entidad ni campo nuevo en `db.json`: esta feature no toca el servidor mock (no hay contrato de backend/mock, ver sección anterior).

- Estrategia de medios: no aplica; esta feature no adjunta ni gestiona ninguna imagen.
- Almacenamiento de esta fase: `expo-secure-store` ampliado con una segunda clave (`urbanpulse.auth.user`), encapsulada en el nuevo servicio `src/services/session-user-storage.service.ts`, con el mismo estilo defensivo que `token-storage.service.ts` (`loadSessionUser()` nunca lanza; cualquier forma inesperada devuelve `null`).
- Ciclo de vida: no aplica persistencia en `db.json` ni en memoria del backend; el usuario y el token siguen viviendo en memoria del cliente durante la sesión activa, y ahora también se reflejan en `expo-secure-store` hasta un `signOut()` explícito (sin expiración).

## Diseño mínimo

- **`src/types/user.ts`**: añadir `export type SessionUser = Omit<User, 'password'>;` junto a `User`, sin tocar `User`.
- **Nuevo `src/services/session-user-storage.service.ts`**: expone `saveSessionUser(sessionUser: SessionUser): Promise<void>`, `loadSessionUser(): Promise<SessionUser | null>` (nunca lanza) y `clearSessionUser(): Promise<void>`, vía `expo-secure-store`, clave `urbanpulse.auth.user`. Mismo estilo defensivo que `loadToken()`: reconstrucción del objeto campo a campo (nunca con spread) para que ningún campo inesperado —ni siquiera una `password` colada en el JSON persistido— pueda devolverse.
- **`src/hooks/use-session.ts`**:
  - El tipo de `user` del contexto pasa de `User | null` a `SessionUser | null`.
  - `signIn` sigue aceptando `User` completo (no rompe `login.tsx`/`use-login.ts`), pero destructura `const { password, ...sessionUser } = signedInUser;` y guarda/mantiene en memoria solo `sessionUser` (el `password` sin usar queda permitido por `ignoreRestSiblings: true`, ya confirmado en la configuración de ESLint del repo). Además de `saveToken`, llama a `saveSessionUser(sessionUser)` en un `try/catch` independiente del de `saveToken` (un fallo en uno no debe romper el otro).
  - `signOut` además de `clearToken()`, llama a `clearSessionUser()` en un `try/catch` independiente.
  - Nuevo `useEffect` al montar el `SessionProvider`: `Promise.all([loadSessionUser(), loadToken()])`, con guard local `isActive` (mismo patrón ya usado en `use-login.ts`). Solo si `loadSessionUser()` devuelve un usuario válido se restauran `user`/`token` en memoria (el token puede quedar `null`, estado ya soportado). Al terminar el intento (con o sin usuario restaurado), `isRestoringSession` pasa a `false`.
  - Nuevo campo `isRestoringSession: boolean` en `SessionContextValue` (`true` inicial).
- **`src/app/login.tsx`**: ampliar la desestructuración de `useSession()` a `const { signIn, user, isRestoringSession } = useSession();` y añadir, tras los hooks existentes y antes del formulario, dos returns tempranos: si `isRestoringSession` es `true`, `<ThemedView style={styles.container}><ActivityIndicator testID="session-restoring-indicator" /></ThemedView>`; si no y hay `user`, `<Redirect href="/" />`. Reutiliza `ThemedView`/`styles.container` y `ActivityIndicator` ya importados; no se crea ningún componente nuevo. No se toca `(tabs)/index.tsx`.
- No se añaden capas especulativas: no hay validación de formulario nueva (Zod no aplica, no hay input de usuario en este flujo) ni `FlatList` (no hay listas dinámicas implicadas).

## Criterios de aceptación

1. Con una sesión previa cuyo usuario y token quedaron persistidos correctamente, al reabrir la app se restaura la sesión y se redirige directo a Home (`/`) sin mostrar en ningún momento el formulario de login.
2. Sin ninguna sesión persistida, al abrir la app se muestra el formulario de login con normalidad (tras el estado de carga inicial `isRestoringSession`).
3. Con un usuario persistido pero sin token persistido (o con un token inválido/corrupto), la sesión se restaura igualmente: `user` queda poblado y `token` queda `null` (estado ya soportado por el resto de la app).
4. `password` nunca aparece en el JSON persistido por `session-user-storage.service.ts` ni en el objeto `user` expuesto por `useSession()`, incluso si un valor con `password` colado llegara a leerse del almacén (reconstrucción campo a campo, nunca spread).
5. `signOut()` sigue limpiando tanto el token como el usuario persistidos: tras cerrar sesión y reabrir la app (sin un login nuevo de por medio), no se restaura ninguna sesión.

## Estrategia de verificación

- `src/__tests__/services/session-user-storage.service.test.ts` (nuevo, mirror de `token-storage.service.test.ts`): round-trip, clave correcta (`urbanpulse.auth.user`), fallos de `SecureStore` → `null`/propagación según corresponda, shapes inválidos → `null`, y un caso explícito de que un `password` colado en el JSON guardado nunca se devuelve.
- `src/__tests__/hooks/use-session.test.ts` (nuevo — revierte la decisión de la feature de logout anterior de no testear este hook, porque ahora gana lógica propia no trivial): `signIn` guarda ambos almacenamientos y expone `user` sin `password`; `signOut` limpia ambos; restauración con usuario+token, con usuario y token `null`, y sin usuario persistido; guard `isActive` contra `setState` tras desmontar; un fallo en un almacenamiento no rompe el flujo del otro.
- `src/__tests__/app/login-session-restore.test.tsx` (nuevo, primer test de esta pantalla — solo se testea el gate de restauración, no el flujo de envío del formulario): mocks de frontera (`@/global.css`, `react-native-safe-area-context`, `expo-router` con stub de `Redirect` que renderiza su `href` como texto, `@/hooks/use-login` mockeado completo, `@/services/token-storage.service` y `@/services/session-user-storage.service` controlables). Casos: sesión persistida completa → redirige a `/`; sin sesión persistida → se muestra el formulario; usuario sin token → también redirige. La transición exacta del loader se trata como secundaria (se asertará el estado final, no el instante exacto, por los problemas de timing ya vistos en la feature de logout anterior).
- `src/__tests__/app/tabs/home-screen-logout.test.tsx` (ya existente, se actualiza): añadir mock de `@/services/session-user-storage.service` (mismo patrón que ya tiene para `token-storage.service`, con `loadSessionUser` resolviendo `null`) para que el nuevo `useEffect` de restauración del `SessionProvider` no golpee `SecureStore` real en ese test. Sin más cambios: no hay condición de carrera real con el `signIn` que ya dispara el test.
- No se modifica `token-storage.service.test.ts` (su contrato no cambia).

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e/integración adicionales a los ya descritos arriba. Esta feature no implica ninguna llamada de red real ni simulada, por lo que no aplica la distinción entre "contrato documentado" y "backend responde correctamente".

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
