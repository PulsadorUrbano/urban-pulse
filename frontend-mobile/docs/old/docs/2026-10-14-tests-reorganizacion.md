# Sesión — 2026-10-14 · Reorganización de tests en `src/__tests__/`

## Contexto

La doc oficial de Expo Router exige que `src/app/` contenga **solo rutas**. Hasta ahora los
tests vivían **colocados junto al código fuente** (`src/services/*.test.ts`,
`src/hooks/*.test.tsx`, …) y el test de la pantalla de nueva incidencia estaba dentro del
directorio de rutas (`src/app/incidents/new.test.tsx`): eso causó el **bug del bundle de ayer**
(Expo Router incluye todos los archivos de `src/app/` en el bundle, arrastrando
`@testing-library/react-native` y sus dependencias de Node).

## Decisión del usuario

Centralizar **todos** los tests en `src/__tests__/` replicando el árbol de `src/` (`app/`,
`components/`, `hooks/`, `services/`, `utils/`), con nombres descriptivos
`<módulo>.test.ts(x)` que digan qué es lo que prueban. Además se renombra
`new.test.tsx` → `new-incident-screen.test.tsx`.

## Movimientos (antes → después)

### `services/` (7)

| Antes | Después |
| --- | --- |
| `src/services/incident.service.test.ts` | `src/__tests__/services/incident.service.test.ts` |
| `src/services/photo-picker.test.ts` | `src/__tests__/services/photo-picker.test.ts` |
| `src/services/image.service.test.ts` | `src/__tests__/services/image.service.test.ts` |
| `src/services/device-location.test.ts` | `src/__tests__/services/device-location.test.ts` |
| `src/services/location.service.test.ts` | `src/__tests__/services/location.service.test.ts` |
| `src/services/storage.service.test.ts` | `src/__tests__/services/storage.service.test.ts` |
| `src/services/category.service.test.ts` | `src/__tests__/services/category.service.test.ts` |

### `hooks/` (3)

| Antes | Después |
| --- | --- |
| `src/hooks/use-photo-attachment.test.tsx` | `src/__tests__/hooks/use-photo-attachment.test.tsx` |
| `src/hooks/use-categories.test.ts` | `src/__tests__/hooks/use-categories.test.ts` |
| `src/hooks/use-create-incident.test.tsx` | `src/__tests__/hooks/use-create-incident.test.tsx` |

### `components/` (3)

| Antes | Después |
| --- | --- |
| `src/components/photo-picker.test.tsx` | `src/__tests__/components/photo-picker.test.tsx` |
| `src/components/location-toggle.test.tsx` | `src/__tests__/components/location-toggle.test.tsx` |
| `src/components/category-picker.test.tsx` | `src/__tests__/components/category-picker.test.tsx` |

### `utils/` (1)

| Antes | Después |
| --- | --- |
| `src/utils/incident-validator.test.ts` | `src/__tests__/utils/incident-validator.test.ts` |

### `app/` (1, movido y renombrado)

| Antes | Después |
| --- | --- |
| `src/__tests__/incidents/new.test.tsx` | `src/__tests__/app/incidents/new-incident-screen.test.tsx` |

> Total: **15 movimientos** (14 colocados reubicados + 1 renombrado con nombre descriptivo).

## Verificación

- [x] `npx expo lint` — sin errores.
- [x] `npx tsc --noEmit` — sin errores.
- [x] `npx jest --ci` — **15 suites / 108 tests** en verde.
- [x] Sin `*.test.*` fuera de `src/__tests__/` (comprobado con glob sobre `src/`).

## Regla a futuro (sincronizada con `AGENTS.md`)

- Todos los tests viven en **`src/__tests__/`** replicando el árbol de `src/`.
- Nombres descriptivos `<módulo>.test.ts(x)` (evitar `new.test.tsx`; usar
  `new-incident-screen.test.tsx`).
- **Prohibido** colocar tests en `src/app/`: Expo Router incluye todos los archivos del
  directorio de rutas en el bundle.
- Tests de pantallas en `src/__tests__/app/...` replicando la ruta de la pantalla.
