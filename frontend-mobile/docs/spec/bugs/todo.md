# Bugs que se deben arreglar

---
**PLANTILLA**
**No se debe eliminar este párrafo. Debe servir como guía permanente para no alucinar y plantear otra estructura**

## Nombre Feature

> La fecha a la derecha del asunto será la fecha en la que se registró el bug a arreglar

- [ ] ASUNTO (DD-MM-YY): DESCRIPCIÓN *(No debe ser excesivamente larga, suficiente para que se entienda qué falla)*
---

## Registro incidencia

- [x] ~~Pantalla desplazada hacia arriba al crear incidencia (23-10-26)~~: sustituido por la entrada genérica en "## General" (24-10-26), porque el mismo síntoma se confirmó también en otras pantallas (no es exclusivo de `incidents/new.tsx`). `incidents/new.tsx` queda listado ahí como una de las pantallas afectadas; en esta sección se retira para no duplicar.
- [x] ~~Límite de imágenes desalineado entre UI, envío y backend — issue #91 (12-10-26)~~: corregido subiendo `MAX_INCIDENT_IMAGES` de 5 a 8 en `src/services/incident.service.ts` para que coincida con `MAX_SELECTED_PHOTOS` (picker) y el límite real del backend (`FilesInterceptor('images', 8, ...)`). Ver `bugs/registro-incidencia/03-11-26-limite-imagenes-desalineado.md`.
- [x] ~~Padding desequilibrado y poco espacio en el control de categoría seleccionada (12-10-26)~~: padding simétrico en el `trigger` de `src/components/category-picker.tsx`. Resuelto en el repaso final, ver `refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`.
- [x] ~~Categoría personalizada sin límite de caracteres (12-10-26)~~: `maxLength` de 15 en el `TextInput` de la categoría personalizada de `src/components/category-picker.tsx`. Resuelto en el repaso final, ver `refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`.
- [x] ~~Posible doble envío al continuar sin ubicación desde el aviso (17-11-26)~~: `isSubmittingRef` en `useIncidentLocationSubmit` bloquea hasta que termina el envío lanzado desde el `Alert`; se libera con Cancelar, Abrir Ajustes y `onDismiss`. Resuelto en el repaso final, ver `refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`.
- [x] ~~Rechazos no capturados en el flujo de ubicación (17-11-26)~~: todas las promesas del flujo capturan el error y exponen `submitErrorMessage`, que la pantalla muestra. Resuelto en el repaso final, ver `refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`.
- [x] ~~Envío bloqueado en web al denegar la ubicación — PR #184 (17-11-26)~~: nuevo `src/utils/confirm-action.ts` (`Alert` en native, `window.confirm` en web) usado en los dos diálogos de `useIncidentLocationSubmit`; el bloqueo se libera siempre. Ver `bugs/registro-incidencia/17-11-26-envio-bloqueado-en-web-sin-ubicacion.md`.
- [ ] Fotos descartadas sin aviso al registrar en el backend real — PR #158 (17-11-26): `POST /incidents` (JSON) no admite imágenes y la UI confirma el éxito igualmente. Plan en `bugs/general/17-11-26-review-pr-158-token-y-fotos.md`.

## General

> Bugs no atados a una feature concreta porque afectan a varias pantallas a la vez (análogo a `refactor/independent/`).

- [x] ~~UI desplazada hacia arriba, contenido superior oculto salvo scroll manual (24-10-26)~~: corregido con `enableLegacyHeaderAppearance()` en `src/app/_layout.tsx` (causa raíz: header nativo translúcido/absoluto por defecto en iOS 26+ con Liquid Glass en `incidents/new.tsx` e `incidents/[id].tsx`). Verificado por código/tests/lint/typecheck, ver `bugs/general/24-10-26-ui-desplazada-hacia-arriba.md`. Pendiente: confirmación visual de la usuaria en dispositivo iOS real, y `src/app/(tabs)/my-incidents.tsx` sigue sin diagnosticar (no tiene header nativo, no se encontró causa de código ahí; a reproducir si el síntoma persiste tras este fix).
- [x] ~~`ThemedView` con props `lightColor`/`darkColor` sin efecto (17-11-26)~~: eliminadas las props de la interfaz de `src/components/themed-view.tsx`. Resuelto en el repaso final, ver `refactor/independent/17-11-26-limpieza-frontend-mobile-repaso-final.md`.
- [ ] Respuesta antigua restaura datos tras retirar el token — PR #158 (17-11-26): `useIncidentDetail` y `useMyIncidents` comparten `isMountedRef` entre ejecuciones del efecto. Plan en `bugs/general/17-11-26-review-pr-158-token-y-fotos.md`.
- [x] ~~`Alert.alert` sin efecto en web en `(tabs)/index.tsx` (cerrar sesión) e `incidents/new.tsx` ("¿Enviar de todas formas?") (17-11-26)~~: en web el botón "Enviar" quedaba muerto con avisos de validación (confirmado por la usuaria al probar la PR #184). Ambos usan `confirmAction`, que admite `style` en el botón de confirmar para conservar el `destructive` en native. Resuelto en la PR #184, ver `bugs/registro-incidencia/17-11-26-envio-bloqueado-en-web-sin-ubicacion.md`.

## Login

- [ ] Salto de scroll al cambiar de campo con el teclado abierto (15-10-26): con el teclado activo, al pasar de introducir usuario a contraseña, o al mostrar/ocultar la contraseña, la pantalla hace un desplazamiento brusco e involuntario hacia arriba de unos 0.2s. Migrado desde `docs/old/spec/bugs/002-inicioSesion.md` (sesión antigua); quedó registrado pero nunca se llegó a arreglar.
- [ ] Salto de línea brusco en el saludo con efecto typewriter (15-10-26): `TypewriterText` (`src/components/typewriter-text.tsx`) revela el texto carácter a carácter sin saltos de línea predefinidos; si la frase es demasiado larga para caber en horizontal, el salto de línea ocurre en vivo de forma brusca en vez de estar ya definido de antemano. Migrado desde `docs/old/spec/features/002-gestion-sesion/tasks.md` ("Notas de futuro"); sigue sin implementarse en el componente actual.

## Pendientes del repaso final

- [ ] Validar el teléfono en el registro (17-11-26): `isPhoneNumberValid` se eliminó de `src/utils/phone.ts`; queda como feature pendiente validar el teléfono en `register.tsx` (solo dígitos, entre 6 y 15) y bloquear el envío si no cumple.
- [ ] `resetLockout()` tras cambiar la contraseña (17-11-26): TODO trasladado desde `lockout.service`; el cambio de contraseña verificado debe invocar `resetLockout()` para levantar el bloqueo.
- [ ] Alineación de versiones con `expo install --fix` (17-11-26): `pnpm dlx expo-doctor` da 19/20 y avisa de 17 paquetes por detrás de la versión que pide el SDK 58 (`expo-router`, `react-native`, `jest-expo`...); requiere aprobación de la usuaria porque cambia versiones.
