# 2026-10-23 — Plan de implementación: Logout: botón discreto en la esquina superior izquierda

- Objetivo: un botón circular discreto en la esquina superior izquierda de `HomeScreen` que, tras confirmación, cierra la sesión activa (reutilizando `useSession().signOut()`) y navega a `/login`.
- Arquitectura: componente presentacional nuevo `LogoutButton` (sin lógica de sesión propia) + wiring en `src/app/(tabs)/index.tsx` que añade `signOut`, `Alert.alert` de confirmación y `router.replace('/login')`. No se toca `src/hooks/use-session.ts` ni `src/services/token-storage.service.ts`.
- Herramientas: Expo/React Native + TypeScript estricto, NativeWind, Expo Router, `react-native-safe-area-context`, `@expo/vector-icons/MaterialIcons`, Jest + `@testing-library/react-native` (ya instaladas, sin dependencias nuevas).
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/logout-frontend-mobile.
- Estado: Implementado y verificado.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `npx expo install` (nunca npm/yarn/pnpm/bun add) y requiere aprobación explícita previa. Esta feature no necesita ninguna dependencia nueva.
- Backend y mock: no aplica (ver spec.md, "Contrato de datos") — el logout es 100% local/cliente, sin llamada de red.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración adicionales a los dos ya descritos en la especificación.
- Preservar cambios ajenos y la rama acordada (`feature/logout-frontend-mobile`). No crear commits ni hacer push salvo petición explícita; no conectar al backend real.
- Restricciones particulares:
  - No modificar `src/hooks/use-session.ts` ni `src/services/token-storage.service.ts` bajo ninguna circunstancia; son lógica ya correcta y testeada que se reutiliza tal cual.
  - No crear `src/__tests__/hooks/use-session.test.ts` (decisión ya tomada y documentada en la especificación).
  - `LOGOUT_BUTTON_SIZE` debe ser exactamente `44` y exportarse desde `src/components/logout-button.tsx`.
  - El botón se renderiza hermano de `<SafeAreaView>` dentro de `<ThemedView style={styles.container}>`, nunca dentro de `safeArea` (ver justificación en spec.md, "Diseño mínimo").

## Focos de revisión

- Riesgo: el botón podría quedar alcanzable sin sesión activa → cubierto por el criterio 4 (guard `<Redirect>` ya existente, evaluado antes de montar el árbol) y verificado indirectamente en `home-screen-logout.test.tsx` al partir siempre de una sesión activa explícita.
- Riesgo: "Cancelar" podría disparar efectos no deseados por un mal orden de los botones del `Alert` → cubierto por el criterio 2 y el caso "pulsar Cancelar no llama a clearToken ni a router.replace" en `home-screen-logout.test.tsx`.
- Riesgo: doble invocación de `clearToken`/`signOut` por una doble pulsación → mitigado porque el `Alert` nativo bloquea la interacción con la pantalla subyacente mientras está abierto; verificado con la aserción "llama a `clearToken` una vez" en `home-screen-logout.test.tsx`.
- Riesgo: el componente `LogoutButton` podría acoplarse a `useSession`/`Alert` y perder su carácter presentacional reutilizable → mitigado exigiendo que reciba `onPress` por props (criterio de diseño, verificado en `logout-button.test.tsx` con un `onPress` mockeado).
- Riesgo: posicionamiento absoluto incorrecto (dentro de `safeArea` en vez de `container`) rompería el anclaje en pantallas anchas → mitigado siguiendo exactamente la ubicación documentada en spec.md; no se añade test automatizado de layout (no es viable con `@testing-library/react-native`), se revisa por diff manual.

## Mapa de archivos

Rutas relativas a la raíz del repositorio (`frontend-mobile/`).

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | `src/components/logout-button.tsx` | Componente presentacional `LogoutButton` (circular, 44dp, icono logout, `onPress`/`style` por props). |
| Modificar | `src/app/(tabs)/index.tsx` | Wiring: `signOut` de `useSession()`, `useSafeAreaInsets`, `Alert` de confirmación, `handleConfirmLogout`, render de `<LogoutButton>` posicionado de forma absoluta. |
| Crear | `src/__tests__/components/logout-button.test.tsx` | Tests unitarios del componente presentacional (mirror de `location-toggle.test.tsx`). |
| Crear | `src/__tests__/app/tabs/home-screen-logout.test.tsx` | Test de integración de `HomeScreen`: confirmación, cancelación, logout real con `clearToken`/`router.replace`. |
| Actualizar | `docs/spec/features/23-10-26-logout-frontend-mobile/spec.md` y `plan.md` | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

No aplica actualización de `db.json` ni de `src/types/` (ver spec.md, "Tipos y datos mock": no se introduce ninguna entidad ni campo nuevo).

## Preparación

- [x] Leer CLAUDE.md, `spec.md`, los archivos afectados (`src/app/(tabs)/index.tsx`, `src/hooks/use-session.ts`, `src/services/token-storage.service.ts`, `src/components/location-toggle.tsx`, `src/app/incidents/new.tsx`, `src/app/login.tsx`) y el estado de Git.
- [x] No aplica revisión de contrato de backend/mock (sin endpoint implicado).
- [x] Comprobar las versiones instaladas de `expo-router`, `react-native-safe-area-context` y `@expo/vector-icons` ya en uso; consultar Context7 solo si surge alguna duda sobre su API versionada.
- [x] Registrar el estado inicial de lint/typecheck/tests antes de tocar código, para distinguir problemas preexistentes de los introducidos por esta feature.

## Tarea 1: componente `LogoutButton`

**Archivos:** `src/components/logout-button.tsx` (nuevo), `src/__tests__/components/logout-button.test.tsx` (nuevo).

**Interfaces:**
```ts
export interface LogoutButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}
export const LOGOUT_BUTTON_SIZE = 44;
```
Icono `MaterialIcons name="logout"` tamaño 22. Fondo `theme.backgroundElement`, icono `theme.text` (vía `useTheme()`, siguiendo el patrón ya usado en `incidents/new.tsx`). `accessibilityRole="button"`, `accessibilityLabel="Cerrar sesión"`, `className` con `active:opacity-70`.

**Criterios cubiertos:** 1, 2, 3 (como disparador reutilizable), 4 (presentacional, no decide por sí mismo si está montado).

- [x] Definir el caso unitario relevante: "expone accessibilityRole/accessibilityLabel correctos" y "al pulsar llama a onPress una vez" (mirror exacto de `location-toggle.test.tsx`). No añadir pruebas que solo repliquen la implementación ni pruebas para texto visual.
- [x] Ejecutar `npx jest src/__tests__/components/logout-button.test.tsx` antes del cambio y registrar el resultado (debe fallar porque el componente aún no existe).
- [x] Implementar el cambio mínimo: crear `LogoutButton` con la interfaz exacta de arriba, sin llamar a `useSession()` ni a `Alert` dentro del componente.
- [x] Ejecutar `npx jest src/__tests__/components/logout-button.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan con el resultado real.

## Tarea 2: wiring en `HomeScreen`

**Archivos:** `src/app/(tabs)/index.tsx` (modificar).

**Interfaces:** añade `signOut` a la desestructuración de `useSession()`; `insets = useSafeAreaInsets()`; `handleConfirmLogout: () => Promise<void>` que hace `await signOut(); router.replace('/login');`; renderiza `<LogoutButton onPress={handleLogoutPress} style={...posicionamiento absoluto...} />` como hermano de `<SafeAreaView>`.

**Criterios cubiertos:** 1, 2, 3, 4.

- [x] Definir el caso de uso a cubrir junto con la Tarea 3 (el test de integración de `HomeScreen` cubre este wiring; no se duplica un test unitario aparte para la pantalla).
- [x] Ejecutar `npx jest src/__tests__/app/tabs/home-screen-logout.test.tsx` antes del cambio y registrar el resultado (debe fallar: el archivo de test aún no existe / el botón aún no está montado).
- [x] Implementar el cambio mínimo: importar `LogoutButton`, `Alert`, `useSafeAreaInsets`; añadir `handleConfirmLogout`; el `onPress` del botón dispara `Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [{text:'Cancelar', style:'cancel'}, {text:'Cerrar sesión', style:'destructive', onPress: handleConfirmLogout}])`; posicionar el botón con `position:'absolute'`, `top: insets.top + Spacing.two`, `left: insets.left + Spacing.three`, `zIndex`/`elevation` equivalentes al footer de `incidents/new.tsx`.
- [x] Ejecutar la comprobación y registrar evidencia (se completa junto con la Tarea 3, mismo archivo de test).
- [x] Revisar el diff y actualizar este plan.

## Tarea 3: test de integración `home-screen-logout.test.tsx`

**Archivos:** `src/__tests__/app/tabs/home-screen-logout.test.tsx` (nuevo).

**Interfaces:** monta `HomeScreen` real dentro de `SessionProvider` real; mocks de frontera: `@/global.css`, `@expo/vector-icons/MaterialIcons`, `react-native-safe-area-context` (insets a cero, patrón de `new-incident-screen.test.tsx`), `expo-router` (`router.replace` espiado + stub de `Redirect` que devuelve `null`), `@/services/token-storage.service` (`saveToken`/`loadToken`/`clearToken` mockeados). Helper `pressLastAlertButton` copiado de `new-incident-screen.test.tsx`. Helper de montaje que hace `signIn(mockUser, null)` antes de cada test para partir con sesión activa.

**Criterios cubiertos:** 1, 2, 3, 4.

- [x] Definir los casos unitarios relevantes: (a) pulsar el botón muestra el `Alert` con título "Cerrar sesión"; (b) pulsar "Cancelar" no llama a `clearToken` ni a `router.replace`; (c) pulsar "Cerrar sesión" llama a `clearToken` una vez y a `router.replace('/login')`. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/app/tabs/home-screen-logout.test.tsx` antes del cambio (fallará: ni el archivo de test ni el botón existen) y registrar el resultado.
- [x] Implementar el test siguiendo el patrón de mocks y el helper de `new-incident-screen.test.tsx`; depende de que las Tareas 1 y 2 ya estén implementadas.
- [x] Ejecutar `npx jest src/__tests__/app/tabs/home-screen-logout.test.tsx` y registrar evidencia (debe pasar los tres casos).
- [x] Revisar el diff y actualizar la especificación y este plan.

## Comprobaciones finales

Ejecutar desde frontend-mobile/.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | `npx jest src/__tests__/components/logout-button.test.tsx src/__tests__/app/tabs/home-screen-logout.test.tsx` y luego `npx jest` (suite completa) | ✅ 2/2 suites, 9/9 tests de los archivos nuevos; suite completa del proyecto: 22/22 suites, 301/301 tests, sin regresiones |
| Typecheck | npx tsc --noEmit | ✅ limpio (exit 0) |
| Lint | npx expo lint | ✅ limpio (exit 0) |
| Diff, desde la raíz | git diff --check | ✅ sin conflictos de whitespace; cambios confinados a `src/components/logout-button.tsx` (nuevo) y `src/app/(tabs)/index.tsx` (modificado), más los dos archivos de test nuevos |

- [x] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [x] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance (en particular: confirmar que `src/hooks/use-session.ts` y `src/services/token-storage.service.ts` siguen sin cambios).

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-23.
- Resultado entregado: botón de logout circular y discreto en la esquina superior izquierda de `HomeScreen`, que al pulsarlo pide confirmación mediante `Alert.alert` y, solo si se confirma, limpia el token real (`clearToken`) y navega a `/login`; cancelar no produce ningún efecto.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Alert con título "Cerrar sesión" antes de cualquier efecto | `src/__tests__/app/tabs/home-screen-logout.test.tsx` (caso: pulsar el botón muestra el `Alert` con título "Cerrar sesión") | Cumplido |
| 2. Cancelar no tiene efecto | `src/__tests__/app/tabs/home-screen-logout.test.tsx` (caso: pulsar "Cancelar" no llama a `clearToken` ni a `router.replace`) | Cumplido |
| 3. Confirmar limpia el token y navega a /login | `src/__tests__/app/tabs/home-screen-logout.test.tsx` (caso: pulsar "Cerrar sesión" llama a `clearToken` una vez y a `router.replace('/login')`) | Cumplido |
| 4. Botón nunca alcanzable con user === null | Guard `<Redirect>` ya existente en `src/app/(tabs)/index.tsx` (sin cambios) + helper de montaje con sesión activa explícita en `src/__tests__/app/tabs/home-screen-logout.test.tsx` | Cumplido |
| 5. No se modifica ni re-testea use-session.ts/token-storage.service.ts | Revisión de diff: `src/hooks/use-session.ts` y `src/services/token-storage.service.ts` permanecen sin cambios; no existe `src/__tests__/hooks/use-session.test.ts` | Cumplido |

- Comprobaciones: `npx tsc --noEmit` limpio (exit 0); `npx expo lint` limpio (exit 0); `npx jest` sobre los dos archivos de test nuevos: 2/2 suites, 9/9 tests ✅; suite completa del proyecto `npx jest`: 22/22 suites, 301/301 tests ✅, sin regresiones. Archivos finales: `src/components/logout-button.tsx` (nuevo) y `src/app/(tabs)/index.tsx` (modificado).
- Decisiones y desviaciones: durante la verificación se corrigieron dos problemas, ambos exclusivamente en archivos de test, sin impacto en código de producción: (1) a `logout-button.test.tsx` le faltaba `jest.mock('@/global.css', () => ({}))`, necesario porque el componente usa `useTheme()` (a diferencia de `LocationToggle`); (2) `home-screen-logout.test.tsx` tenía dos bugs propios — faltaba `await` en la llamada a `render(...)` dentro del helper de montaje (RNTL 14.1 es async) y el helper `pressLastAlertButton` exigía `onPress` en todos los botones del `Alert`, pero el botón "Cancelar" de esta pantalla solo tiene `style: 'cancel'` sin `onPress` — además se añadió `jest.useFakeTimers()`/`cleanup()` para controlar el intervalo de `TypewriterText` (saludo de la pantalla) y evitar fugas de timers entre tests.
- Limitaciones y pendientes: ninguna. No se añadió test automatizado de layout/posicionamiento absoluto (no viable con `@testing-library/react-native`); se verificó por revisión manual del diff, como ya estaba previsto en "Focos de revisión".

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente.
