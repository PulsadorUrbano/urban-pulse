# 17-11-26 — Bug: envío bloqueado en web al denegar la ubicación (PR #184)

- Feature afectada: registro-incidencia.
- Rama: refactor/182-limpieza-frontend-mobile (PR #184).
- Última actualización: 2026-11-17.
- Estado: Corregido y verificado.
- Origen: review de CodeJose21 en la PR #184 (2026-11-17, "changes requested").

## Síntoma observado

En web, en `incidents/new`, con la preferencia de ubicación activada: si el permiso de ubicación
se deniega (o los servicios de ubicación se consideran desactivados), al pulsar "Enviar" no
aparece ningún diálogo y el botón se queda deshabilitado y en estado de carga para siempre. No se
puede reintentar ni siquiera tras cambiar la preferencia de ubicación; hay que recargar la página.

## Diagnóstico

- Archivo y línea: `src/hooks/use-incident-location-submit.ts:156` y `:184`
  (`return false` tras `Alert.alert(...)`), junto con `startSubmit` (`:203-216`), que solo libera
  el bloqueo si `resolveLocationAndSubmit` devuelve `true`.
- Causa: el diseño delega la liberación de `isSubmittingRef` / `isResolvingLocation` en los
  callbacks del `Alert` (Cancelar, Abrir Ajustes, Enviar sin ubicación, `onDismiss`). En
  `react-native-web@0.21.4` `Alert.alert` es un no-op: no pinta diálogo ni ejecuta callbacks,
  así que nadie llama a `releaseSubmit()`.
- Afecta a las dos ramas con `Alert`: servicios de ubicación desactivados (`:141`) y permiso
  denegado (`:161`). Además, `Linking.openSettings()` no tiene sentido en web.
- Alcance colateral (no es parte de este bug, solo se anota): `src/app/(tabs)/index.tsx:36`
  (confirmar cierre de sesión) y `src/app/incidents/new.tsx:143` ("¿Enviar de todas formas?")
  también usan `Alert.alert` y en web no hacen nada; no bloquean la UI, pero la acción no se
  llega a ejecutar. Se valorará en `bugs/todo.md`, no en este fix.

## Corrección aplicada

Cambio mínimo, confinado al hook:

1. Crear un helper de confirmación multiplataforma, p. ej. `src/utils/confirm-action.ts`:
   - Native: envuelve `Alert.alert` con los botones recibidos (comportamiento actual intacto).
   - Web (`Platform.OS === 'web'`): usa `window.confirm(message)`; `true` → ejecuta la acción
     confirmatoria ("Enviar sin ubicación"), `false` → ejecuta la de cancelar. Los botones que
     no tienen sentido en web ("Abrir Ajustes") se omiten.
   - Tipado estricto, sin `any`; `window` se comprueba con `typeof window !== 'undefined'`.
2. En `use-incident-location-submit.ts`, sustituir los dos `Alert.alert` por el helper,
   manteniendo el contrato actual (`return false` y el diálogo libera el bloqueo). En web, al ser
   `window.confirm` síncrono, la acción elegida siempre se ejecuta y el bloqueo siempre se libera.
3. Garantía extra: si el helper no puede mostrar ningún diálogo (entorno sin `window`), libera el
   bloqueo para no dejar nunca el botón colgado.

Alternativa descartada: liberar el bloqueo directamente en web sin preguntar. Es más simple pero
la usuaria no se entera de que la incidencia irá sin ubicación; el revisor acepta ambas, se
prefiere la confirmación.

Decisión abierta: el helper puede reutilizarse luego en `new.tsx:143` y `index.tsx:36` y en el
aviso de fotos de la PR #158 (ver `bugs/general/17-11-26-review-pr-158-token-y-fotos.md`). Aquí
solo se aplica al hook.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| crear | `src/utils/confirm-action.ts` | Confirmación compatible con native (`Alert`) y web (`window.confirm`) |
| modificar | `src/hooks/use-incident-location-submit.ts` | Usar el helper en los dos diálogos de ubicación |
| crear | `src/__tests__/utils/confirm-action.test.ts` | Ramas native/web, aceptar/cancelar |
| modificar | `src/__tests__/hooks/use-incident-location-submit.test.ts` | Casos web: permiso denegado y servicios desactivados no dejan el envío bloqueado |
| modificar | `docs/spec/bugs/todo.md` | Entrada del bug y del alcance colateral |

## Verificación

- [x] Reproducir antes del cambio: con el código original, `Alert.alert` en web no ejecuta callbacks y
  `startSubmit` devuelve `false` sin liberar el bloqueo (`:156` y `:184`). Los tests web nuevos
  dependen de `window.confirm`, que el código original nunca llamaba, así que fallarían contra él.
- [x] Aplicar la corrección.
- [x] Confirmar: con `window.confirm` → `true` se registra sin ubicación y se libera el bloqueo;
  con `false` se libera sin enviar y un segundo `startSubmit()` vuelve a funcionar.
- [x] Native sin cambios: los 28 tests anteriores del hook siguen en verde sin modificarlos.
- [x] Prueba manual en `pnpm run start` → web: confirmada por la usuaria (2026-11-18).
- [x] `pnpm expo lint` y `pnpm tsc --noEmit`: 0 errores, 0 warnings.
- [x] `pnpm test`: 62 suites / 774 tests en verde.
- [ ] Responder a la review en la PR #184 y pedir re-review a CodeJose21.

## Confirmación

- Estado final: Corregido y verificado (prueba manual en navegador confirmada por la usuaria el 2026-11-18).
- Fecha de revisión: 2026-11-17.
- Evidencia de que no reaparece: `src/__tests__/utils/confirm-action.test.ts` (15 tests: native y
  web) y el bloque `en web` de `src/__tests__/hooks/use-incident-location-submit.test.ts` (10 tests:
  permiso denegado y servicios desactivados × aceptar, cancelar, reintentar tras cancelar, sin
  `Alert`/`openSettings`, sin `window.confirm`). Hook: 38/38; suite completa: 62 suites / 774 tests.
- Limitaciones y pendientes: en web, "Abrir Ajustes" no se
  ofrece (`window.confirm` solo tiene dos botones).

## Ampliación (2026-11-18): resto de `Alert.alert` de la app

Al probar en el navegador, la usuaria no podía enviar con la ubicación desactivada: el botón
"Enviar" no hacía nada. La causa era el alcance colateral anotado arriba: `handleSubmit` en
`src/app/incidents/new.tsx` pide "¿Enviar de todas formas?" con `Alert.alert` cuando hay avisos
de validación (descripción vacía o corta, o ubicación desactivada), y en web eso es un no-op. Se
amplía el fix en la misma PR, porque es la misma causa:

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/utils/confirm-action.ts` | `confirm.style?: 'default' \| 'destructive'` (solo native) |
| modificar | `src/app/incidents/new.tsx` | "¿Enviar de todas formas?" con `confirmAction` (`destructive`) |
| modificar | `src/app/(tabs)/index.tsx` | "Cerrar sesión" con `confirmAction` (`destructive`) |
| modificar | `src/__tests__/utils/confirm-action.test.ts` | +3 tests de `style` |
| modificar | `src/__tests__/app/incidents/new-incident-screen.test.tsx` | +5 tests (web aceptar/cancelar, ubicación desactivada, validación, `destructive` en native) |
| modificar | `src/__tests__/app/tabs/home-screen-logout.test.tsx` | +3 tests (web aceptar/cancelar, `destructive` en native) |

Verificación: `pnpm tsc --noEmit` y `pnpm expo lint` con 0 errores y 0 warnings; `pnpm test` con
62 suites / 785 tests en verde. Ya no queda ningún `Alert.alert` directo en `src/`.
