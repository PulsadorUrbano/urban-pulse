# 24-10-26 — Bug: UI desplazada hacia arriba, contenido superior oculto salvo scroll manual

- Feature afectada: independiente (afecta a varias pantallas, no a una sola feature).
- Rama: feature/ver-mis-incidencias-frontend-mobile.
- Última actualización: 2026-10-24.
- Estado: Corregido con verificación pendiente (ver sección "Confirmación").
- Origen: reporte de la usuaria ("Ya ocurre en diversidad de interfaces. La UI está demasiado para arriba, y hay info que no se ve, solo se ve si deslizas la pantalla para ver lo de arriba"). Generaliza y sustituye la entrada específica que había en `bugs/todo.md` bajo "## Registro incidencia" para `incidents/new.tsx` (23-10-26), ya que la usuaria confirma el mismo síntoma en más pantallas.

## Síntoma observado

En varias pantallas de la app, parte del contenido superior queda oculto o cortado (por ejemplo bajo el status bar, el notch/Dynamic Island, o el header nativo) y solo se hace visible deslizando manualmente la pantalla hacia arriba. La usuaria lo reporta como un problema recurrente en "diversidad de interfaces", no limitado a una sola pantalla.

Pantallas con `SafeAreaView` o `ScrollView` en `src/app/` que hay que revisar una por una (grep ya realizado por el organizador, diagnóstico exacto pendiente de confirmar por el dev archivo a archivo):

- `src/app/login.tsx` — usa `<SafeAreaView>` con los edges por defecto (incluyen `top`); no tiene header nativo (`headerShown: false`).
- `src/app/(tabs)/index.tsx` — usa `<SafeAreaView>` con los edges por defecto; sin header nativo visible.
- `src/app/(tabs)/my-incidents.tsx` — usa `<SafeAreaView>` con los edges por defecto; sin header nativo visible.
- `src/app/incidents/new.tsx` — usa `<SafeAreaView edges={['bottom','left','right']}>` (excluye explícitamente `top`); tiene header nativo visible (`title: 'Registrar incidencia'` en `src/app/_layout.tsx`). Esta era la pantalla de la entrada específica original en `bugs/todo.md`; aquí el síntoma reportado originalmente era que no se veía el placeholder gris del campo de título.
- `src/app/incidents/[id].tsx` — usa `<SafeAreaView edges={['bottom','left','right']}>` (excluye explícitamente `top`); tiene header nativo visible (`title: 'Detalle de la incidencia'` en `src/app/_layout.tsx`).

No se ha confirmado todavía si la causa es la misma en las 5 pantallas o si hay causas distintas por pantalla (p. ej. edges de `SafeAreaView` mal elegidos en unas, padding insuficiente bajo el header nativo en otras, o algún `contentContainerStyle`/`paddingTop` de un `ScrollView` interno). Eso es trabajo de diagnóstico pendiente.

## Diagnóstico

Diagnóstico anterior (investigación exhaustiva de un dev previo, sin dispositivo/simulador físico): no se encontró causa raíz reproducible a nivel de código en ninguna de las 5 pantallas (ver historial de commits del documento). Esa investigación descartó correctamente `SafeAreaProvider` ausente, edges de `SafeAreaView` mal elegidos y `ScrollView`/`FlatList` sin `flex-1`, pero no disponía de evidencia visual real para confirmar la causa.

**Causa raíz confirmada** (con evidencia: capturas de pantalla reales en iOS compartidas por la usuaria de `incidents/new.tsx` y `incidents/[id].tsx`):

- En ambas capturas, el primer elemento del `ScrollView` de la pantalla (en `incidents/new.tsx` el párrafo "Describe la incidencia urbana. El título es obligatorio..." de la línea 301-304; en `incidents/[id].tsx` el bloque de error/"Reintentar" de la línea 59-76) se renderiza fantasma/semitransparente por detrás y por encima del header nativo, solapando incluso con la status bar — el síntoma exacto de "contenido que solo se ve deslizando".
- `node_modules/expo-router/build/react-navigation/native-stack/views/useHeaderConfigProps.js:151`: `const usesNativeAppearance = Platform.OS === 'ios' && isLiquidGlassAvailable() && !isLegacyHeaderAppearanceEnabled();`. En Expo Router 58 (`package.json`: `"expo-router": "~58.0.25"`), en iOS 26+ con Liquid Glass disponible, el header nativo del `Stack` pasa a ser **translúcido y posicionado de forma absoluta por defecto** cuando no se define `headerBackground` — es decir, se superpone al contenido de la pantalla en vez de empujarlo hacia abajo. Esto rompe la asunción de `incidents/new.tsx` e `incidents/[id].tsx`, que usan `<SafeAreaView edges={['bottom','left','right']}>` confiando en que el header reserva el espacio superior — asunción válida antes de este cambio de SDK/iOS, y que la investigación anterior confirmó correctamente como "patrón recomendado" sin saber que el header había dejado de reservar ese espacio en iOS 26+.
- Documentación oficial de Expo (`https://docs.expo.dev/versions/v58.0.0/sdk/router/`): para restaurar el header opaco clásico (contenido renderizado debajo del header) hay que llamar a `enableLegacyHeaderAppearance()` una vez, a nivel de módulo, en el `_layout` raíz.
- `node_modules/expo-router/build/react-navigation/native-stack/views/headerAppearance.js`: `enableLegacyHeaderAppearance` se exporta desde el paquete `expo-router` (`export { enableLegacyHeaderAppearance } from 'expo-router'`), es una función sin parámetros que pone un flag interno a `true`; solo tiene efecto en iOS con Liquid Glass — en Android/web no cambia nada (`usesNativeAppearance` arriba solo evalúa `Platform.OS === 'ios'`).

- Alcance del fallo: confirmado para las pantallas con header nativo del `Stack` raíz (`incidents/new.tsx`, `incidents/[id].tsx`) en iOS 26+ con Liquid Glass.
- `(tabs)/my-incidents.tsx`: **pendiente de confirmar**, ver apartado dedicado más abajo.
- Si el fallo estuviera relacionado con el backend: no aplica — es un bug puramente de UI/layout en el frontend.

### `(tabs)/my-incidents.tsx` — pendiente de confirmación

La usuaria también reportó el síntoma en "Mis incidencias" (`src/app/(tabs)/my-incidents.tsx`), pero esta pantalla vive dentro del grupo `(tabs)`, que en `src/app/_layout.tsx` tiene `headerShown: false` (línea con `<Stack.Screen name="(tabs)" options={{ headerShown: false }} />`) — es decir, NO tiene header nativo del `Stack`, por lo que la causa raíz confirmada arriba (header translúcido/absoluto de Liquid Glass) no aplica aquí y no debería explicar un problema en esta pantalla.

Se ha revisado `src/app/(tabs)/my-incidents.tsx` (usa `<SafeAreaView>` con los edges por defecto, que incluyen `top`, igual que `login.tsx` y `(tabs)/index.tsx`) y `src/app/(tabs)/_layout.tsx` (solo renderiza `<AppTabs />`, el navegador de `NativeTabs`) sin encontrar una causa de código verificable específica de esta pantalla. No se aplica ningún cambio especulativo en `my-incidents.tsx` (regla de `CLAUDE.md`: sin ≥80% de confianza, no se adivina).

Hipótesis más plausible, a confirmar por la usuaria tras este fix: el síntoma percibido en "Mis incidencias" podría haber sido en realidad el mismo bug del header ocurriendo al entrar/salir de `incidents/[id].tsx` (navegación `router.push('/incidents/${id}')` desde esta pantalla), y no un defecto propio de `my-incidents.tsx`. Pendiente: reproducir de nuevo en "Mis incidencias" tras aplicar la corrección de abajo; si el síntoma persiste de forma aislada en esta pantalla, retomar el diagnóstico con evidencia visual nueva.

## Corrección aplicada

En `src/app/_layout.tsx` se importa `enableLegacyHeaderAppearance` desde `expo-router` y se llama una única vez a nivel de módulo (efecto de módulo, junto a `unstable_settings`, fuera del componente `RootLayout` y sin `useEffect`), antes de que se monte el primer `Stack.Screen` con header:

```ts
import { DarkTheme, DefaultTheme, enableLegacyHeaderAppearance, Stack, ThemeProvider } from 'expo-router';
// ...
export const unstable_settings = { initialRouteName: 'login' };

// En Expo Router 58, en iOS 26+ con Liquid Glass disponible, el header nativo
// del Stack pasa a ser translúcido y posicionado de forma absoluta por defecto,
// solapando el contenido de la pantalla en vez de empujarlo hacia abajo. Esto
// restaura el header opaco clásico (contenido renderizado debajo del header),
// que es el comportamiento que ya asumían `incidents/new.tsx` e
// `incidents/[id].tsx` (ver docs/spec/bugs/general/24-10-26-ui-desplazada-hacia-arriba.md).
enableLegacyHeaderAppearance();
```

Esta llamada restaura el comportamiento opaco clásico para TODAS las pantallas con header nativo del `Stack` (actuales y futuras: `incidents/new`, `incidents/[id]`), sin necesidad de tocar `incidents/new.tsx` ni `incidents/[id].tsx` ni añadirles padding manual. En Android/web no tiene efecto (solo actúa en iOS con Liquid Glass), por lo que no introduce riesgo de regresión en esas plataformas.

`(tabs)/my-incidents.tsx` no tiene header nativo (`headerShown: false`) y no se ha tocado; queda pendiente de reproducir tras este fix (ver apartado de diagnóstico de arriba).

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificado | `src/app/_layout.tsx` | Dev — llamada a `enableLegacyHeaderAppearance()` a nivel de módulo para restaurar el header opaco clásico en iOS 26+/Liquid Glass. |
| Actualizado (documentación) | `docs/spec/bugs/general/24-10-26-ui-desplazada-hacia-arriba.md` | Dev — diagnóstico confirmado con evidencia, corrección aplicada registrada, y `(tabs)/my-incidents.tsx` documentado como pendiente de confirmación. |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado en cada una de las 5 pantallas (capturas o descripción concreta de qué queda oculto). Confirmado con capturas reales en `incidents/new.tsx` e `incidents/[id].tsx`; `my-incidents.tsx` queda pendiente de reproducir de nuevo (ver diagnóstico).
- [x] Aplicar la corrección (`enableLegacyHeaderAppearance()` en `src/app/_layout.tsx`).
- [ ] Confirmar que el síntoma ya no ocurre en las 5 pantallas, sin necesidad de hacer scroll manual para ver el contenido superior. Pendiente de verificación visual en dispositivo/simulador real (no disponible en este entorno).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos.
- [ ] Tests en `src/__tests__/app/...` solo si aportan valor real (p. ej. verificar que `SafeAreaView` recibe los `edges` esperados en cada pantalla); no crear tests solo para registrar el bug en texto si no cubren nada verificable. Pendiente — responsabilidad del tester.

## Confirmación

- Estado final: Corregido con verificación pendiente.
- Fecha de revisión: 2026-10-24.
- Evidencia de que no reaparece:
  - Causa raíz confirmada con evidencia de código y documentación oficial: `node_modules/expo-router/build/react-navigation/native-stack/views/useHeaderConfigProps.js:151` (header translúcido/absoluto por defecto en iOS 26+ con Liquid Glass) y la documentación versionada de Expo Router 58 (`https://docs.expo.dev/versions/v58.0.0/sdk/router/`), que indica `enableLegacyHeaderAppearance()` como forma oficial de restaurar el header opaco clásico.
  - Corrección aplicada (`enableLegacyHeaderAppearance()` a nivel de módulo en `src/app/_layout.tsx`) verificada por el compiler: `npx tsc --noEmit` → 0 errores; `npx expo lint` → 0 errores (solo 2 warnings preexistentes no relacionados en `login-session-restore.test.tsx`); suite completa 33/33 suites y 448/448 tests sin regresiones, incluyendo los 3 tests nuevos de `src/__tests__/app/_layout.test.tsx` que verifican la llamada a `enableLegacyHeaderAppearance()`.
  - Diff acotado a `src/app/_layout.tsx`, `src/__tests__/app/_layout.test.tsx` (nuevo), `docs/spec/bugs/todo.md` y este documento; nada fuera de `frontend-mobile/`.
- Limitaciones y pendientes:
  - **Falta la confirmación visual real de la usuaria en dispositivo iOS físico.** El fix está verificado por código, tests, lint y typecheck, pero no se ha podido confirmar visualmente en un simulador/dispositivo dentro de este entorno (no hay simulador disponible para el agente). La usuaria confirmó el síntoma original con capturas reales en iOS; falta que confirme con el mismo método que el síntoma YA NO ocurre tras este fix en `incidents/new.tsx` e `incidents/[id].tsx`.
  - **`src/app/(tabs)/my-incidents.tsx` sigue sin diagnosticar.** Esta pantalla no tiene header nativo del `Stack` (`headerShown: false`), por lo que la causa raíz confirmada arriba no debería aplicarle; no se encontró ninguna causa de código verificable específica de esta pantalla y no se tocó. Queda abierto si el síntoma reportado por la usuaria en "Mis incidencias" era en realidad el mismo bug percibido al navegar hacia/desde `incidents/[id].tsx` (hipótesis más plausible) o si es una causa distinta aún sin diagnosticar. Pendiente: reproducir de nuevo en esta pantalla tras el fix; si persiste de forma aislada, retomar el diagnóstico con evidencia visual nueva.
