# NativeWind: migración pendiente de componentes a `className`

> Estado: **en curso** (iniciada el 2026-10-14). Documento de seguimiento del refactor
> `StyleSheet.create` → `className`. No es una feature de usuario: es deuda técnica de UI.

## Contexto

- NativeWind **4.2.7** está configurado y operativo en el proyecto: `babel.config.js`,
  `metro.config.js`, `tailwind.config.js`, `global.css` con directivas `@tailwind` y
  `nativewind-env.d.ts` (ver "Infra · NativeWind configurado" en el roadmap).
- La UI histórica de la feature 001 (y sus componentes compartidos) usa `StyleSheet.create`.
- La convención vigente de `AGENTS.md` es estilar con `className` (NativeWind), así que el
  código existente se migra de forma incremental.
- **El 2026-10-14 se migran los primeros 3 archivos**, dentro del cambio de UI del footer:
  - `src/app/incidents/new.tsx`
  - `src/components/photo-picker.tsx`
  - `src/components/location-toggle.tsx`

## Convención híbrida adoptada (2026-10-14)

Para conservar los temas claro/oscuro durante la migración:

- `className` (NativeWind) para **layout, espaciado, bordes, radios y overlay**, y
  `active:opacity-70` para el estado de pulsado.
- `ThemedText` / `ThemedView` / `useTheme` **solo para colores semánticos de tema** e iconos.
- `style={{ ... }}` inline **mínimo**, solo para valores dinámicos de tema y tamaños que vienen
  de constantes exportadas (p. ej. `LOCATION_TOGGLE_SIZE`, `PHOTO_TILE_SIZE`).

## Checklist PENDIENTE (migrar de `StyleSheet` a `className`)

Lista real re-verificada el 2026-10-14 (cierre de ciclo) con
`grep -rn "StyleSheet" src --include="*.tsx" --include="*.ts"` (excluido `src/__tests__/`):
las únicas coincidencias son los 4 archivos de abajo. Los 3 archivos migrados hoy ya no
aparecen en el grep:

- [ ] `src/components/themed-text.tsx`
- [ ] `src/components/category-picker.tsx`
- [ ] `src/components/app-tabs.web.tsx`
- [ ] `src/app/(tabs)/index.tsx`

## Progreso

- **3 archivos migrados el 2026-10-14** (ciclo del footer cerrado y verificado con lint + tsc
  + jest):
  - `src/app/incidents/new.tsx`
  - `src/components/photo-picker.tsx`
  - `src/components/location-toggle.tsx`
  - Verificación: `npx expo lint` y `npx tsc --noEmit` sin errores; `npx jest --ci` con
    **15 suites / 110 tests** en verde. Sin setup adicional de Jest.

Verificados y **sin `StyleSheet`** (sin migración pendiente por ese criterio):

- `src/components/themed-view.tsx` — solo un `style` inline con el color de fondo del tema.
- `src/components/app-tabs.tsx` — usa props de `NativeTabs`, sin estilos propios.
- `src/app/(tabs)/_layout.tsx` y `src/app/_layout.tsx` — sin estilos.

## Notas

- Consultar la documentación de **NativeWind v4** antes de migrar cada archivo (las utilidades
  y los estados de pulsado como `active:` tienen sintaxis propia; no fiarse de la memoria).
- Verificar el **setup de Jest** si algún test pierde los estilos: los tests existentes en
  `src/__tests__/` (incluidos los que usan `toHaveStyle`) deben seguir pasando tras cada
  migración (`npx jest --ci`).
- Cada archivo migrado se da por terminado solo con `npx expo lint` y `npx tsc --noEmit` en
  verde.

## Trazabilidad

- Estado en el roadmap: `spec/constitution/roadmap.md` → Backlog → "Migrar componentes a
  NativeWind".
- Nota de sesión del primer tramo: `docs/2026-10-14-001-footer-nativewind.md`.
