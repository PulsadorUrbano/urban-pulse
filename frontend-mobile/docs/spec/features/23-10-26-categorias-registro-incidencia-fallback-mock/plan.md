# 2026-10-23 — Plan de implementación: Categorías del registro de incidencia con lectura real-first y fallback visible al mock

> Crear únicamente este plan y su especificación. Copiar a frontend-mobile/docs/spec/features/DD-MM-YY-nombre-feature/plan.md.

- Objetivo: que el selector de categorías del registro de incidencia (`src/app/incidents/new.tsx`) consulte primero `GET /categories` del backend real y, ante cualquier fallo de ese endpoint (conexión, timeout o `!response.ok`), caiga al catálogo simulado del mock (`db.json` vía json-server) mostrando un aviso visible dentro de la hoja del selector con el motivo real cuando se conoce.
- Arquitectura: se reutiliza el patrón real-first/fallback ya validado en `src/services/incident.service.ts` (endpoints separados de backend y mock, helpers locales para describir errores de conexión y de rechazo del backend), adaptado a un GET de solo lectura donde, a diferencia de `createIncident`, cualquier fallo del backend (no solo de conexión) activa el fallback. No se crea ningún componente ni hook nuevo: se amplían `category.service.ts`, `use-categories.ts` y `category-picker.tsx` ya existentes.
- Herramientas: Expo/React Native y TypeScript estricto ya configurados en el proyecto; Jest + Testing Library ya instalados y en uso por los tests existentes de esta misma sub-feature. No se requiere ninguna dependencia nueva.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/registro-incidencia-frontend-mobile.
- Estado: Implementado y verificado.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `npx expo install` (nunca npm/yarn/pnpm/bun add) y requiere aprobación explícita previa. (No aplica en este plan: no se añade ninguna dependencia.)
- Backend y mock: real-first con fallback a mock, mostrando un aviso claro en pantalla si no hay conexión. Nunca borrar lógica o simulación mock que el backend aún no cubra de forma estable (regla dura: si hay duda, no se borra). No depurar ni arreglar el backend — si falla, reportarlo y continuar.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración salvo solicitud explícita.
- Preservar cambios ajenos y la rama acordada. No crear commits ni hacer push salvo petición explícita; no conectar al backend real fuera del alcance solicitado.
- Restricciones particulares:
  - `CATEGORIES_ENDPOINT` sigue exportándose (alias del endpoint del backend) para no romper el import ya existente en `src/__tests__/services/category.service.test.ts`.
  - `fetchCategoriesFromMock()` conserva exactamente el comportamiento actual de `fetchCategories()` (mensajes de error, timeout de 10 s vía `fetchWithTimeout`); no se reescribe su lógica, solo se renombra.
  - `Category` (`src/types/category.ts`) no se amplía con `createdAt`: cualquier implementación que lo añada se considera fuera de alcance.
  - `fallbackNotice` es un prop **required** (no opcional) en `CategoryPickerProps`, consistente con `errorMessage`; cualquier instanciación del componente (incluidos los tests) debe pasarlo explícitamente.
  - El aviso de fallback se renderiza únicamente dentro de la hoja (`Modal`) del selector, reutilizando `styles.errorText`; no se duplica en el trigger cerrado ni en otro punto de `new.tsx`.

## Focos de revisión

- Tipos incorrectos: `FetchCategoriesResult` debe usarse de forma consistente entre `category.service.ts`, `use-categories.ts` y los tests — el caso unitario de `use-categories.test.ts` con fixtures `{ categories, source, backendErrorMessage }` lo comprueba.
- Límite de comportamiento clave (decisión deliberada): un `!response.ok` del backend en `GET /categories` SÍ activa el fallback (a diferencia de `POST /incidents`) — cubierto por el caso "fallback por `!ok`" en `category.service.test.ts`.
- Null/omisión: `backendErrorMessage` debe ser `null` exactamente cuando `source === 'backend'`, y no nulo cuando `source === 'mock'` — cubierto por los casos de éxito y de fallback en `category.service.test.ts` y por las aserciones de `fallbackNotice` en `use-categories.test.ts`.
- Fallo total (doble fallo): el error del mock se propaga sin combinarlo con el del backend — cubierto por el caso "doble fallo" en `category.service.test.ts` y por el caso de error total en `use-categories.test.ts` (que además verifica `fallbackNotice: null`).
- Aislamiento de UI: el aviso de fallback no debe sustituir la lista de categorías ni el aviso de error de carga total — cubierto por el test nuevo en `category-picker.test.tsx` que verifica que `fallbackNotice` aparece junto a la lista.
- Compatibilidad hacia atrás: el fixture existente en `new-incident-screen.test.tsx` debe seguir compilando y pasando tras el cambio de forma del resultado de `fetchCategories` — cubierto por el ajuste puntual de esa línea.
- Permisos: no aplica (el endpoint `GET /categories` no requiere autenticación según su contrato documentado).

## Mapa de archivos

Rutas relativas a la raíz del repositorio (`frontend-mobile/`).

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/types/category.ts` | Añadir `CategorySource` y `FetchCategoriesResult`; `Category` no cambia. |
| Modificar | `src/services/category.service.ts` | Reescribir `fetchCategories()` como real-first/fallback; extraer `fetchCategoriesFromMock()` y helpers de error. |
| Modificar | `src/hooks/use-categories.ts` | Añadir `fallbackNotice` a `UseCategoriesResult`, componerlo en `.then`, resetearlo en `reload()`. |
| Modificar | `src/components/category-picker.tsx` | Añadir prop required `fallbackNotice` y renderizarlo en la hoja con `styles.errorText`. |
| Modificar | `src/app/incidents/new.tsx` | Cablear `fallbackNotice: categoriesFallbackNotice` del hook al `<CategoryPicker>`. |
| Modificar | `src/__tests__/services/category.service.test.ts` | Reescritura completa: patrón `jest.mock('@/services/http')`, casos de éxito/fallback/doble fallo. |
| Modificar | `src/__tests__/hooks/use-categories.test.ts` | Ajustar fixtures a `FetchCategoriesResult`; añadir casos de `fallbackNotice` y `reload()`. |
| Modificar | `src/__tests__/components/category-picker.test.tsx` | Añadir `fallbackNotice: null` por defecto y un test con aviso visible. |
| Modificar | `src/__tests__/app/incidents/new-incident-screen.test.tsx` | Ajustar la línea ~279 del fixture de `fetchCategories` a la nueva forma. |
| Actualizado (ya hecho por el organizador) | `CLAUDE.md` | Nuevo bullet sobre `backend/docs/spec/endpoint/` tras "Backend real + simulación mock". |
| Actualizar | `docs/spec/features/23-10-26-categorias-registro-incidencia-fallback-mock/spec.md` y este plan | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

No se toca `db.json` ni se añade ninguna entidad mock nueva: la entidad `categories` ya existe y no cambia de forma.

## Preparación

- [x] Leer CLAUDE.md, esta especificación, los archivos afectados y el estado de Git.
- [x] Revisar el contrato del endpoint en `backend/docs/spec/endpoint/get-categories/README.md` solo en modo lectura (hecho por el organizador durante la redacción de esta especificación; el `dev` no necesita repetirlo salvo duda).
- [x] Comprobar las versiones instaladas; consultar Context7 si se cambia una API o configuración de biblioteca (no se prevé ningún cambio de API de Expo/React Native en este plan).
- [x] Registrar el estado inicial de las comprobaciones pertinentes (lint, typecheck, tests de los 4 archivos afectados) antes de empezar, para distinguir problemas previos de los introducidos por esta sub-feature.

## Tarea 1: `src/types/category.ts` — añadir `CategorySource` y `FetchCategoriesResult`

**Archivos:** `src/types/category.ts`.

**Interfaces:**
```ts
export type CategorySource = 'backend' | 'mock';

export interface FetchCategoriesResult {
  categories: Category[];
  source: CategorySource;
  backendErrorMessage: string | null;
}
```

**Criterios cubiertos:** 1, 2, 3, 4, 5 (tipo base consumido por todas las demás tareas).

- [x] Definir el caso unitario relevante: no aplica un test dedicado para un archivo de solo tipos; su corrección se comprueba indirectamente vía `tsc --noEmit` y los tests de las tareas 2-4 que lo consumen.
- [x] Implementar el cambio mínimo: añadir `CategorySource` y `FetchCategoriesResult` sin modificar `Category` (no añadir `createdAt`).
- [x] Ejecutar `npx tsc --noEmit` y registrar el resultado.
- [x] Revisar el diff y actualizar la especificación y este plan si hay alguna desviación.

## Tarea 2: `src/services/category.service.ts` — reescritura real-first/fallback

**Archivos:** `src/services/category.service.ts`, `src/__tests__/services/category.service.test.ts`.

**Interfaces:**
- `BACKEND_CATEGORIES_ENDPOINT = \`${BACKEND_API_URL}/categories\``, `MOCK_CATEGORIES_ENDPOINT = \`${API_BASE_URL}/categories\``.
- `CATEGORIES_ENDPOINT` = alias de `BACKEND_CATEGORIES_ENDPOINT` (se mantiene exportado para no romper el import existente en el test).
- Helpers locales: `describeConnectionError(error: unknown): string`, `extractBackendErrorMessage(rawBody: string): string | null` (copiado de `incident.service.ts`), `describeBackendRejection(response: Response): Promise<string>`.
- `fetchCategoriesFromMock(): Promise<Category[]>` = lógica actual completa de `fetchCategories()`, renombrada, sin cambios de comportamiento.
- `fetchCategories(): Promise<FetchCategoriesResult>` = nueva función pública descrita en la especificación (sección "Diseño mínimo").

**Criterios cubiertos:** 1, 2, 3, 4.

- [x] Definir los casos unitarios relevantes en `category.service.test.ts` (reescritura completa migrando a `jest.mock('@/services/http')` + `fetchWithTimeoutMock` enrutado por URL, siguiendo el patrón de `incident.service.test.ts`): éxito del backend (sin tocar el mock); fallback por fallo de conexión; fallback por timeout; fallback por `!ok` con body `{ message }`; fallback por `!ok` con body no-JSON/sin `message`; doble fallo (backend y mock) propaga el error del mock; backend OK nunca llama al endpoint del mock.
- [x] Ejecutar `npx jest src/__tests__/services/category.service.test.ts` antes del cambio (con los tests ya reescritos contra la implementación vieja) y registrar el resultado observado (se espera que fallen, porque el contrato de retorno cambia).
- [x] Implementar el cambio mínimo descrito en "Interfaces" arriba, reutilizando el patrón ya validado de `incident.service.ts`.
- [x] Ejecutar `npx jest src/__tests__/services/category.service.test.ts` después del cambio y registrar el resultado.
- [x] Revisar el diff y actualizar la especificación y este plan.

## Tarea 3: `src/hooks/use-categories.ts` — exponer `fallbackNotice`

**Archivos:** `src/hooks/use-categories.ts`, `src/__tests__/hooks/use-categories.test.ts`.

**Interfaces:** `UseCategoriesResult` gana `fallbackNotice: string | null`. Depende de la Tarea 2 (`FetchCategoriesResult`).

**Criterios cubiertos:** 2, 3, 4.

- [x] Definir los casos unitarios relevantes en `use-categories.test.ts`: ajustar fixtures de `fetchCategories` a `{ categories, source, backendErrorMessage }`; caso `source: 'mock'` produce `fallbackNotice` con el texto compuesto esperado; caso de error total deja `fallbackNotice: null`; caso de `reload()` reseteando `fallbackNotice` a `null`.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-categories.test.ts` antes del cambio y registrar el resultado (se espera que falle por el cambio de forma del mock).
- [x] Implementar el cambio mínimo: consumir `FetchCategoriesResult` en el `.then`, componer `fallbackNotice` solo cuando `source === 'mock'`, fijarlo a `null` en el `.catch` y en `reload()`.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-categories.test.ts` después del cambio y registrar el resultado.
- [x] Revisar el diff y actualizar la especificación y este plan.

## Tarea 4: `src/components/category-picker.tsx` — prop `fallbackNotice`

**Archivos:** `src/components/category-picker.tsx`, `src/__tests__/components/category-picker.test.tsx`.

**Interfaces:** `CategoryPickerProps` gana `fallbackNotice: string | null` (required).

**Criterios cubiertos:** 5.

- [x] Definir el caso unitario relevante en `category-picker.test.tsx`: añadir `fallbackNotice: null` a las props por defecto de `renderCategoryPicker` (requerido, si no deja de compilar); test nuevo con `fallbackNotice` con texto verificando que aparece junto a la lista de categorías dentro de la hoja, sin sustituirla.
- [x] Ejecutar `npx jest src/__tests__/components/category-picker.test.tsx` antes del cambio y registrar el resultado (se espera error de compilación por el prop required faltante una vez añadidas las props por defecto).
- [x] Implementar el cambio mínimo: añadir el prop a la interfaz y a la desestructuración, renderizarlo dentro de la hoja con `styles.errorText`, justo después del bloque `isLoading`/`errorMessage` y antes de listar las categorías.
- [x] Ejecutar `npx jest src/__tests__/components/category-picker.test.tsx` después del cambio y registrar el resultado.
- [x] Revisar el diff y actualizar la especificación y este plan.

## Tarea 5: `src/app/incidents/new.tsx` — cablear `categoriesFallbackNotice`

**Archivos:** `src/app/incidents/new.tsx`, `src/__tests__/app/incidents/new-incident-screen.test.tsx`.

**Interfaces:** destructurar `fallbackNotice: categoriesFallbackNotice` de `useCategories()` y pasarlo a `<CategoryPicker fallbackNotice={categoriesFallbackNotice} ... />`. Depende de las Tareas 2-4.

**Criterios cubiertos:** 1, 2, 3, 5.

- [x] Ajustar el único cambio obligatorio en `new-incident-screen.test.tsx` (línea ~279): `mockedFetchCategories.mockResolvedValue([])` → `mockedFetchCategories.mockResolvedValue({ categories: [], source: 'backend', backendErrorMessage: null })`.
- [x] Ejecutar `npx jest src/__tests__/app/incidents/new-incident-screen.test.tsx` antes del cambio en `new.tsx` y registrar el resultado (se espera que falle por el error de tipos del fixture nuevo contra la pantalla vieja, o que el runtime no rompa pero el aviso no se renderice si hubiera una aserción nueva — no se añade ninguna aserción nueva en esta tarea, solo se mantiene el test existente compilando).
- [x] Implementar el cambio mínimo en `new.tsx`: renombrar la destructuración y pasar el prop nuevo al `<CategoryPicker>`.
- [x] Ejecutar `npx jest src/__tests__/app/incidents/new-incident-screen.test.tsx` después del cambio y registrar el resultado.
- [x] Revisar el diff y actualizar la especificación y este plan.

## Comprobaciones finales

Ejecutar desde frontend-mobile/.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests (4 archivos afectados) | `npx jest src/__tests__/services/category.service.test.ts src/__tests__/hooks/use-categories.test.ts src/__tests__/components/category-picker.test.tsx src/__tests__/app/incidents/new-incident-screen.test.tsx` | 4/4 suites, 55/55 tests en verde. |
| Typecheck | `npx tsc --noEmit` | Limpio, exit 0, sin errores. |
| Lint | `npx expo lint` | Limpio, exit 0, sin avisos. |
| Suite completa del proyecto | `npx jest` | 20/20 suites, 318/318 tests en verde, sin regresiones. |

- [x] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [x] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance (en particular: no tocar `src/services/incident.service.ts` ni `backend/`).

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-10-23.
- Resultado entregado: el selector de categorías de `src/app/incidents/new.tsx` consulta primero `GET /categories` del backend real (`fetchCategories()` en `category.service.ts`) y, ante cualquier fallo de conexión, timeout o `!response.ok`, cae automáticamente al catálogo del mock (`fetchCategoriesFromMock()`, json-server/`db.json`), exponiendo `fallbackNotice` desde `use-categories.ts` hasta `CategoryPicker`, que lo renderiza visible dentro de la hoja del selector junto a la lista de categorías, sin sustituirla.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Éxito del backend, sin fallback, sin aviso | Caso "backend OK nunca llama al endpoint del mock" en `src/__tests__/services/category.service.test.ts`; caso de carga exitosa sin `fallbackNotice` en `src/__tests__/hooks/use-categories.test.ts` | Cumplido |
| 2. Fallback por fallo de conexión/timeout con aviso compuesto | Casos "fallback por fallo de conexión" y "fallback por timeout" en `category.service.test.ts`; caso `source: 'mock'` produce `fallbackNotice` con texto compuesto en `use-categories.test.ts` | Cumplido |
| 3. Fallback por `!response.ok` con motivo real cuando esté disponible | Casos "fallback por `!ok` con body `{ message }`" y "con body no-JSON/sin `message`" en `category.service.test.ts` | Cumplido |
| 4. Doble fallo propaga error del mock; `fallbackNotice: null`; `reload()` resetea ambos | Caso "doble fallo" en `category.service.test.ts`; caso de error total con `fallbackNotice: null` y caso de `reload()` reseteando `fallbackNotice` en `use-categories.test.ts` | Cumplido |
| 5. `Category` sin `createdAt`; `fallbackNotice` required en `CategoryPicker` | `src/types/category.ts` (sin cambios en `Category`); props por defecto con `fallbackNotice: null` y test de aviso visible junto a la lista en `src/__tests__/components/category-picker.test.tsx`; `npx tsc --noEmit` limpio confirma el carácter required del prop | Cumplido |

- Comprobaciones: `npx tsc --noEmit` limpio (exit 0); `npx expo lint` limpio (exit 0); `npx jest` sobre los 4 archivos de test afectados: 4/4 suites, 55/55 tests en verde; suite completa del proyecto `npx jest`: 20/20 suites, 318/318 tests en verde, sin regresiones.
- Decisiones y desviaciones: durante la implementación se detectó que un caso de `reload()` en `use-categories.test.ts` estaba inicialmente mal construido (uso incorrecto de `act`/`await`); se corrigió y quedó en verde, sin impacto en el código de producción. Además se encontró y eliminó un archivo duplicado suelto sin trackear (`use-categories.test.ts` en la raíz de `frontend-mobile/`, creado por error por un subagente durante el proceso), fuera del alcance de esta sub-feature y sin impacto en producción ni en el archivo correcto de `src/__tests__/hooks/use-categories.test.ts`.
- Limitaciones y pendientes: ninguna. Las Tareas 1-5 quedan completas e implementadas por el `dev` y verificadas por el `tester`/`compiler`.

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente. No copiar resultados históricos ni prometer persistencia real por usar el mock (db.json) o tipos de src/types/.
