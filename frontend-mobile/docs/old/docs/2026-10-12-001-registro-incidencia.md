# Sesión — 2026-10-12 · Feature 001 · Registro de incidencia

## Contexto

Primera feature funcional del `frontend-mobile`. Se parte de un proyecto Expo con las tabs de
ejemplo (`index`, `explore`), `db.json` vacío y las carpetas `src/services` y `src/types` vacías.

## Hallazgos relevantes

- **NativeWind instalado pero sin configurar** (faltan `babel.config.js`, `metro.config.js`,
  `tailwind.config.js` y directivas `@tailwind` en `global.css`). `className` no tiene efecto;
  el repo usa `StyleSheet`. Decisión: mantener `StyleSheet` + tokens de tema.
- **Baseline `npx tsc --noEmit` con 2 errores** por imports de `.css` sin declaración de tipos.
- **`npx expo lint` no estaba configurado**: instaló `eslint` + `eslint-config-expo` y creó
  `eslint.config.js`.

## Cambio de arquitectura de navegación

NativeTabs no puede empujar pantallas, así que se adopta el patrón canónico de Expo Router:
`Stack` raíz + grupo `(tabs)`. La pantalla `/incidents/new` se empuja sobre las tabs.

## Checklist de la sesión

- [x] Scaffolding de spec (`spec.md`, `plan.md`, `tasks.md`).
- [x] Actualizar `spec/constitution/roadmap.md`.
- [x] Actualizar `AGENTS.md` con la nueva estructura de navegación.
- [x] Implementar types, config, `db.json`, service, hook, validator.
- [x] Reorganizar navegación y crear la pantalla de registro.
- [x] Pasar `npx expo lint` + `npx tsc --noEmit`.
- [x] Añadir y ejecutar tests (18 tests / 3 suites, en verde).
- [x] Mover la feature a "Hecho" en el roadmap.

> Detalle granular en `spec/features/001-registro-incidencia/tasks.md`.

## Infraestructura (misma sesión)

- **NativeWind configurado** (v4.2.7, compatible con Expo SDK 57 + Tailwind 3):
  `babel.config.js` (preset `nativewind/babel` + `jsxImportSource`), `metro.config.js`
  (`withNativeWind`, input `./src/global.css`), `tailwind.config.js` (preset de NativeWind,
  content `./src/**`), directivas `@tailwind` en `src/global.css`, `nativewind-env.d.ts` y
  `web.bundler: "metro"` en `app.json`. NativeWind añadió `nativewind-env.d.ts` al `include` de
  `tsconfig.json`. Verificado con `npx expo export --platform web` (genera CSS de NativeWind).
- **`opencode.json` corregido**: los permisos `edit` se evaluaban relativo a la raíz del workspace
  (`urbanPulse`), por lo que `src/*`/`db.json` no hacían match con `frontend-mobile/...` y los
  subagentes no podían usar `edit`/`write`. Ahora `developer` puede editar dentro de
  `frontend-mobile/**` y `tester` los `*.test.*`. **Requiere reiniciar opencode** para aplicar.
- **Pendiente**: migrar los componentes existentes de `StyleSheet` a `className` (en el backlog).
