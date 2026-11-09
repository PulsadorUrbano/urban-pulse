# 2026-10-23 — Especificación: Logout: botón discreto en la esquina superior izquierda

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: feature/logout-frontend-mobile.
- Última actualización: 2026-10-23.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: petición explícita del usuario para añadir un punto de entrada de UI para cerrar sesión, con diseño ya validado y aprobado antes de esta especificación.

## Objetivo y decisiones vigentes

`frontend-mobile` no tiene hoy ningún punto de entrada en la UI para cerrar sesión: la lógica (`useSession().signOut()`) existe y funciona, pero no hay ningún control que la dispare. Esta feature añade un botón circular discreto en la esquina superior izquierda de la única pantalla de tab (`Home`) que, tras pedir confirmación, cierra la sesión activa y lleva a la ciudadanía de vuelta al login.

- Alcance confirmado:
  - Un nuevo componente presentacional `LogoutButton` (icono de logout, 44dp, circular).
  - Su integración en `src/app/(tabs)/index.tsx`, posicionado de forma absoluta en la esquina superior izquierda, respetando los insets del área segura.
  - Confirmación obligatoria vía `Alert.alert` antes de cerrar sesión.
  - Al confirmar: limpiar la sesión en memoria y el token persistido (reutilizando `signOut()`) y navegar a `/login`.
- Decisiones confirmadas:
  - La lógica de negocio del logout (`useSession().signOut()` en `src/hooks/use-session.ts`, que a su vez llama a `clearToken()` en `src/services/token-storage.service.ts` vía `expo-secure-store`) **ya existía antes de esta feature, funciona y está testeada** (cubierta por `token-storage.service.test.ts`). Esta feature NO la modifica, NO la re-implementa y NO le añade tests nuevos: únicamente añade el disparador visual que la invoca.
  - El botón vive dentro de la propia pantalla `src/app/(tabs)/index.tsx`, posicionado de forma absoluta, y NO en `options.headerLeft` del `Stack` raíz. Motivo: `(tabs)` se registra con `headerShown: false` en `src/app/_layout.tsx` y la pantalla usa `NativeTabs` (`expo-router/unstable-native-tabs`); las pestañas nativas no tienen header propio ni stack sobre ellas, así que `headerLeft` no es viable para ninguna pantalla dentro de `(tabs)`.
  - El componente `LogoutButton` es presentacional puro: recibe `onPress` por props y no llama a `useSession()` él mismo (mismo patrón que `LocationToggle`), para mantenerlo testeable de forma aislada.
  - Colores del botón: `theme.backgroundElement` de fondo y `theme.text` para el icono (colores de tema, no fijos). A diferencia de `LocationToggle` (colores fijos porque es un control que debe destacar), este es un control secundario que debe fundirse con el fondo y no competir visualmente con el botón principal "Registrar incidencia".
  - No se deshabilita el botón ni se gestiona un estado de carga explícito durante `signOut()`: el `Alert` nativo ya bloquea la interacción hasta resolverse, y `signOut()` pone `user` a `null` de forma síncrona, por lo que el siguiente render ya cumple el guard existente `if (!user) return <Redirect href="/login" />` y desmonta la pantalla (y el botón) de inmediato.
  - `router.replace('/login')` tras `signOut()` es redundante con el `<Redirect>` ya existente, pero se mantiene intencionadamente como red de seguridad simétrica al patrón ya usado en `login.tsx` (`router.replace('/')` tras `signIn`).
- Suposiciones por validar: ninguna; el diseño fue validado y aprobado explícitamente por el usuario antes de redactar esta especificación.
- Fuera de alcance:
  - Cualquier cambio en `src/hooks/use-session.ts` o `src/services/token-storage.service.ts` (se reutilizan sin tocarlos).
  - Cualquier llamada de red, endpoint de backend o simulación mock (ver "Contrato de datos").
  - Pantallas de gestión del ayuntamiento/personal (fuera del alcance general de la app, ver CLAUDE.md).
  - Tests para `use-session.ts`: su contraparte simétrica `useLogin` tampoco tiene test propio en el repo, y su único efecto observable (`clearToken`) ya está cubierto en `token-storage.service.test.ts`; el test de integración de la pantalla lo ejercita de extremo a extremo.

## Contexto verificado

- Implementación actual:
  - `src/app/(tabs)/index.tsx`: pantalla `HomeScreen`, única tab existente. Hace `const { user } = useSession()`, redirige a `/login` si `!user`, y renderiza un `<ThemedView style={styles.container}>` que contiene un `<SafeAreaView style={styles.safeArea}>` (con `maxWidth: MaxContentWidth` y centrado por `container` con `flexDirection: 'row', justifyContent: 'center'`) con el saludo y el botón "Registrar incidencia". No tiene hoy ningún control de logout.
  - `src/hooks/use-session.ts`: expone `{ user, token, signIn, signOut }` vía `SessionContext`. `signOut` ya hace `setUser(null)`, `setToken(null)` y `await clearToken()` dentro de un `try/catch` que no relanza (un fallo al limpiar el almacenamiento no impide cerrar sesión).
  - `src/services/token-storage.service.ts`: `clearToken()` ya llama a `SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY)`. Ya testeado en `token-storage.service.test.ts` (no leído línea a línea en esta sesión, pero referenciado como cobertura existente y confirmado por el usuario).
  - `src/app/_layout.tsx`: `Stack` raíz con `Stack.Screen name="login"`, `Stack.Screen name="(tabs)"` (ambas con `headerShown: false`) y `Stack.Screen name="incidents/new"`.
  - `src/app/incidents/new.tsx`: ya usa el patrón de posicionamiento absoluto con `useSafeAreaInsets()` sumado a mano a `Spacing` (footer fijo con `insets.bottom + Spacing.three` y `elevation: 10` + `className="z-10"` para Android) y el patrón de confirmación con `Alert.alert(título, mensaje, [{text:'Cancelar', style:'cancel'}, {text:..., style:'destructive', onPress:...}])`.
  - `src/app/login.tsx`: tras un login correcto, hace `await signIn(...)` seguido de `router.replace('/')` — patrón de referencia para `router.replace('/login')` tras `signOut()`.
  - `src/components/location-toggle.tsx`: componente presentacional circular de referencia (`Pressable` con `accessibilityRole`, `accessibilityLabel`, tamaño exportado como constante, `className="active:opacity-70"`, prop `style` para posicionamiento externo).
- Contratos y referencias del dominio: no aplica contrato de backend/mock (ver "Contrato de datos").
- Configuración y dependencias disponibles: `expo-router` (`Redirect`, `router`), `react-native-safe-area-context` (`SafeAreaView`, `useSafeAreaInsets`), `@expo/vector-icons/MaterialIcons`, `expo-secure-store` (ya usado por `token-storage.service.ts`) — todas ya instaladas y en uso en el repo; no se añade ninguna dependencia nueva.
- Diferencia entre estado actual y propuesto: hoy no existe ningún control de UI para cerrar sesión; tras esta feature, `HomeScreen` expone un botón circular en la esquina superior izquierda que, con confirmación, invoca la lógica de logout ya existente.

## Contrato de datos (backend real + mock)

Esta feature no consume ni simula ningún endpoint. El cierre de sesión es una operación 100% local/cliente: `signOut()` solo modifica estado en memoria (`setUser(null)`, `setToken(null)`) y borra el token persistido en el almacén seguro del dispositivo (`expo-secure-store`, vía `clearToken()`). No hay ninguna llamada de red, ni a backend real ni a `json-server`/mock, implicada en el logout. No aplica, por tanto, ninguna de las subsecciones de "Backend real" ni "Mock".

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/` (Expo Router): `src/app/(tabs)/index.tsx` (ruta `/`, tab `Home`, única tab existente en el proyecto).
- Ubicación: tab dentro de `(tabs)/`. El botón no vive en `options.headerLeft` del Stack raíz porque `(tabs)` se registra con `headerShown: false` y usa `NativeTabs` (`expo-router/unstable-native-tabs`), que no tiene header nativo ni stack propio sobre las tabs — no hay ningún `headerLeft` disponible para pantallas dentro de `(tabs)`. El botón se implementa, por tanto, como un elemento posicionado de forma absoluta dentro de la propia pantalla.
- Componentes nuevos vs. reutilizados:
  - Nuevo: `src/components/logout-button.tsx` (`LogoutButton`).
  - Reutilizados sin modificar: `ThemedView`, `useSession` (hook completo, ya existente), `useTheme` (si se usa para acceder a `theme.backgroundElement`/`theme.text`), `useSafeAreaInsets`/`SafeAreaView` de `react-native-safe-area-context`, `Alert` y `router` de `react-native`/`expo-router`.
- Estados explícitos de carga/error: no aplica un estado de carga dedicado. El `Alert.alert` nativo ya bloquea cualquier doble pulsación mientras está abierto (no se puede interactuar con el botón bajo el diálogo), y una vez confirmado, `signOut()` desmonta la pantalla casi de inmediato vía el guard `if (!user) return <Redirect href="/login" />` ya existente, lo que hace innecesario un `isLoggingOut` adicional. No hay mensajes de error de UI: si `clearToken()` falla, el propio `signOut()` ya lo absorbe en su `try/catch` sin relanzar (comportamiento ya existente, no tocado por esta feature).

## Tipos y datos mock

No se introduce ningún tipo nuevo en `src/types/` ni ninguna entidad o campo en `db.json`. Se reutilizan `User` y `AuthToken` (ya existentes, consumidos por `SessionContextValue`) sin ninguna modificación. `LogoutButtonProps` (definida en el propio componente, no en `src/types/`, siguiendo el patrón de `LocationToggleProps`) es el único contrato nuevo:

| Tipo nuevo o reutilizado (src/components/logout-button.tsx) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `LogoutButtonProps` (nuevo, local al componente) | `onPress: () => void`; `style?: StyleProp<ViewStyle>` | `onPress` obligatorio (lo construye la pantalla con `signOut` + `router.replace`); `style` opcional, sin valor por defecto, solo lo usa la pantalla para el posicionamiento absoluto. |

- Estrategia de medios: no aplica; esta feature no adjunta ni gestiona ninguna imagen.
- Almacenamiento de esta fase: no aplica mock ni backend real; el único almacenamiento implicado es `expo-secure-store` (ya existente, gestionado íntegramente por `token-storage.service.ts`, sin cambios).
- Ciclo de vida: no aplica persistencia en `db.json` ni en memoria del backend; `user`/`token` siguen viviendo solo en memoria del cliente (se pierden al cerrar la app, tal como ya documenta `use-session.ts`), y el token persistido en `expo-secure-store` se borra al confirmar el logout.

## Diseño mínimo

- **Componente nuevo `src/components/logout-button.tsx`:**
  - Control presentacional circular de **44dp** (constante exportada `LOGOUT_BUTTON_SIZE = 44`), con icono `MaterialIcons name="logout"` de 22dp.
  - Fondo `theme.backgroundElement`, icono con color `theme.text` (vía `useTheme()` o recibiendo el color por props, decisión de implementación del dev; debe quedar documentada en el plan).
  - `accessibilityRole="button"`, `accessibilityLabel="Cerrar sesión"`, feedback de pulsación con `active:opacity-70` vía `className` (mismo patrón que `LocationToggle`).
  - Props: `onPress: () => void` (obligatoria) y `style?: StyleProp<ViewStyle>` (opcional, para que la pantalla inyecte el posicionamiento absoluto sin que el componente conozca su propia ubicación).
  - No llama a `useSession()` ni a `Alert` él mismo: es un control "tonto", la pantalla le pasa el callback ya resuelto.
- **Wiring en `src/app/(tabs)/index.tsx`:**
  - Añadir `signOut` a la desestructuración de `useSession()`.
  - Importar `useSafeAreaInsets` de `react-native-safe-area-context` (ya se importa `SafeAreaView` del mismo paquete) y `Alert` de `react-native`.
  - Renderizar `<LogoutButton>` como hermano de `<SafeAreaView>`, dentro de `<ThemedView style={styles.container}>`, después de ella en el JSX — nunca dentro de `safeArea`: `safeArea` tiene `maxWidth: MaxContentWidth` y queda centrada por `container` (`flexDirection: 'row', justifyContent: 'center'`), así que en pantallas anchas su borde izquierdo no coincide con el borde físico de la pantalla; `container` sí ocupa todo el ancho, así que anclar el botón ahí sitúa la esquina real en cualquier tamaño de pantalla.
  - Posición: `position: 'absolute'`, `top: insets.top + Spacing.two`, `left: insets.left + Spacing.three` (los insets se suman a mano porque `position: 'absolute'` ignora el padding del padre, igual que ya hace `incidents/new.tsx` con `insets.bottom` para su footer fijo). Añadir `zIndex`/`elevation` equivalentes al patrón ya usado por ese mismo footer (`className="z-10"` + `elevation: 10` inline en Android).
  - Confirmación: `Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', style: 'destructive', onPress: handleConfirmLogout }])`, mismo orden y estilo que el patrón ya usado en `incidents/new.tsx`.
  - `handleConfirmLogout` es `async () => { await signOut(); router.replace('/login'); }`, pasado directo como referencia al `onPress` de `LogoutButton` (mismo patrón que `handleSubmit` en `login.tsx`).
- No se añaden capas especulativas: no hay validación de formulario (Zod no aplica, no hay input de usuario en este flujo) ni `FlatList` (no hay listas dinámicas implicadas).

## Criterios de aceptación

1. Al pulsar el botón de logout se muestra un `Alert.alert` con título "Cerrar sesión" y los dos botones "Cancelar"/"Cerrar sesión" (destructivo), antes de ejecutar cualquier efecto.
2. Pulsar "Cancelar" no tiene ningún efecto observable: no se llama a `clearToken()` (ni, por tanto, a `signOut()`) ni a `router.replace`; la sesión permanece activa y la pantalla sigue montada.
3. Pulsar "Cerrar sesión" invoca `signOut()` (que limpia `user`/`token` en memoria y llama a `clearToken()` una única vez) y navega a `/login` mediante `router.replace('/login')`.
4. El botón nunca es alcanzable con `user === null`: el guard ya existente `if (!user) return <Redirect href="/login" />` se evalúa antes de montar cualquier parte del árbol de `HomeScreen`, incluido el botón, por lo que no puede pulsarse sin sesión activa.
5. No se modifica ni se re-testea `src/hooks/use-session.ts` ni `src/services/token-storage.service.ts`: su comportamiento (incluida la tolerancia a fallos de `clearToken()` dentro de `signOut()`) se conserva intacto y sin tests adicionales, documentado explícitamente como decisión de esta especificación.

## Estrategia de verificación

- `src/__tests__/components/logout-button.test.tsx` (nuevo, mirror de `location-toggle.test.tsx`): verifica `accessibilityLabel`/`accessibilityRole` correctos y que pulsar el botón llama a `onPress` exactamente una vez.
- `src/__tests__/app/tabs/home-screen-logout.test.tsx` (nuevo, primer test de esta pantalla): test de integración real de `HomeScreen` salvo límites externos (`@/global.css`, `@expo/vector-icons/MaterialIcons`, `react-native-safe-area-context` con insets a cero, `expo-router` con `router.replace` espiado y un stub de `Redirect` que devuelve `null`, y `@/services/token-storage.service` con `saveToken`/`loadToken`/`clearToken` mockeados, por ser la frontera real con `SecureStore`). `useSession`/`SessionProvider` corren con su implementación real, partiendo de una sesión activa (`signIn` antes de cada test). Reutiliza el helper `pressLastAlertButton` copiado de `new-incident-screen.test.tsx` (el repo no tiene hoy un test-utils compartido). Casos: pulsar el botón muestra el `Alert` con título "Cerrar sesión"; pulsar "Cancelar" no llama a `clearToken` ni a `router.replace`; pulsar "Cerrar sesión" llama a `clearToken` una vez y a `router.replace('/login')`.
- No se crea `use-session.test.ts` (ver "Decisiones confirmadas" y "Fuera de alcance").

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e/integración salvo los dos tests de integración ya descritos arriba (ambos solicitados explícitamente en el diseño aprobado). Esta feature no implica ninguna llamada de red real ni simulada, por lo que no aplica la distinción entre "contrato documentado" y "backend responde correctamente".

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
