# Auditoría — 2026-10-12 · Limpieza del template de Expo

**Objetivo:** eliminar el contenido de demostración de la plantilla de Expo que ya no interesa,
dejando solo la infraestructura real de UrbanPulse. Registro de auditoría (no se toca `spec/`).

## Eliminado

### Pantallas demo
- `src/app/(tabs)/explore.tsx` — pantalla de docs de Expo (tab Explore retirado).

### Componentes demo
- `src/components/animated-icon.tsx` — logo Expo animado + `AnimatedSplashOverlay`.
- `src/components/animated-icon.web.tsx`
- `src/components/animated-icon.module.css`
- `src/components/hint-row.tsx`
- `src/components/web-badge.tsx` — badge de versión de Expo.
- `src/components/external-link.tsx` — enlace a docs con navegador in-app.
- `src/components/ui/collapsible.tsx` — acordeón de la demo (carpeta `src/components/ui/` eliminada).

### Assets demo
- `assets/images/expo-logo.png`, `assets/images/logo-glow.png`
- `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`
- `assets/images/tutorial-web.png`
- `assets/images/expo-badge.png`, `expo-badge-white.png`
- `assets/images/tabIcons/explore.png`, `explore@2x.png`, `explore@3x.png` (tab retirado)

### Scripts
- `scripts/reset-project.js` (carpeta `scripts/` eliminada) y el script `reset-project` de `package.json`.

## Modificado

- `src/app/(tabs)/index.tsx` — reescrito: Home limpia de UrbanPulse (título + descripción + botón
  "Registrar incidencia"). Ya no usa `AnimatedIcon`/`HintRow`/`WebBadge`/`expo-device`.
- `src/components/app-tabs.tsx` — tab Explore retirado; queda solo la sección Home (label "Inicio").
- `src/components/app-tabs.web.tsx` — retirados la marca "Expo Starter", el enlace a Docs y
  `ExternalLink`/`SymbolView`; ahora usa solo `ThemedText`/`ThemedView`.
- `src/app/_layout.tsx` — retirado `AnimatedSplashOverlay` y `SplashScreen.preventAutoHideAsync()`
  (el splash vuelve al comportamiento por defecto).
- `package.json` — eliminado el script `reset-project`.
- `README.md` — vaciado (se decidió dejarlo vacío por ahora).

## Conservado (infraestructura real)

- Componentes base: `themed-text.tsx`, `themed-view.tsx`, `app-tabs.tsx`, `app-tabs.web.tsx`.
- Hooks: `use-theme.ts`, `use-color-scheme.ts`, `use-color-scheme.web.ts`.
- `constants/theme.ts`, `src/global.css`, `nativewind-env.d.ts` y configs de NativeWind
  (`babel.config.js`, `metro.config.js`, `tailwind.config.js`).
- Iconos de aplicación (placeholders de Expo): `icon.png`, `splash-icon.png`, `favicon.png`,
  `android-icon-*`, `assets/expo.icon/`.
- `assets/images/tabIcons/home*.png`.

## Notas

- **Dependencias no podadas** (decisión del usuario): `expo-device`, `expo-web-browser`,
  `expo-symbols`, `expo-image`, `@expo/ui` y `expo-glass-effect` ya no se usan en `src/`, pero
  permanecen instaladas para no arriesgar peers de `expo-router`.
- Los iconos de app siguen siendo los placeholders de Expo hasta definir identidad propia.

## Verificación

- `npx tsc --noEmit` → OK.
- `npx expo lint` → OK.
- `npx jest --ci` → 18/18 tests OK.
- `npx expo export --platform web` → OK. El bundle JS bajó de ~2.2 MB a ~1.2 MB y desapareció la
  ruta `/explore` (quedan `/`, `/(tabs)`, `/incidents/new`, `/_sitemap`, `/+not-found`).
