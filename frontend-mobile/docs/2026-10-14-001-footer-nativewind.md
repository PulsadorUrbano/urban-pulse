# Sesión — 2026-10-14 · Cambio de UI: footer sin solape + primeros pasos de NativeWind

## Contexto

El usuario pidió un ajuste de UI en la pantalla de registro (`src/app/incidents/new.tsx`): el
botón **Enviar** y el **toggle de ubicación** no deben solaparse. En el layout anterior el FAB
de ubicación flotaba en capa superior (`zIndex`/`elevation`) justo encima del footer fijo y
podía tapar el botón.

Aprovechando el cambio se **arranca la migración a NativeWind**: los 3 archivos tocados pasan
de `StyleSheet.create` a `className`, siguiendo la convención de `AGENTS.md`. La migración de
los componentes restantes queda documentada en
`spec/refactor/infra/nativewind-migracion-pendiente.md`.

## Cambios

- **Footer fijo en fila horizontal, sin FAB absoluto**: el footer pasa a ser una fila con el
  botón Enviar (`flex-1`) a la izquierda y el toggle de ubicación (56 dp,
  `LOCATION_TOGGLE_SIZE`) a la derecha. Se elimina el FAB flotante en capa superior y la
  constante `FOOTER_BUTTON_HEIGHT` (ya no hay que reservar espacio bajo un FAB).
- **Convención híbrida `className`** (para conservar el tema claro/oscuro):
  - `className` para layout, espaciado, bordes, radios y overlay, y `active:opacity-70` para el
    estado de pulsado.
  - `ThemedText`/`ThemedView`/`useTheme` solo para colores semánticos de tema e iconos.
  - `style` inline mínimo, solo para valores dinámicos de tema y tamaños de constantes
    exportadas.
- **Archivos migrados a `className` en esta sesión:**
  - `src/app/incidents/new.tsx` — footer en fila + estilos de la pantalla.
  - `src/components/photo-picker.tsx` — tiles, recuadro discontinuo y overlay.
  - `src/components/location-toggle.tsx` — botón circular, línea diagonal y pulsado.

## Pendiente

- Resto de la migración a NativeWind → checklist en
  `spec/refactor/infra/nativewind-migracion-pendiente.md` (archivos que aún usan `StyleSheet`:
  `themed-text.tsx`, `category-picker.tsx`, `app-tabs.web.tsx` y `(tabs)/index.tsx`).

## Verificación (COMPLETADA ✅)

Ciclo de orquestación cerrado (developer → compiler-checker → tester) con estos resultados
reales:

- [x] `developer`: aplicó el cambio de footer y la migración a `className` en los 3 archivos.
- [x] `compiler-checker`: `npx expo lint` y `npx tsc --noEmit` sin errores.
- [x] `tester`: `npx jest --ci` con todas las suites en verde — **15 suites / 110 tests
      pasando**, incluidos los que usan `toHaveStyle`.
- [x] `planner`: nota actualizada con los resultados reales y casillas marcadas.

> Sin setup adicional de Jest: la infraestructura existente cubre la migración a `className`
> sin cambios de configuración.

### Incidencias del ciclo

Durante la ejecución el `tester` detectó **dos regresiones** introducidas por el `developer`
en `src/components/photo-picker.tsx`, ambas **revertidas** antes del cierre:

1. **Texto "Recomendado" eliminado del tile de "Añadir imagen"**: el tile volvió a mostrar
   "Añadir imagen" + "Recomendado" como en la versión anterior.
2. **Encabezado cambiado a "Imágenes (recomendado)"**: se restauró el texto original
   "Fotos (opcional)".

Tras las reversiones, lint, tsc y las 15 suites de Jest quedaron en verde.
