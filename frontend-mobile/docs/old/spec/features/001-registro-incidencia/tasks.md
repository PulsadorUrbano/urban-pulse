# 001 · Registro de incidencia — Tareas

_Checklist accionable derivada del `plan.md`. Tareas pequeñas y concretas; marca `[x]` al completarlas._

## Base (registro de título + descripción)

- [x] Definir contrato `Incident`/`CreateIncidentInput` en `src/types/incident.ts`.
- [x] Añadir `API_BASE_URL` en `src/constants/config.ts`.
- [x] Añadir colección `incidents` semilla en `db.json`.
- [x] Implementar `createIncident()` en `src/services/incident.service.ts`.
- [x] Implementar `src/utils/incident-validator.ts`.
- [x] Implementar hook `src/hooks/use-create-incident.ts`.
- [x] Reorganizar navegación: `Stack` raíz + `(tabs)/_layout.tsx` (mover `index.tsx`/`explore.tsx`).
- [x] Crear pantalla `src/app/incidents/new.tsx` con formulario y estados.
- [x] Añadir acceso al formulario desde `(tabs)/index.tsx`.
- [x] Declaración de tipos para imports `.css` (fix baseline `tsc`).
- [x] Escribir tests colocados (`incident-validator`, `use-create-incident`).
- [x] Ejecutar y pasar `npx expo lint` + `npx tsc --noEmit` + tests.
- [x] Validar contra los criterios de aceptación de `spec.md`.
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Categoría opcional (ampliación)

- [x] Definir `Category { id: string; name: string }` en `src/types/category.ts`.
- [x] Añadir `category: string | null` y `categoryId: string | null` a `Incident` y `CreateIncidentInput` en `src/types/incident.ts`.
- [x] Añadir colección `categories` en `db.json` con `Transporte`, `Alumbrado público` y `Objetos urbanos`.
- [x] Extraer `fetchWithTimeout()` + `RequestTimeoutError` a `src/services/http.ts` y reutilizarlos.
- [x] Migrar `src/services/incident.service.ts` a `fetchWithTimeout()` y enviar `category`/`categoryId` en el payload.
- [x] Implementar `fetchCategories()` en `src/services/category.service.ts` (`GET /categories`).
- [x] Implementar hook `src/hooks/use-categories.ts` (`useCategories()` expone `{ categories, isLoading, errorMessage, reload }`).
- [x] Añadir validación del caso "Otros" vacío en `src/utils/incident-validator.ts`.
- [x] Añadir selector de categoría opcional en `src/app/incidents/new.tsx` (categorías + "Otros" + `TextInput` libre + botón "×").
- [x] Escribir tests colocados (`category.service`, `use-categories`, validación de categoría).
- [x] Ejecutar y pasar `npx expo lint` + `npx tsc --noEmit` + tests.
- [x] Validar contra los nuevos criterios de aceptación de `spec.md`.
- [x] Anotar la ampliación en `../../constitution/roadmap.md` (dentro de 001, sin feature nueva).

## Rediseño UI de categoría (control en Descripción)

- [x] Definir props tipadas del componente `CategoryPicker` (categorías, selección actual, `onSelectCategory`, `onSelectOther`, `onClear`, `isLoading`, `errorMessage`).
- [x] Crear `src/components/category-picker.tsx` con el trigger: "Añadir categoría +" sin selección.
- [x] Implementar el bottom sheet con `Modal` nativo (`animationType="slide"`, `transparent`) con la lista de categorías + "Otros".
- [x] Implementar el modal de "Otros" con `TextInput` y botón Guardar deshabilitado mientras el texto está vacío.
- [x] Mostrar el nombre de la categoría + "×" cuando hay selección; la "×" limpia `categoryId` y `category` a `null`.
- [x] Cablear los estados de carga y error del catálogo al componente (props), sin romper el registro sin categoría.
- [x] Retirar los chips y el campo "Categoría (opcional)" independiente en `src/app/incidents/new.tsx`.
- [x] Incrustar `CategoryPicker` en la esquina inferior del campo Descripción y conectar callbacks/estado existentes.
- [x] Escribir tests colocados de `CategoryPicker` (trigger, selección, "Otros" vacío, limpiar).
- [x] Ejecutar y pasar `npx expo lint` + `npx tsc --noEmit` + tests.
- [x] Validar contra los nuevos criterios de aceptación de `spec.md`.
- [x] Anotar el rediseño en `../../constitution/roadmap.md` (dentro de 001).

## Ajustes de UI (categoría)

- [x] Agrandar las opciones de la hoja de categorías (no el botón).
- [x] Revertir el botón "Añadir categoría" a su aspecto anterior (se había separado el "+" con margen y desplazado a la izquierda; se revierte).
- [x] Corregir las esquinas inferiores del campo Descripción (la fila del `CategoryPicker` pintaba un fondo sólido que tapaba el borde redondeado; ahora es `View` transparente + `overflow: 'hidden'` en el contenedor).

## Ubicación (ampliación)

- [x] Definir `Location { id: string; latitude: number; longitude: number; accuracy: number | null; createdAt: string }` en `src/types/location.ts`.
- [x] Añadir `locationId?: string | null` a `CreateIncidentInput` en `src/types/incident.ts` (la incidencia guarda la FK a la `Location` creada).
- [x] Añadir la colección `locations` en `db.json` (relación 1:M con `incidents` vía `locationId`).
- [x] Implementar `src/services/device-location.ts`: permiso en primer plano, `hasServicesEnabledAsync()` y captura con `Accuracy.Balanced`, devolviendo resultados tipados sin lanzar por causas previsibles (permiso denegado, GPS apagado, fallo/timeout).
- [x] Implementar `src/services/location.service.ts`: `createLocation()` con `POST /locations` reutilizando `fetchWithTimeout()`.
- [x] Implementar `src/hooks/use-location-preference.ts` (`isLocationEnabled` por defecto `true` y `toggleLocation()`).
- [x] Añadir `getIncidentWarnings({ description, isLocationEnabled })` en `src/utils/incident-validator.ts` con `description-empty`, `description-too-short` y `location-disabled`.
- [x] Crear `src/components/location-toggle.tsx`: círculo grisáceo + icono blanco Material `location_on`, línea diagonal cuando está desactivado, props `{ isEnabled, onToggle }` y accesibilidad (`accessibilityRole="switch"`).
- [x] Integrar el toggle flotante en `src/app/incidents/new.tsx` (esquina inferior derecha, activado por defecto, sin tapar el botón Enviar).
- [x] Integrar el flujo de envío en `new.tsx`: aviso combinado en **un único `Alert`** → permiso → captura → `createLocation` → `submitIncident` con `locationId`.
- [x] Implementar el `Alert` de permiso con "Abrir Ajustes" (`Linking.openSettings()`), "Enviar sin ubicación" y "Cancelar" (cancelar no envía nada).
- [x] Manejar GPS apagado y fallo de captura: enviar con `locationId: null` y aviso no bloqueante.
- [x] Instalar `expo-location` y `@expo/vector-icons` con `npx expo install` (versiones compatibles con el SDK).
- [x] Declarar el plugin `expo-location` en `app.json` con `locationWhenInUsePermission` (solo primer plano, sin flags de background).
- [x] Escribir tests colocados: `getIncidentWarnings`, `use-location-preference`, `device-location` (mock de `expo-location`), `location-toggle` y flujo de envío en `new.tsx`.
- [x] Ejecutar y pasar `npx expo lint` + `npx tsc --noEmit` + tests.
- [x] Validar contra los nuevos criterios de aceptación de `spec.md`.
- [x] Anotar la ampliación en `../../constitution/roadmap.md` (dentro de 001).

## Fotos (ampliación)

- [x] **T1 · Contrato y mock** — Crear `src/types/incident-image.ts` con `IncidentImage { id: string; url: string; incidentId: string }` (más `CreateIncidentImageInput { url: string; incidentId: string }`, patrón de `Location`) y añadir la colección `images: []` **vacía** en `db.json` (**sin seeds** sobre incidencias existentes). `Incident` y `CreateIncidentInput` **no cambian**. Hecha y verificada con `npx tsc --noEmit` + `npx expo lint`.
- [x] **T2 · Dependencia y configuración** — Instalar `expo-image-picker@~57.0.20` con `npx expo install` (SDK 57; **docs versionadas consultadas antes de codificar**) y declarar su plugin en `app.json` con `photosPermission` y `cameraPermission`. Realizada y verificada: `npx expo lint` + `npx tsc --noEmit` + `npx expo-doctor` OK, sin desajustes nuevos.
- [x] **T3 · Servicios** — `src/services/image.service.ts` con `createImage()` (`POST /images`, reutilizando `fetchWithTimeout()`) y `src/services/storage.service.ts` con `storePhoto(uri)` (retardo simulado con `setTimeout` para probar estados de carga/error sin red). Hecha y verificada: `npx expo lint` + `npx tsc --noEmit` OK; tests colocados `image.service.test.ts` y `storage.service.test.ts` (por `tester`); suite completa 11 suites / 77 tests en verde.
- [x] **T4 · Capa de dispositivo** — `src/services/photo-picker.ts`: permisos de cámara + `launchCameraAsync`/`launchImageLibraryAsync`; **cancelar → `null` sin error**; **permiso denegado → error amigable**. Implementada y verificada: `npx expo lint` + `npx tsc --noEmit` OK; tests colocados `photo-picker.test.ts` (8 tests con mock de `expo-image-picker`); suite completa 12 suites / 85 tests en verde.
- [x] **T5 · Hook de adjuntos** — `src/hooks/use-photo-attachment.ts`: `photoUris`, `isProcessing`, `errorMessage`, `attachFromCamera()`, `attachFromLibrary()`, `removeImage(uri)`. Implementado; lint+tsc OK; tests colocados `use-photo-attachment.test.tsx` (8 tests); suite completa 13 suites / 93 tests en verde.
- [x] **T6 · Componente de fotos** — `src/components/photo-picker.tsx`: `FlatList` horizontal de tiles cuadrados (`PHOTO_TILE_SIZE` en `src/constants/theme.ts`), miniatura con `expo-image` + botón "×" + overlay de carga; **recuadro discontinuo** al final (icono compuesto Material `image` + insignia `arrow-upward`, textos "Añadir imagen"/"Recomendado") y hoja inferior Cámara/Galería con `Modal` nativo (patrón `CategoryPicker`). Implementado `src/components/photo-picker.tsx`; lint+tsc OK; tests colocados `photo-picker.test.tsx` (9 tests); suite completa 14 suites / 102 tests en verde.
- [x] **T7 · Integración en el formulario** — `src/app/incidents/new.tsx`: sección de foto bajo Descripción y sobre el botón Enviar; **footer fijo** (safe-area aware) con el botón Enviar y **FAB de ubicación fijo** en capa superior (`zIndex`/`elevation`); padding inferior reservado en el `ScrollView`; envío `createIncident()` → por cada URI, `storePhoto(uri)` + `createImage({ url, incidentId })`; fallo de imagen → incidencia registrada + aviso no bloqueante en la pantalla de confirmación. Hecha y verificada: integrada en `src/app/incidents/new.tsx` (sección de fotos, footer/FAB fijos, envío con `createImage` por URI y aviso degradado); lint+tsc OK; test de integración `new-incident-screen.test.tsx` (6 tests); suite completa 15 suites / 108 tests en verde.
- [x] Escribir tests en `src/__tests__/` por `tester`: `src/__tests__/services/image.service.test.ts`, `src/__tests__/services/storage.service.test.ts` (fake timers), `src/__tests__/services/photo-picker.test.ts` (mock de `expo-image-picker`), `src/__tests__/hooks/use-photo-attachment.test.tsx`, `src/__tests__/components/photo-picker.test.tsx` y el test de la pantalla `src/__tests__/app/incidents/new-incident-screen.test.tsx` (integración del flujo de envío con fotos; fuera de `src/app/` para no entrar en el bundle de Expo Router).
- [x] Ejecutar y pasar `npx expo lint` + `npx tsc --noEmit` + tests (`npx jest --ci`): 15 suites / 108 tests en verde.
- [x] Validar contra los nuevos criterios de aceptación de `spec.md`.
- [x] Anotar la ampliación en `../../constitution/roadmap.md` (dentro de 001).
- [x] **Ajuste de vista (2026-10-14)** — Estados de la sección de fotos: **sin imágenes**, botón a lo ancho **"Subir imágenes"** (mismo color que Enviar, abre la hoja Cámara/Galería) + texto secundario **"Son totalmente opcionales, pero muy recomendables."** y **sin recuadro discontinuo**; **con ≥1 imagen**, se mantiene la fila de miniaturas con el recuadro discontinuo "Añadir imagen"/"Recomendado" al final; título de sección **"Imágenes subidas (n):"** con contador dinámico. La lógica (hoja inferior, `SHEET_DISMISS_DELAY_MS`, envío) no cambió. Verificado: `npx expo lint` + `npx tsc --noEmit` OK y `npx jest --ci` con 15 suites / 110 tests en verde.
- [x] **Ajuste de vista 2 (2026-10-14)** — El tile de añadir al final de la fila (con ≥1 foto) pasa de recuadro discontinuo con icono compuesto (`image` + `arrow-upward`) y textos "Añadir imagen"/"Recomendado" a un único **"+"** (`MaterialIcons add`, color secundario) **sin borde, sin fondo y sin textos**, conservando `accessibilityLabel="Añadir imagen"` y el `ActivityIndicator` mientras procesa; el estado vacío (botón "Subir imágenes" + texto opcional) **no cambió**. Verificado: `npx expo lint` + `npx tsc --noEmit` OK y `npx jest --ci` con 15 suites / 111 tests en verde.
- [x] **Ajuste de vista 3 (2026-10-14)** — Estado vacío (0 imágenes) **sin cabecera ni botón a lo ancho**: un **"+" grande centrado** (`MaterialIcons add`, 48) con el texto **"¿Desea añadir imágenes?"** debajo, todo en un `Pressable` que abre la hoja Cámara/Galería (también al pulsar cerca) y con `ActivityIndicator` al procesar; el título de sección **"Imágenes subidas (n):"** se muestra **solo con n≥1**. Límite de adjuntos **`MAX_SELECTED_PHOTOS = 8`** exportado en `use-photo-attachment.ts` con **guard que ignora adjuntos al llegar a 8**; con 8 fotos el **tile "+" desaparece** y se muestra **en rojo** bajo los previews **"El número máximo de imágenes son 8"**; al quitar una, vuelve el "+" y desaparece el mensaje. Verificado: `npx expo lint` + `npx tsc --noEmit` OK y `npx jest --ci` con 15 suites / 115 tests en verde.

> Ampliación de fotos **completada**: T1–T7 y las pruebas/cierre están marcadas y verificadas
> (developer → compiler-checker → tester).

## Pendientes conocidos (detalles menores de UI)

- [ ] En el control de categoría con selección (`nombre ×`), separar un poco más el nombre y el símbolo "×".
- [ ] Igualar el padding horizontal del control de categoría: el lado derecho (junto a la "×") tiene menos padding que el izquierdo.
- [ ] Mejorar visualmente el botón de ubicación. Que se vea un círculo debajo del logo de la ubicación un poco grisáceo como los botones. 
- [ ] Barra diagonal al desactivar ubicación que se vea un poco más fina
- [ ] Si es una categoría personalizada, no puede superar los 15 caracteres

## Mantenimiento (checklist recurrente)

- [ ] Al cambiar el contrato de `Incident`, actualizar `src/types/incident.ts`, la semilla de `db.json` y los tests colocados.
- [ ] Mantener sincronizados los criterios de `spec.md` con los cambios de comportamiento del formulario.
- [ ] Al cambiar el contrato `Location`, actualizar `src/types/location.ts`, la colección `locations` de `db.json` y los tests colocados.
- [ ] Mantener `getIncidentWarnings` como única fuente de avisos previos al envío (descripción + ubicación).
- [ ] Al cambiar el contrato `IncidentImage`, actualizar `src/types/incident-image.ts`, la colección `images` de `db.json` y los tests colocados.
- [ ] Si cambia la API de `expo-image-picker` usada en `photo-picker.ts`, revisar los tests que la mockean (`jest.mock('expo-image-picker')`).

## Nota

> La feature **001** está implementada y verificada de extremo a extremo: registro base +
> **categoría opcional** + **rediseño UI** (control en Descripción) + **ajustes de UI (categoría)** +
> **ubicación (ampliación)** + **fotos (ampliación)**.
> `npx tsc --noEmit`, `npx expo lint` y los tests (`jest`, 15 suites / 108 tests) pasan en verde.
>
> La sección **"Ubicación (ampliación)"** está **implementada y verificada**
> (developer → compiler-checker → tester).
>
> La sección **"Fotos (ampliación)"** está **completada y verificada**: T1–T7 y las
> pruebas/cierre están terminadas (developer → compiler-checker → tester).

## Ampliación: conexión al backend

- [x] Alinear el contrato front↔backend (`title` 4–25, `description` opcional, `civicId` UUID, `categoryId`?/`category`?, coordenadas nullable).
- [x] Tipos `CreatedIncident`, `CreateIncidentResult` e `IncidentSource` en `src/types/incident.ts`.
- [x] `createIncident()` real-first: `POST /incidents` multipart con imágenes en el mismo POST (`src/services/incident.service.ts`).
- [x] Fallback al mock (`json-server`) sin conexión.
- [x] Hook `src/hooks/use-create-incident.ts` expone el origen del registro.
- [x] Aviso en `src/app/incidents/new.tsx`: "No se ha podido conectar al backend, realizando en el mock".
- [x] Notas de refactor en `spec/refactor/001-registro-incidencia/`.
- [ ] (Diferido) Unificar el límite de imágenes front/backend (issue #91; hoy el móvil recorta a 5).
- [ ] (Diferido) `civicId` desde auth/token de ciudadanía (issue #61; hoy UUID temporal).
- [ ] (Diferido) Revisar transporte multipart vs JSON si cambia el contrato del backend.
- [ ] (Backend, fuera del front) Persistencia duradera del backend; solo reportar.
