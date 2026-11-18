# Sesión — 2026-11-17 · Auditoría y plan de limpieza transversal de frontend-mobile

## Contexto

Se pidió una auditoría de solo lectura de todo `frontend-mobile/` contrastada con las reglas de `CLAUDE.md`, para detectar malas prácticas, incumplimientos del estándar y suciedad de código. Se lanzaron 3 exploraciones en paralelo cubriendo rutas/navegación (`src/app/`), componentes/hooks/servicios/tipos/utils, y tests/dependencias/`db.json`/`docs/`.

Resultado: 20 hallazgos más 2 notas (observaciones sin regla violada), clasificados en 3 niveles de severidad. Se decidió en esta sesión **arreglar todo el frontend-mobile paso a paso, empezando por los hallazgos de severidad alta hasta llegar a los de baja**, documentando cada fase como un refactor independiente en `docs/spec/refactor/independent/` antes de empezar a implementar nada.

## Alcance

- Auditoría completa de solo lectura (sin tocar ningún archivo de código en la fase de auditoría).
- Creación de 3 documentos de plan en `docs/spec/refactor/independent/`, uno por nivel de severidad:
  - `17-11-26-limpieza-frontend-mobile-alta.md` — `db.json` con datos semilla contaminados, lógica de negocio fuera de hook en `incidents/new.tsx`, convención de nombres de archivo incumplida de forma sistémica en `src/components/`/`src/hooks/`.
  - `17-11-26-limpieza-frontend-mobile-media.md` — estilos `StyleSheet` en vez de NativeWind, duplicación de traducción de errores de red, ausencia de Zod, avisos de fallback a mock duplicados, colores hardcoded sin token, una lista dinámica sin `FlatList`.
  - `17-11-26-limpieza-frontend-mobile-baja.md` — resto de hallazgos de bajo impacto: una lista estática sin `FlatList`, comentarios de plantilla sin traducir, un `console.log` fuera de convención, un componente de lista sin soporte de tema, un TODO/no-op en producción, huecos de cobertura de tests, formato de checkboxes en `docs/spec/bugs/todo.md`, falta de validador de teléfono, una función utilitaria mal ubicada, formateo manual de teléfono en un handler, y un tipo con template literals innecesarios.
- Esta nota de sesión, como entrada del historial general de `docs/`.

## Decisiones clave

- Se aborda la limpieza en 3 fases ordenadas por severidad (alta → media → baja), no todo de una vez, siguiendo la regla de "una tarea a la vez" de `CLAUDE.md`.
- La convención de nombres de archivo (kebab-case vs. PascalCase/camelCase) se trata como una decisión a confirmar explícitamente con el usuario *antes* de renombrar nada (paso 3 del documento de severidad alta), porque condiciona si el resto del árbol se toca o si en su lugar se actualiza `CLAUDE.md` para reflejar el estándar real del proyecto.
- Ningún refactor de estas 3 fases debe cambiar comportamiento observable de la UI, salvo la extracción de la lógica de ubicación a un hook propio (cambio de ubicación de código, no de comportamiento) y la decisión pendiente sobre el botón de "recuperar contraseña" (severidad baja, paso 5), que se confirmará con el usuario antes de tocarla.
- La sesión empezó documentando el plan; después se implementaron las 3 fases y un repaso final (ver las secciones de cierre más abajo).

## Archivos

| Archivo | Cambio |
| --- | --- |
| `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-alta.md` | Nuevo: plan paso a paso de los 3 hallazgos de severidad alta. |
| `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-media.md` | Nuevo: plan paso a paso de los 6 hallazgos de severidad media. |
| `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-baja.md` | Nuevo: plan paso a paso de los 11 hallazgos de severidad baja. |
| `docs/2026-11-17-001-limpieza-frontend-mobile.md` | Nuevo: esta nota de sesión. |

## Checklist de la sesión

- [x] Auditoría de solo lectura de `src/app/` (rutas y navegación).
- [x] Auditoría de solo lectura de `src/components/`, `src/hooks/`, `src/services/`, `src/types/`, `src/constants/`, `src/utils/`.
- [x] Auditoría de solo lectura de tests, dependencias, `.env`/secretos, `db.json`, `docs/`.
- [x] Consolidación de los 20 hallazgos más 2 notas y clasificación por severidad.
- [x] Creación de los 3 documentos de plan en `docs/spec/refactor/independent/`.
- [x] Registro de esta sesión en el historial de `docs/`.
- [x] Implementación de la fase de severidad alta.
- [x] Implementación de la fase de severidad media.
- [x] Implementación de la fase de severidad baja.

## Estado / Verificación

La fase de auditoría y planificación fue de solo lectura (sin cambios de código); la verificación de cada fase de implementación y del repaso final se detalla en las secciones siguientes.

### Cierre de la fase de severidad alta (17-11-26)

Implementadas y verificadas las 4 subtareas de `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-alta.md`: ST-01 (`CLAUDE.md` documenta kebab-case como convención oficial en `src/components/`/`src/hooks/`), ST-02 (`db.json` con los 7 registros de `incidents` completados y `images` vaciada a `[]`), ST-03 (hook `useIncidentLocationSubmit` extraído de `incidents/new.tsx`) y ST-04 (test del hook con los 5 escenarios, tras una corrección de tipado). Veredicto final del `compiler`: `pnpm tsc --noEmit` 0 errores, `pnpm expo lint` 0 errores (2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`), `pnpm test` 44 suites / 637 tests en verde, sin regresiones. Durante la escritura de los tests se detectaron 2 bugs preexistentes (no introducidos por este refactor) en la lógica de ubicación, anotados en `docs/spec/bugs/todo.md` ("Registro incidencia (ubicación)"): posible doble envío al continuar sin ubicación desde el aviso, y rechazos de promesa no capturados en el flujo de ubicación. Queda pendiente la verificación manual del flujo en dispositivo/Expo Go real.

### Cierre de la fase de severidad media (17-11-26)

Implementadas y verificadas las 17 subtareas de `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-media.md` (ST-01 a ST-17), más 3 follow-ups pequeños derivados de la revisión del `compiler` (colores reales de tema en `fallback-notice-card.tsx`, token de error en `category-picker.tsx`, cierre de ST-13 apoyándose en el helper de ST-12). Se migraron a NativeWind `(tabs)/index.tsx`, `login.tsx`, `register.tsx`, `category-picker.tsx`, `country-code-picker.tsx` y `app-tabs.web.tsx`; se centralizó la traducción de errores de red/backend en `http.ts` (`toConnectionErrorMessage`, `extractBackendErrorMessage`, `buildBackendRejectionMessage`) eliminando las copias duplicadas de `incident.service.ts`/`category.service.ts` y enchufando el helper en `auth.service.ts`/`civic.service.ts`/`image.service.ts`; se añadieron tokens de color de error a `theme.ts` y se centralizó el aviso de fallback a mock en el componente nuevo `FallbackNoticeCard`; se virtualizó con `FlatList` el listado de categorías del modal; y se instaló `zod` (tras revisión de seguridad documentada en la sección "Confirmación" del propio documento de la fase) para migrar `incident-validator.ts` y `password-strength.ts` a esquemas Zod sin cambiar mensajes ni comportamiento. Veredicto final del `compiler`: `pnpm tsc --noEmit` 0 errores, `pnpm expo lint` 0 errores (2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`), `pnpm test` 44 suites / 637 tests en verde, sin regresiones. Decisión documentada: no se tocó `describeBackendRejection` de `category.service.ts` para no cambiar el formato del mensaje visible al usuario. Queda pendiente la verificación manual del modal de categorías y de los avisos de fallback en dispositivo/Expo Go real.

### Cierre de la fase de severidad baja (17-11-26)

Implementadas y verificadas las 18 subtareas de `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-baja.md` (T01-T18), más 2 follow-ups pequeños detectados durante la propia implementación: un bug real de configuración de Jest (`moduleNameMapper` en `package.json` sin la entrada específica `@/assets/...` antes de la genérica `@/...`, que bloqueaba los tests de `app-tabs.tsx` nativo al cargar una imagen vía ese alias) y 2 warnings `import/first` en los tests nuevos de `themed-text.tsx`/`themed-view.tsx`. Se migró `country-code-picker.tsx` a `FlatList`, se tradujeron comentarios de plantilla de Expo (`use-theme.ts`, `use-color-scheme.web.ts`, `theme.ts`), se confirmó que el log de `config.ts` ya cumplía la convención `[config] ...`, se migró `incident-list-item.tsx` a `ThemedView`/`ThemedText` (soporte de modo oscuro), se deshabilitó visualmente el botón "¿Has olvidado tu contraseña?" en `login.tsx` (indicación "Próximamente" en vez de no-op silencioso), se creó `src/utils/phone.ts` (`buildPhoneWithDialCode` conectado a `register.tsx`; `isPhoneNumberValid` con Zod creado y testeado pero deliberadamente no conectado al bloqueo de envío, para no alterar comportamiento observable), se corrigieron 5 checkboxes `- []` a `- [ ]` en `docs/spec/bugs/todo.md`, se simplificó `UserRole` en `src/types/user.ts`, se extrajo `buildGreetings` a `src/utils/greetings.ts`, y se cubrieron con tests nuevos `http.ts`, `app-tabs.tsx`/`app-tabs.web.tsx`, `password-input.tsx`, `themed-text.tsx`/`themed-view.tsx`, `use-color-scheme.ts`/`.web.ts`, `use-theme.ts`, `use-location-preference.ts`, `uuid.ts` y `(tabs)/_layout.tsx`. Veredicto final del `compiler`: `pnpm tsc --noEmit` 0 errores, `pnpm expo lint` 0 errores (2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no regresión de esta fase), `pnpm test` 58 suites / 739 tests en verde, sin regresiones. Hallazgo no corregido, anotado en `docs/spec/bugs/todo.md` (sección "General") para una futura sesión: `ThemedView` declara props `lightColor`/`darkColor` sin usarlas en la implementación. Queda pendiente la verificación manual del botón de "recuperar contraseña" deshabilitado y del modo oscuro de `incident-list-item.tsx` en dispositivo/Expo Go real.

## Cierre del refactor transversal (17-11-26)

Con el cierre de la fase de severidad baja, las 3 fases (alta, media y baja) del refactor de limpieza transversal de `frontend-mobile` documentadas en `docs/spec/refactor/independent/` están completas, implementadas y verificadas: 0 errores de `tsc`/`lint` en cada cierre de fase, y la suite de tests completa en verde en el último veredicto del `compiler` (58 suites / 739 tests). Los 3 documentos de plan (`17-11-26-limpieza-frontend-mobile-alta.md`, `-media.md`, `-baja.md`) tienen su checklist de subtareas al completo marcado `[x]` y su sección "Confirmación" rellena con estado final, fecha de revisión, resultado entregado, decisiones/desviaciones y limitaciones/pendientes. Lo único que queda diferido de las 3 fases es la verificación manual en dispositivo/Expo Go real (flujo de ubicación de la fase alta, modal de categorías y avisos de fallback de la fase media, botón de "recuperar contraseña" y modo oscuro de `incident-list-item.tsx` de la fase baja), que no está cubierta por el `compiler` y no bloquea el cierre documental de ninguna fase.

## Repaso final (17-11-26)

Revisión final tras las 3 fases, documentada en `docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`. Resumen por lotes:

- **Lote 1 (config, tipos, servicios, dependencias):** `src/constants/messages.ts` nuevo (`MOCK_FALLBACK_NOTICE`, `BACKEND_FALLBACK_NOTICE`); `theme.ts` exporta `IncidentStatusColors` y `PasswordStrengthColors` (el token `link` se añadió y se quitó por no usarse); `config.ts` registra `BACKEND_API_URL` y usa "pnpm run"; eliminadas `@expo/ui`, `expo-device`, `expo-status-bar` y `expo-web-browser` (con aprobación de la usuaria); `package.json` (`name` "urbanpulse-mobile", script `typecheck`, `jest.setupFiles` con `jest.setup.ts`) y `app.json` (name "UrbanPulse", `slug`/`scheme` "urbanpulse", colores de plantilla a `#ffffff`); límite de errores de ruta con `export function ErrorBoundary` en `src/app/_layout.tsx` y `src/components/route-error-fallback.tsx` (en expo-router ~58.0.25 `+error.tsx` no existe); `requestLocationPermission` con `try/catch`; `token.service` con `TextEncoder` en vez de `unescape`; tipos `Incident` y `TokenPayload` eliminados, `UserBase.role` pasa a `UserRole`, `IncidentBase`/`IncidentLocation` compartidos y `username_email` pasa a `usernameOrEmail`.
- **Lote 2 (hooks, componentes, utilidades):** condición de carrera corregida con `isActive` local por efecto en `use-my-incidents`, `use-incident-detail` y `use-categories` (`fallbackNotice` pasa a `backendFallbackNotice`); bugs de `todo.md` corregidos en `use-incident-location-submit` (doble envío con `isSubmittingRef`, promesas sin `catch` con `submitErrorMessage`), `themed-view` (props `lightColor`/`darkColor` eliminadas) y `category-picker` (padding simétrico, `maxLength` de 15, hoja con `maxHeight` del 80 %); `country-code-picker` con la misma solución de altura; `incident-photo-viewer` mide el ancho con `onLayout`; `photo-picker` con `themeColor="error"` y `MAX_SELECTED_PHOTOS`; `themed-text` sin `linkPrimary`/`codeSmall` (se mantiene `StyleSheet` a propósito); `phone.ts` sin `isPhoneNumberValid`; `password-strength` con comprobaciones simples (email sigue con Zod); `incident-validator` con `code: 'custom'`.
- **Lote 3 (pantallas):** `src/components/primary-button.tsx` nuevo (con test) sustituye 4 copias del botón; color de error unificado con `ThemedText themeColor="error"` en login, register y new; login usa `MaxContentWidth`; avisos con `MOCK_FALLBACK_NOTICE`.
- **Lote 4 (tests):** mocks duplicados eliminados, colores vía `Colors`, `jest.mocked`, `login-session-restore.test` con `requireActual` (0 warnings de lint) y test nuevo de `fallback-notice-card`.

Documentación actualizada en este repaso: `CLAUDE.md` (tests en kebab-case, `ErrorBoundary`, árbol real de `(tabs)`, comandos `pnpm test`/`pnpm typecheck`/`pnpm dlx expo-doctor`), plantillas y `README.md` de `docs/spec/`, los 3 documentos de fase y `docs/spec/bugs/todo.md`.

### Verificación final

- `pnpm tsc --noEmit`: 0 errores.
- `pnpm expo lint`: 0 errores y 0 warnings.
- `pnpm test`: 61 suites / 749 tests en verde.

### Pendientes del repaso final

- [ ] `pnpm dlx expo-doctor` da 19/20: 17 paquetes por detrás de la versión que pide el SDK 58 (`expo-router`, `react-native`, `jest-expo`...). Se arregla con `pnpm expo install --fix`, que requiere aprobación de la usuaria. Nota: `expo-doctor` no existe como binario de `pnpm`, se ejecuta con `pnpm dlx expo-doctor`.
- [ ] TODO trasladado desde `lockout.service`: el cambio de contraseña verificado debe invocar `resetLockout()` para levantar el bloqueo.
- [ ] Feature pendiente: validar el teléfono en el registro (solo dígitos, entre 6 y 15).
- [x] Verificación manual en dispositivo o Expo Go: lista de incidencias en claro y oscuro, toggle de ubicación apagado, hoja de categorías con muchas categorías, carrusel de fotos, doble toque en "Enviar" y pantalla de error de ruta. Confirmada por la usuaria.
- [ ] Cosmético: algunos tests de `src/__tests__/app/` siguen usando `as jest.MockedFunction<...>` en lugar de `jest.mocked`.

## Pendiente / diferido

- [x] Empezar la implementación por `17-11-26-limpieza-frontend-mobile-alta.md`, paso a paso, confirmando con el usuario los puntos marcados como "a confirmar" (regeneración de `db.json`, convención de nombres de archivo).
- [x] Tras cerrar la fase alta y la fase media, continuar con la fase baja, siguiendo el mismo documento como checklist vivo (marcar cada paso al completarlo y rellenar la sección "Confirmación" de cada documento al terminar su fase).
- [x] Verificación manual en dispositivo/Expo Go real (diferida en las 3 fases, confirmada por la usuaria tras el repaso final): flujo de creación de incidencia con ubicación (con/sin GPS, con/sin permiso) de la fase alta; modal de categorías y avisos de fallback a mock de la fase media; botón de "recuperar contraseña" deshabilitado y modo oscuro de `incident-list-item.tsx` de la fase baja. Ninguna está cubierta por el `compiler`.

## Reviews de las PRs abiertas (17-11-26)

Planes de los cambios pedidos en las PRs #184, #158 y #162, en `docs/spec/bugs/`:

- `registro-incidencia/17-11-26-envio-bloqueado-en-web-sin-ubicacion.md` (PR #184).
- `general/17-11-26-review-pr-158-token-y-fotos.md` (PR #158). Orden acordado: después de mergear #184, rebasar `fix/token` y reutilizar `confirm-action`.
- `general/17-11-26-review-pr-162-workflow-ci.md` (PR #162). Sin cambios de código; la descripción se deja como está y solo falta la re-review.

### Fix PR #184: envío bloqueado en web

- [x] Subtarea 1: `src/utils/confirm-action.ts` (confirmación con `Alert` en native y `window.confirm` en web) y `src/__tests__/utils/confirm-action.test.ts` (15 tests).
- [x] Subtarea 2: `src/hooks/use-incident-location-submit.ts` usa `confirmAction` en los dos diálogos de ubicación; 10 tests web nuevos en `src/__tests__/hooks/use-incident-location-submit.test.ts` (38/38).
- [x] Verificación: `pnpm tsc --noEmit` y `pnpm expo lint` con 0 errores y 0 warnings; `pnpm test` con 62 suites / 774 tests en verde.
- [ ] Prueba manual en navegador denegando el permiso de ubicación.
- [ ] Commit, push, responder a la review de CodeJose21 y pedir re-review.
