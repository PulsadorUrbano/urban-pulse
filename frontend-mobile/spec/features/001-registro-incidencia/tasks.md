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

## Pendientes conocidos (detalles menores de UI)

- [ ] En el control de categoría con selección (`nombre ×`), separar un poco más el nombre y el símbolo "×".
- [ ] Igualar el padding horizontal del control de categoría: el lado derecho (junto a la "×") tiene menos padding que el izquierdo.
- [ ] Mejorar visualmente el botón de ubicación. Que se vea un círculo debajo del logo de la ubicación un poco grisáceo como los botones. 
- [ ] Barra diagonal al desactivar ubicación que se vea un poco más fina

## Mantenimiento (checklist recurrente)

- [ ] Al cambiar el contrato de `Incident`, actualizar `src/types/incident.ts`, la semilla de `db.json` y los tests colocados.
- [ ] Mantener sincronizados los criterios de `spec.md` con los cambios de comportamiento del formulario.
- [ ] Al cambiar el contrato `Location`, actualizar `src/types/location.ts`, la colección `locations` de `db.json` y los tests colocados.
- [ ] Mantener `getIncidentWarnings` como única fuente de avisos previos al envío (descripción + ubicación).

## Nota

> La feature **001** está implementada y verificada de extremo a extremo: registro base +
> **categoría opcional** + **rediseño UI** (control en Descripción) + **ajustes de UI (categoría)** +
> **ubicación (ampliación)**.
> `npx tsc --noEmit`, `npx expo lint` y los tests (`jest`, 9 suites / 69 tests) pasan en verde.
>
> La sección **"Ubicación (ampliación)"** está **implementada y verificada**
> (developer → compiler-checker → tester).
