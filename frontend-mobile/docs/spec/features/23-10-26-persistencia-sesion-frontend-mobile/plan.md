# 2026-10-23 — Plan de implementación: Persistencia de sesión (usuario + token) en SecureStore

- Objetivo: que la sesión (usuario + token) sobreviva a cerrar la app, restaurándose al arrancar y redirigiendo directo a Home sin mostrar el login, sin persistir nunca `password`.
- Arquitectura: nuevo tipo `SessionUser` (`Omit<User, 'password'>`) + nuevo servicio `session-user-storage.service.ts` (mismo estilo que `token-storage.service.ts`) + ampliación de `use-session.ts` (persistencia/restauración + `isRestoringSession`) + gate de restauración en `login.tsx`. No se toca `token-storage.service.ts` ni `(tabs)/index.tsx`.
- Herramientas: Expo/React Native + TypeScript estricto, `expo-secure-store` (ya instalado), Expo Router, Jest + `@testing-library/react-native` (ya instaladas, sin dependencias nuevas).
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/logout-frontend-mobile.
- Estado: Implementado y verificado.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `npx expo install` (nunca npm/yarn/pnpm/bun add) y requiere aprobación explícita previa. Esta feature no necesita ninguna dependencia nueva.
- Backend y mock: no aplica (ver spec.md, "Contrato de datos") — la persistencia de sesión es 100% local/cliente, sin llamada de red.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración adicionales a los ya descritos en la especificación.
- Preservar cambios ajenos y la rama acordada (`feature/logout-frontend-mobile`). No crear commits ni hacer push salvo petición explícita; no conectar al backend real.
- Restricciones particulares:
  - No modificar `src/services/token-storage.service.ts` ni `src/__tests__/services/token-storage.service.test.ts`.
  - `src/services/session-user-storage.service.ts` es un archivo nuevo e independiente: no se amplía `token-storage.service.ts`.
  - La reconstrucción del objeto en `loadSessionUser()` debe hacerse campo a campo (nunca con spread `...parsedValue`), igual que ya hace `loadToken()` con `AuthToken`.
  - `signIn` destructura `const { password, ...sessionUser } = signedInUser;`; el `password` sin usar es intencional (permitido por `ignoreRestSiblings: true` en la config de ESLint del repo).
  - No se toca `src/app/(tabs)/index.tsx`.
  - El gate de restauración en `login.tsx` usa exactamente `testID="session-restoring-indicator"` en el `ActivityIndicator`, único añadido no pedido explícitamente, solo para dar un ancla estable al test de integración.

## Focos de revisión

- Riesgo: que `password` se cuele de vuelta al leer el almacén (por ejemplo, si `SecureStore` devolviera un JSON manipulado con ese campo) → cubierto por el criterio 4, verificado explícitamente en `session-user-storage.service.test.ts` con un caso de `password` colado en el JSON que nunca se devuelve, y mitigado estructuralmente por la reconstrucción campo a campo (nunca spread).
- Riesgo: una carrera entre `loadSessionUser()` y `loadToken()`, o un `setState` tras desmontar el `SessionProvider`, dejando `isRestoringSession` colgado en `true` → cubierto por el guard `isActive` (mismo patrón que `use-login.ts`), verificado en `use-session.test.ts`.
- Riesgo: que un fallo al persistir/leer un almacenamiento (token o usuario) rompa el otro flujo → cubierto por los `try/catch` independientes en `signIn`/`signOut`, verificado en `use-session.test.ts` ("un fallo en un almacenamiento no rompe el flujo del otro").
- Riesgo: que `login.tsx` parpadee mostrando el formulario antes de redirigir con una sesión ya persistida → cubierto por el gate `isRestoringSession` antes del formulario, verificado en `login-session-restore.test.tsx` (caso "sesión persistida completa → redirige a `/`" sin pasar por el formulario).
- Riesgo: que el test ya existente `home-screen-logout.test.tsx` empiece a golpear `SecureStore` real por el nuevo `useEffect` de restauración del `SessionProvider` → cubierto añadiendo el mock de `@/services/session-user-storage.service` a ese test (ver Tarea 5).
- Riesgo: cambiar el tipo de `user` en `SessionContextValue` de `User` a `SessionUser` rompiendo algún consumidor que leyera `.password` → mitigado verificando antes de la Tarea 3 que ningún consumidor actual de `useSession().user` lee ese campo (ya confirmado en la especificación); `npx tsc --noEmit` lo confirmaría de nuevo si hubiera algún uso no detectado.

## Mapa de archivos

Rutas relativas a la raíz del repositorio (`frontend-mobile/`).

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/types/user.ts` | Añadir `export type SessionUser = Omit<User, 'password'>;` junto a `User`. |
| Crear | `src/services/session-user-storage.service.ts` | `saveSessionUser`/`loadSessionUser`/`clearSessionUser` vía `expo-secure-store`, clave `urbanpulse.auth.user`, reconstrucción campo a campo. |
| Modificar | `src/hooks/use-session.ts` | `user: SessionUser \| null`, `isRestoringSession: boolean`, `signIn`/`signOut` ampliados, `useEffect` de restauración con guard `isActive`. |
| Modificar | `src/app/login.tsx` | Desestructurar `user`/`isRestoringSession` de `useSession()`; dos returns tempranos (loader y `<Redirect href="/" />`). |
| Crear | `src/__tests__/services/session-user-storage.service.test.ts` | Tests del nuevo servicio (mirror de `token-storage.service.test.ts`). |
| Crear | `src/__tests__/hooks/use-session.test.ts` | Tests del hook ampliado (persistencia, restauración, guard `isActive`, tolerancia a fallos parciales). |
| Crear | `src/__tests__/app/login-session-restore.test.tsx` | Test de integración del gate de restauración en `login.tsx`. |
| Modificar | `src/__tests__/app/tabs/home-screen-logout.test.tsx` | Añadir mock de `@/services/session-user-storage.service` (`loadSessionUser` → `null`). |
| Actualizar | `docs/spec/features/23-10-26-persistencia-sesion-frontend-mobile/spec.md` y `plan.md` | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

No aplica actualización de `db.json` (ver spec.md, "Contrato de datos": sin endpoint ni entidad mock implicada).

## Preparación

- [x] Leer CLAUDE.md, `spec.md`, los archivos afectados (`src/types/user.ts`, `src/services/token-storage.service.ts`, `src/__tests__/services/token-storage.service.test.ts`, `src/hooks/use-session.ts`, `src/hooks/use-login.ts`, `src/app/login.tsx`, `src/app/(tabs)/index.tsx`, `src/__tests__/app/tabs/home-screen-logout.test.tsx`) y el estado de Git.
- [x] No aplica revisión de contrato de backend/mock (sin endpoint implicado).
- [x] Comprobar la versión instalada de `expo-secure-store` ya en uso; consultar Context7 solo si surge alguna duda sobre su API versionada.
- [x] Registrar el estado inicial de lint/typecheck/tests antes de tocar código, para distinguir problemas preexistentes de los introducidos por esta feature.

## Tarea 1: tipo `SessionUser`

**Archivos:** `src/types/user.ts` (modificar).

**Interfaces:**
```ts
export type SessionUser = Omit<User, 'password'>;
```

**Criterios cubiertos:** 4 (base del contrato que impide persistir `password`).

- [x] Definir el caso unitario relevante: no aplica test dedicado para un alias de tipo; se verifica indirectamente en la Tarea 2 (`session-user-storage.service.test.ts`) y por `npx tsc --noEmit`.
- [x] Implementar el cambio mínimo: añadir `SessionUser` junto a `User`, sin modificar `User` ni otros tipos del archivo.
- [x] Ejecutar `npx tsc --noEmit` y registrar evidencia (debe seguir limpio).
- [x] Revisar el diff y actualizar este plan.

## Tarea 2: servicio `session-user-storage.service.ts`

**Archivos:** `src/services/session-user-storage.service.ts` (nuevo), `src/__tests__/services/session-user-storage.service.test.ts` (nuevo).

**Interfaces:**
```ts
export async function saveSessionUser(sessionUser: SessionUser): Promise<void>;
export async function loadSessionUser(): Promise<SessionUser | null>; // nunca lanza
export async function clearSessionUser(): Promise<void>;
```
Clave `urbanpulse.auth.user`. Mismo estilo que `token-storage.service.ts`: `JSON.stringify`/`JSON.parse`, `loadSessionUser` envuelto en `try/catch` que devuelve `null` ante cualquier fallo o forma inválida, reconstrucción del objeto devuelto campo a campo (nunca `...parsedValue`).

**Criterios cubiertos:** 3, 4.

- [x] Definir los casos unitarios relevantes: round-trip `saveSessionUser`→`loadSessionUser`; clave correcta usada en `SecureStore.setItemAsync`/`getItemAsync`/`deleteItemAsync`; `getItemAsync` devuelve `null` → `loadSessionUser` devuelve `null`; `SecureStore` lanza en `loadSessionUser` → devuelve `null` sin relanzar; JSON con forma inválida (campos faltantes o de tipo incorrecto) → `null`; JSON con un `password` colado → el objeto devuelto no lo incluye. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/services/session-user-storage.service.test.ts` antes del cambio y registrar el resultado (debe fallar: el servicio aún no existe).
- [x] Implementar el cambio mínimo: crear el servicio con la interfaz exacta de arriba.
- [x] Ejecutar `npx jest src/__tests__/services/session-user-storage.service.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

## Tarea 3: ampliación de `use-session.ts`

**Archivos:** `src/hooks/use-session.ts` (modificar), `src/__tests__/hooks/use-session.test.ts` (nuevo).

**Interfaces:**
```ts
export interface SessionContextValue {
  user: SessionUser | null;
  token: AuthToken | null;
  isRestoringSession: boolean;
  signIn: (user: User, token: AuthToken | null) => Promise<void>;
  signOut: () => Promise<void>;
}
```
`signIn` destructura `const { password, ...sessionUser } = signedInUser;`, guarda `sessionUser` en memoria y llama a `saveSessionUser(sessionUser)` en un `try/catch` independiente del de `saveToken`. `signOut` añade `clearSessionUser()` en un `try/catch` independiente del de `clearToken`. Nuevo `useEffect` al montar: `Promise.all([loadSessionUser(), loadToken()])` con guard local `isActive`; si `loadSessionUser()` devuelve un usuario válido, `setUser`/`setToken` con lo cargado; en cualquier caso, al terminar, `setIsRestoringSession(false)` (solo si `isActive`).

**Criterios cubiertos:** 1, 3, 4, 5.

- [x] Definir los casos unitarios relevantes: `signIn` llama a `saveToken` y `saveSessionUser` y expone `user` sin `password`; `signOut` llama a `clearToken` y `clearSessionUser`; al montar con usuario+token persistidos válidos, restaura ambos y termina con `isRestoringSession: false`; al montar con usuario persistido y token `null`/inválido, restaura solo `user` (`token` queda `null`); al montar sin usuario persistido, no restaura nada; un fallo de `loadSessionUser`/`saveToken`/etc. no impide que el otro flujo complete; `setState` no se llama tras desmontar antes de que resuelvan las promesas (guard `isActive`). No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-session.test.ts` antes del cambio y registrar el resultado (debe fallar: el archivo de test y el comportamiento aún no existen).
- [x] Implementar el cambio mínimo siguiendo exactamente la interfaz de arriba.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-session.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

## Tarea 4: gate de restauración en `login.tsx`

**Archivos:** `src/app/login.tsx` (modificar), `src/__tests__/app/login-session-restore.test.tsx` (nuevo).

**Interfaces:** ampliar `const { signIn } = useSession();` a `const { signIn, user, isRestoringSession } = useSession();`. Tras los hooks existentes, antes del `return` del formulario:
```tsx
if (isRestoringSession) {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator testID="session-restoring-indicator" />
    </ThemedView>
  );
}
if (user) {
  return <Redirect href="/" />;
}
```

**Criterios cubiertos:** 1, 2, 3.

- [x] Definir los casos unitarios relevantes: con sesión persistida completa (usuario + token válidos) → se renderiza el stub de `Redirect` apuntando a `/` sin que llegue a mostrarse el formulario; sin sesión persistida → tras el loader, se muestra el formulario de login; con usuario persistido y token ausente/inválido → también redirige a `/`. No se testea aquí el flujo de envío del formulario (ya cubierto, si existe, por otros tests de `login.tsx`); la transición exacta del loader se trata como secundaria, se asertará el estado final.
- [x] Ejecutar `npx jest src/__tests__/app/login-session-restore.test.tsx` antes del cambio y registrar el resultado (debe fallar: el archivo de test y el gate aún no existen).
- [x] Implementar el cambio mínimo: añadir los dos returns tempranos exactamente como arriba, sin reordenar ni modificar el resto de `login.tsx`.
- [x] Ejecutar `npx jest src/__tests__/app/login-session-restore.test.tsx` y registrar evidencia (debe pasar los tres casos).
- [x] Revisar el diff y actualizar la especificación y este plan.

## Tarea 5: actualizar `home-screen-logout.test.tsx`

**Archivos:** `src/__tests__/app/tabs/home-screen-logout.test.tsx` (modificar).

**Interfaces:** añadir, junto al `jest.mock('@/services/token-storage.service', ...)` ya existente, un `jest.mock('@/services/session-user-storage.service', () => ({ saveSessionUser: jest.fn().mockResolvedValue(undefined), loadSessionUser: jest.fn().mockResolvedValue(null), clearSessionUser: jest.fn().mockResolvedValue(undefined) }))`.

**Criterios cubiertos:** ninguno nuevo; evita una regresión en la cobertura ya existente de la feature de logout por el nuevo `useEffect` de restauración del `SessionProvider`.

- [x] Ejecutar `npx jest src/__tests__/app/tabs/home-screen-logout.test.tsx` antes del cambio (tras completar la Tarea 3, puede fallar o quedar inestable por golpear `SecureStore` real desde el nuevo `useEffect`) y registrar el resultado.
- [x] Implementar el cambio mínimo: añadir únicamente el mock descrito arriba, sin tocar ningún caso de test existente.
- [x] Ejecutar `npx jest src/__tests__/app/tabs/home-screen-logout.test.tsx` y registrar evidencia (deben seguir pasando los 4 casos ya existentes).
- [x] Revisar el diff y actualizar este plan.

## Comprobaciones finales

Ejecutar desde frontend-mobile/.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests (archivos de esta feature) | `npx jest src/__tests__/services/session-user-storage.service.test.ts src/__tests__/hooks/use-session.test.ts src/__tests__/app/login-session-restore.test.tsx src/__tests__/app/tabs/home-screen-logout.test.tsx` | 4/4 suites, 48/48 tests. |
| Tests (suite completa) | `npx jest` | 25/25 suites, 345/345 tests. Sin regresiones. |
| Typecheck | `npx tsc --noEmit` | Limpio (exit 0). |
| Lint | `npx expo lint` | Exit 0, 0 errores. 2 warnings no bloqueantes en `src/__tests__/app/login-session-restore.test.tsx` (líneas 37-38, `@typescript-eslint/no-require-imports`): uso deliberado de `require()` dentro de la factory de `jest.mock('expo-router', ...)` para evitar problemas de hoisting de JSX en ese punto; aceptado tal cual, cosmético y no bloqueante. |
| Diff, desde la raíz | `git diff --check` | Sin conflictos de whitespace. |

- [x] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [x] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance (en particular: confirmar que `src/services/token-storage.service.ts` y `src/app/(tabs)/index.tsx` siguen sin cambios).

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-24.
- Resultado entregado: la sesión (usuario sin `password` + token) ahora se persiste en `SecureStore` y se restaura automáticamente al reabrir la app, con un gate de carga (`isRestoringSession`) en `login.tsx` que evita el parpadeo del formulario antes de redirigir a Home.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Sesión persistida completa → redirige directo a Home sin mostrar login | `src/__tests__/app/login-session-restore.test.tsx`: `'con sesión persistida completa redirige a "/" y nunca muestra el campo de usuario'` | Cumplido |
| 2. Sin sesión persistida → se muestra el login normal | `src/__tests__/app/login-session-restore.test.tsx`: `'sin sesión persistida muestra el formulario normal y no redirige'` | Cumplido |
| 3. Usuario persistido sin token → se restaura igual (token `null`) | `src/__tests__/app/login-session-restore.test.tsx`: `'con usuario persistido pero sin token redirige a "/" (sesión restaurable)'` y `src/__tests__/hooks/use-session.test.ts`: `'restaura user y deja token en null cuando loadToken resuelve null'` | Cumplido |
| 4. `password` nunca persistido ni expuesto por `useSession()` | `src/__tests__/services/session-user-storage.service.test.ts`: `'nunca devuelve la propiedad password aunque el JSON guardado la contenga'` y `src/__tests__/hooks/use-session.test.ts`: `'expone user sin password y token en el contexto tras iniciar sesión'` | Cumplido |
| 5. `signOut()` limpia token y usuario persistidos | `src/__tests__/hooks/use-session.test.ts`: `'llama a clearToken y clearSessionUser y deja user/token en null'` | Cumplido |

- Comprobaciones: `npx tsc --noEmit` limpio; `npx expo lint` exit 0 (0 errores, 2 warnings no bloqueantes aceptados, ver tabla de arriba); `npx jest` sobre los 4 archivos de test de la feature con 48/48 tests en verde; suite completa del proyecto `npx jest` con 25/25 suites y 345/345 tests, sin regresiones.
- Decisiones y desviaciones: durante el desarrollo se corrigieron dos problemas, ambos exclusivamente en `src/__tests__/hooks/use-session.test.ts` (archivo de test, sin impacto en producción): faltaba `await` en 3 llamadas a `renderHook(...)` y en 2 llamadas a `unmount()`, ya que RNTL 14 resuelve ambas de forma asíncrona. Se aceptan los 2 warnings de lint no bloqueantes en `src/__tests__/app/login-session-restore.test.tsx` (líneas 37-38, `@typescript-eslint/no-require-imports`) tal cual, por ser un `require()` deliberado dentro de la factory de `jest.mock('expo-router', ...)` para evitar problemas de hoisting de JSX en ese punto.
- Limitaciones y pendientes: ninguna. Feature cerrada.

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente.
