# 17-11-26 — Refactor: limpieza frontend-mobile · severidad alta

- Feature afectada: independiente (auditoría transversal de todo `frontend-mobile/`).
- Rama: `refactor/182-limpieza-frontend-mobile`.
- Última actualización: 2026-11-17.
- Estado: Implementado y verificado (verificación manual en dispositivo/Expo Go confirmada por la usuaria el 2026-11-17, tras el repaso final).
- Ver repaso final: [17-11-26-limpieza-frontend-mobile-repaso-final.md](./17-11-26-limpieza-frontend-mobile-repaso-final.md).

## Motivo

Tras una auditoría de solo lectura de todo `frontend-mobile/` contrastada con `CLAUDE.md` se detectaron incumplimientos y suciedad de código, agrupados en 3 niveles de severidad (3 documentos separados en `docs/spec/refactor/independent/`, todos con fecha 17-11-26). Este documento cubre únicamente los hallazgos de severidad **alta**: los que contradicen reglas duras del proyecto (mezcla de lógica de negocio con enrutado, datos mock incoherentes con el contrato de tipos) o afectan a la totalidad de dos carpetas del árbol (convención de nombres de archivo). Se abordan primero porque tienen mayor impacto en mantenibilidad/corrección, y porque la decisión de nombres de archivo condiciona cómo se referencian los archivos en los refactors de severidad media y baja.

## Alcance

- Alcance confirmado:
  1. **`db.json` con datos semilla contaminados**: la colección `images` tiene URIs `file://` de un dispositivo real concreto que no existen en otras máquinas (restos de sesiones de prueba filtrados tras el commit `7582849f`, "quitar guardado simulado de fotos móviles"). Además, 7 de los 8 registros de `incidents` no tienen los campos que exige `src/types/incident.ts` (`status`, `createdAt`, `locationId`, `urbanAssetId`, `departmentId`, `teamId`, `technicianId`).
  2. **Lógica de negocio fuera de hook en `incidents/new.tsx`**: la pantalla importa y orquesta directamente `src/services/device-location.ts` (permisos, disponibilidad de GPS, obtención de coordenadas) en ~58 líneas (`resolveLocationAndSubmit`), a diferencia de login/registro/categorías/creación de incidencia/fotos, que delegan esa orquestación a un hook propio (`useLogin`, `useRegister`, `useCategories`, `useCreateIncident`, `usePhotoAttachment`).
  3. **Convención de nombres de archivo incumplida de forma sistémica**: el 100% de los archivos de `src/components/` y `src/hooks/` usa kebab-case (`category-picker.tsx`, `use-login.ts`) en vez de `PascalCase.tsx`/`useCamelCase.ts`, como exigía `CLAUDE.md` (que desde ST-01 documenta kebab-case).
- Fuera de alcance: severidad media y baja (documentos aparte); no se toca `backend/` ni `database/` (solo lectura); no se cambia comportamiento observable de la UI salvo lo estrictamente necesario para mover la lógica de ubicación a un hook.
- Comportamiento preservado: el flujo de creación de incidencia con ubicación (con y sin GPS, con y sin permiso) debe verse y comportarse exactamente igual tras extraer la lógica al hook nuevo; el renombrado de archivos no cambia ningún comportamiento, solo rutas de import.

## Archivos tocados (plan)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `CLAUDE.md` | Sustituir las 2 líneas de la sección Convenciones que piden PascalCase/camelCase para nombres de archivo de `src/components/`/`src/hooks/` por kebab-case (convención real y ya vigente en el 100% del árbol), dejando claro que el export principal sigue en PascalCase/camelCase. |
| Modificar | `db.json` | En `incidents`, añadir `status: "reported"` y `createdAt` (timestamp ISO) a los 7 registros que no los tienen; sustituir la colección `images` completa por `[]`. No tocar `locations` ni el resto de campos. |
| Crear | `src/hooks/use-incident-location-submit.ts` | Extraer de `incidents/new.tsx` las funciones `submitWithCoordinates`, `resolveLocationAndSubmit` y `startSubmit`, más los 4 `useState` asociados (`createdIncident`, `locationNotice`, `backendFallbackNotice`, `isResolvingLocation`). Recibe `{ isLocationEnabled, title, description, categoryId, category, selectedPhotoUris, submitIncident }`; devuelve `{ isResolvingLocation, locationNotice, backendFallbackNotice, createdIncident, startSubmit }`. |
| Modificar | `src/app/incidents/new.tsx` | Sustituir las llamadas directas a `device-location.ts` y la lógica de envío por el uso del hook nuevo; quitar el import de `@/services/device-location` y de `Linking` si ya no se usan tras la extracción. |
| Crear | `src/__tests__/hooks/use-incident-location-submit.test.ts` | Test del hook siguiendo el patrón de `src/__tests__/hooks/use-create-incident.test.tsx`, con mock de `@/services/device-location`; cubrir ubicación desactivada por preferencia, GPS desactivado, sin permiso, coordenadas no resueltas y camino feliz. |

> Decisión de convención de nombres ya tomada por la usuaria: se mantiene kebab-case en `src/components/`/`src/hooks/` (documentado en `CLAUDE.md`), no se renombra ningún archivo existente.

## Verificación / pasos a seguir

- [x] **ST-01 — `CLAUDE.md`**: documentar kebab-case como convención oficial de nombres de archivo en `src/components/`/`src/hooks/`. Verificado por `compiler`.
- [x] **ST-02 — `db.json`**: añadir `status`/`createdAt` a los 7 registros de `incidents` que no los tienen; vaciar la colección `images` a `[]`. Verificado por `compiler`.
- [x] **ST-03 — hook `useIncidentLocationSubmit` + `incidents/new.tsx`**: crear `src/hooks/use-incident-location-submit.ts` y modificar `incidents/new.tsx` para usarlo en el mismo cambio (no dejar la extracción a medias). Verificado por `compiler`.
- [x] **ST-04 — test del hook** (depende de ST-03): crear `src/__tests__/hooks/use-incident-location-submit.test.ts` cubriendo los 5 escenarios descritos arriba. Corregidos los 3 errores de tipos detectados en la primera entrega (acotación de `createdIncident.description` y de `getLastAlertTitle`). Verificado por `compiler`.
- [x] `pnpm expo lint` y `pnpm tsc --noEmit` sin errores nuevos tras cada subtarea. `tsc --noEmit` 0 errores; `expo lint` 0 errores (2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, fuera del alcance de esta fase).
- [x] `pnpm test` en verde tras ST-03/ST-04; confirmar que `src/__tests__/app/incidents/new-incident-screen.test.tsx` sigue en verde sin cambios. 44 suites / 637 tests en verde, sin regresiones.
- [x] Verificación manual/por test del flujo de creación de incidencia con ubicación (con/sin GPS, con/sin permiso) tras ST-03, en dispositivo/Expo Go real. Confirmada por la usuaria (2026-11-17).

## Confirmación

- Estado final: Completado. Las 4 subtareas (ST-01 a ST-04) están implementadas y verificadas por `compiler`.
- Fecha de revisión: 2026-11-17.
- Resultado entregado:
  - `CLAUDE.md` documenta kebab-case como convención oficial de nombres de archivo en `src/components/`/`src/hooks/`.
  - `db.json` con los 7 registros de `incidents` completados (`status`, `createdAt`) y la colección `images` vaciada a `[]`.
  - `src/hooks/use-incident-location-submit.ts` extrae toda la orquestación de ubicación (permisos, GPS, envío) fuera de `src/app/incidents/new.tsx`, que ahora solo consume el hook.
  - `src/__tests__/hooks/use-incident-location-submit.test.ts` cubre los 5 escenarios (ubicación desactivada por preferencia, GPS desactivado, sin permiso, coordenadas no resueltas, camino feliz).
  - Verificación final: `pnpm tsc --noEmit` 0 errores; `pnpm expo lint` 0 errores; `pnpm test` 44 suites / 637 tests en verde.
- Decisiones y desviaciones:
  - `db.json`: se aplicó un **fix mínimo** (añadir los campos que faltaban a los registros existentes y vaciar `images`) en vez de una regeneración completa del fixture, para minimizar el riesgo de romper otras features que ya dependen de los IDs/relaciones actuales de `incidents`/`locations`.
  - Convención de nombres de archivo: se decidió **documentar kebab-case en `CLAUDE.md`** como estándar oficial (reflejando el estado real del 100% de `src/components/`/`src/hooks/`) en vez de renombrar todo el árbol a PascalCase/camelCase, evitando un refactor masivo de bajo valor y alto riesgo de romper imports.
  - ST-04 tuvo una iteración de corrección: la primera entrega del test falló `tsc --noEmit` por 3 errores de tipado (acotación de `createdIncident.description` y del valor de retorno de `getLastAlertTitle`); se devolvió a `tester` para corregirlos sin tocar `dev`, ya que el archivo afectado era exclusivamente de test.
- Limitaciones y pendientes:
  - Verificación manual del flujo de ubicación en dispositivo/Expo Go real sigue pendiente (no cubierta por el `compiler`, requiere interacción humana).
  - Se detectaron 2 posibles bugs preexistentes durante la escritura de los tests (no introducidos por este refactor, la lógica se movió tal cual desde `incidents/new.tsx`), registrados en `docs/spec/bugs/todo.md` bajo la sección nueva "Registro incidencia (ubicación)" (17-11-26): posible doble envío al continuar sin ubicación desde el aviso, y rechazos de promesa no capturados en el flujo de ubicación (`resolveLocationAndSubmit`/`submitWithCoordinates` sin `catch`).
