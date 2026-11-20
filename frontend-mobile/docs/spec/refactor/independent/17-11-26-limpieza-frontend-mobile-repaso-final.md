# 17-11-26 — Refactor: limpieza frontend-mobile · repaso final

- Feature afectada: independiente (auditoría transversal de todo `frontend-mobile/`).
- Rama: `refactor/182-limpieza-frontend-mobile`.
- Última actualización: 2026-11-17.
- Estado: Implementado y verificado (verificación manual en dispositivo/Expo Go confirmada por la usuaria el 2026-11-17).
- Fases previas: [alta](./17-11-26-limpieza-frontend-mobile-alta.md), [media](./17-11-26-limpieza-frontend-mobile-media.md) y [baja](./17-11-26-limpieza-frontend-mobile-baja.md).

## Motivo

Revisión final de `frontend-mobile/` tras cerrar las 3 fases de limpieza (alta, media y baja). Se buscaron incoherencias residuales con `CLAUDE.md`, código muerto, dependencias sin uso, duplicaciones de UI y tests, y se corrigieron además los bugs registrados en `docs/spec/bugs/todo.md` que afectaban a archivos ya tocados (doble envío, promesas sin `catch`, padding y `maxLength` de `category-picker`, props sin efecto de `ThemedView`) y una condición de carrera en tres hooks. Esos arreglos de comportamiento se documentan aquí por trazabilidad y se marcan como resueltos en `todo.md`.

## Alcance

- Alcance confirmado, por lotes:
  - **Lote 1 (config, tipos, servicios, dependencias):** `src/constants/messages.ts` nuevo; paletas fijas en `theme.ts`; ajustes de `config.ts`, `package.json` y `app.json`; eliminación de 4 dependencias sin uso (con aprobación de la usuaria); límite de errores de ruta con `ErrorBoundary`; servicios (`requestLocationPermission`, `token.service`, mensajes "pnpm run mock", constantes de mensaje en `incident.service`, TODO de `lockout.service` trasladado); tipos (`Incident` y `TokenPayload` eliminados, `UserBase.role` como `UserRole`, `IncidentBase`/`IncidentLocation` compartidos, `usernameOrEmail`).
  - **Lote 2 (hooks, componentes, utilidades):** carrera corregida con `isActive` local por efecto en `use-my-incidents`, `use-incident-detail` y `use-categories`; `use-my-incidents` deriva `isLoading`; `backendFallbackNotice` en `use-categories`; doble envío y promesas sin `catch` en `use-incident-location-submit` (con `isSubmittingRef` y `submitErrorMessage`); protección de desmontaje en `use-photo-attachment`; ajustes de `incident-list-item`, `location-toggle`, badge, medidor, `photo-picker`, `themed-text`, `themed-view`, `category-picker`, `country-code-picker`, `incident-photo-viewer` y `app-tabs.web`; utilidades `phone.ts`, `password-strength` e `incident-validator`.
  - **Lote 3 (pantallas):** `primary-button.tsx` nuevo, color de error unificado con `ThemedText themeColor="error"`, `MaxContentWidth` en login y avisos con `MOCK_FALLBACK_NOTICE`.
  - **Lote 4 (tests):** limpieza de mocks duplicados, colores vía `Colors`, `jest.mocked`, `requireActual` en `login-session-restore.test` y test nuevo de `fallback-notice-card`.
- Fuera de alcance: `backend/` y `database/` (solo lectura); validar el teléfono en el registro (feature pendiente); `pnpm expo install --fix` (requiere aprobación); `as jest.MockedFunction<...>` cosmético en algunos tests de `src/__tests__/app/`.
- Comportamiento preservado: la UI se ve y funciona igual salvo los arreglos explícitos de bugs (doble envío bloqueado, error de envío visible en pantalla, padding simétrico del trigger de categorías, categoría personalizada limitada a 15 caracteres, hoja de categorías/países con scroll acotado al 80 % de altura y tarjeta de `incident-list-item` con fondo de tema).

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | `src/constants/messages.ts` | `MOCK_FALLBACK_NOTICE` y `BACKEND_FALLBACK_NOTICE`. |
| Crear | `src/components/route-error-fallback.tsx` (+ test) | Pantalla de error de ruta usada por el `ErrorBoundary` de `src/app/_layout.tsx`. |
| Crear | `src/components/primary-button.tsx` (+ test) | Botón primario que sustituye 4 copias. |
| Crear | `jest.setup.ts` | Mocks centralizados de `global.css` y MaterialIcons (`jest.setupFiles`). |
| Crear | `src/__tests__/components/fallback-notice-card.test.tsx` | Test de `FallbackNoticeCard`. |
| Modificar | `src/constants/theme.ts`, `src/constants/config.ts` | Paletas `IncidentStatusColors`/`PasswordStrengthColors`; log con `BACKEND_API_URL`, comentario corregido, "pnpm run". |
| Modificar | `package.json`, `app.json`, `pnpm-lock.yaml` | `name` "urbanpulse-mobile", script `typecheck`, `jest.setupFiles`, name/slug/scheme y colores de `app.json`, dependencias eliminadas. |
| Modificar | `src/app/_layout.tsx`, `src/components/app-tabs.tsx` | `ErrorBoundary`; `useColorScheme` desde `@/hooks/use-color-scheme`. |
| Modificar | `src/app/login.tsx`, `src/app/register.tsx`, `src/app/incidents/new.tsx`, `src/app/incidents/[id].tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/my-incidents.tsx` | `PrimaryButton`, error con `themeColor="error"`, avisos con constantes, `submitErrorMessage`, `MaxContentWidth`. |
| Modificar | `src/services/` (`device-location`, `token.service`, `incident.service`, `lockout.service`, `http`-consumidores) | `try/catch`, `TextEncoder`, mensajes y constantes, TODO trasladado. |
| Modificar | `src/types/` (`incident`, `user`, `token`, auth) | Tipos compartidos, `UserRole`, `usernameOrEmail`, eliminación de tipos sin uso. |
| Modificar | `src/hooks/use-my-incidents.ts`, `use-incident-detail.ts`, `use-categories.ts`, `use-incident-location-submit.ts`, `use-photo-attachment.ts` | Carrera, `isLoading` derivado, `backendFallbackNotice`, doble envío, `catch`, desmontaje. |
| Modificar | `src/components/` (`incident-list-item`, `location-toggle`, `incident-status-badge`, `password-strength-meter`, `photo-picker`, `themed-text`, `themed-view`, `category-picker`, `country-code-picker`, `incident-photo-viewer`, `app-tabs.web`) | Paletas, colores de error, props eliminadas, alturas acotadas, `onLayout`, prioridad de `style`. |
| Modificar | `src/utils/phone.ts`, `password-strength.ts`, `incident-validator.ts` | `isPhoneNumberValid` eliminado, comprobaciones simples, `code: 'custom'`. |
| Modificar | `src/__tests__/` (app, components, hooks, services) | Mocks duplicados fuera, `Colors`, `jest.mocked`, `requireActual`. |
| Eliminar | `@expo/ui`, `expo-device`, `expo-status-bar`, `expo-web-browser` | Dependencias sin uso, aprobado por la usuaria. |
| Modificar | `CLAUDE.md`, `docs/spec/README.md`, `docs/spec/templates/*.md`, documentos alta/media/baja, nota de sesión, `docs/spec/bugs/todo.md` | Documentación alineada con el estado real. |

## Verificación

- [x] Registrar el comportamiento observado antes del cambio: tests existentes de cada fase (44 suites / 637 tests tras alta y media, 58 suites / 739 tests tras baja).
- [x] Aplicar el refactor.
- [x] Confirmar que el comportamiento es el mismo que antes, salvo los arreglos de bugs listados, mediante la suite de tests.
- [x] `pnpm typecheck`: 0 errores. `pnpm expo lint`: 0 errores y 0 warnings.
- [x] `pnpm test`: 61 suites / 749 tests en verde.
- [x] Verificación manual en dispositivo o Expo Go: lista de incidencias en claro y oscuro, toggle de ubicación apagado, hoja de categorías con muchas categorías, carrusel de fotos, doble toque en "Enviar" y pantalla de error de ruta. Confirmada por la usuaria (2026-11-17).

## Confirmación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-11-17.
- Resultado entregado: los 4 lotes descritos en "Alcance", con `tsc` 0 errores, lint 0/0 y 61 suites / 749 tests en verde. Bugs de `docs/spec/bugs/todo.md` resueltos: doble envío, rechazos no capturados, padding del trigger de `category-picker`, `maxLength` de la categoría personalizada y props `lightColor`/`darkColor` de `ThemedView`.
- Decisiones y desviaciones:
  - `ErrorBoundary` en lugar de `+error.tsx`: en el código instalado de expo-router ~58.0.25 `+error.tsx` no existe; el mecanismo real es `export function ErrorBoundary` desde un archivo de ruta o layout. `CLAUDE.md` se corrigió en consecuencia.
  - `StyleSheet` se mantiene a propósito en `ThemedText` (el color va inline) y queda documentado en el componente.
  - El token `link` de `theme.ts` se añadió y se descartó por no usarse.
  - Dependencias eliminadas (`@expo/ui`, `expo-device`, `expo-status-bar`, `expo-web-browser`) con aprobación de la usuaria.
  - `app.json`: no había `projectId` de EAS ni uso del scheme, por lo que el cambio de `slug`/`scheme` a "urbanpulse" es seguro.
  - `toConnectionError` y `describeConnectionError` se mantienen como envoltorios de dominio.
- Limitaciones y pendientes:
  - `pnpm dlx expo-doctor` da 19/20: 17 paquetes por detrás de la versión que pide el SDK 58 (`expo-router`, `react-native`, `jest-expo`...). Se arregla con `pnpm expo install --fix`, que requiere aprobación de la usuaria. `expo-doctor` no existe como binario de `pnpm`: se ejecuta con `pnpm dlx expo-doctor`.
  - TODO trasladado desde `lockout.service`: el cambio de contraseña verificado debe invocar `resetLockout()` para levantar el bloqueo.
  - Feature pendiente: validar el teléfono en el registro (solo dígitos, entre 6 y 15).
  - Verificación manual en dispositivo o Expo Go (ver "Verificación").
  - Cosmético: algunos tests de `src/__tests__/app/` siguen usando `as jest.MockedFunction<...>` en lugar de `jest.mocked`.
