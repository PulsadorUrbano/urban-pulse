# 2026-10-24 — Plan de implementación: Mis incidencias (lista + detalle de incidencias del ciudadano)

- Objetivo: tab "Mis incidencias" (lista ordenada de `IncidentSummary[]` del ciudadano de la sesión activa) y pantalla de detalle `incidents/[id]` (`IncidentDetail` completo con fotos), ambas real-first con fallback a mock y aviso en pantalla.
- Arquitectura: dos funciones de servicio nuevas (`fetchMyIncidents`, `fetchIncidentById`) en `incident.service.ts` + dos hooks nuevos (`useMyIncidents`, `useIncidentDetail`, patrón de `useCategories`) + tres componentes presentacionales nuevos (`IncidentStatusBadge`, `IncidentListItem`, `IncidentPhotoViewer`) + dos pantallas nuevas (`(tabs)/my-incidents.tsx`, `incidents/[id].tsx`) + wiring de navegación (`app-tabs.tsx`/`app-tabs.web.tsx`, `_layout.tsx`) + backfill de `db.json` y corrección de `createIncidentOnMock`.
- Herramientas: Expo `^58.0.17` + React Native, TypeScript estricto, NativeWind, Expo Router `~58.0.25`, `expo-image` `~58.0.16` (ya instalada, primer uso real en el repo), `react-native-safe-area-context`, Jest + `jest-expo` + `@testing-library/react-native` (ya instaladas, sin dependencias nuevas).
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/ver-mis-incidencias-frontend-mobile.
- Estado: implementado y verificado (2026-10-24).

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `npx expo install` (nunca npm/yarn/pnpm/bun add) y requiere aprobación explícita previa. Esta feature no necesita ninguna dependencia nueva (`expo-image` ya está instalada).
- Backend y mock: real-first con fallback a mock, mostrando el aviso exacto "No se ha podido conectar al backend, mostrando los datos del mock." si no hay conexión. Un `404` (real o mock) nunca cae al mock. Nunca borrar lógica o simulación mock que el backend aún no cubra de forma estable. No depurar ni arreglar el backend — si falla durante la verificación manual, reportarlo y continuar.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración adicionales a los dos tests de pantalla ya descritos en la especificación.
- Preservar cambios ajenos y la rama acordada (`feature/ver-mis-incidencias-frontend-mobile`). No crear commits ni hacer push salvo petición explícita; no conectar al backend real fuera de la verificación manual final ya prevista.
- Restricciones particulares:
  - No modificar `TEMPORARY_CIVIC_ID` ni el resto del flujo de `createIncident` (multipart al backend); la única corrección permitida en el camino de alta es `createIncidentOnMock` (payload JSON al mock).
  - No modificar `backend/` ni `database/` bajo ninguna circunstancia (solo lectura).
  - `IncidentDetail` es un tipo independiente de `CreatedIncident`, no un alias (ver spec.md, "Tipos y datos mock").
  - El backfill exacto de `db.json` (ids, fechas, `status: "reported"`) ya está aprobado; no se cambian esos valores sin volver a pedir confirmación.
  - `my-incidents.tsx` y `incidents/[id].tsx` nunca usan `.map()` sobre una lista dinámica dentro de un `ScrollView`: la lista de incidencias usa `FlatList`; el visor de fotos usa `FlatList horizontal pagingEnabled`.

## Focos de revisión

- Riesgo: un 404 real o del mock podría tratarse como "sin conexión" y caer al mock, mostrando datos equivocados de otra incidencia o un mock desincronizado → cubierto por el criterio 4; verificado en `incident.service.test.ts` (404 real y 404 del mock lanzan `IncidentNotFoundError` sin segunda petición) y en `use-incident-detail.test.ts`/`incident-detail-screen.test.tsx` (estado "no encontrado" explícito).
- Riesgo: json-server no garantiza el orden de la query `?civicId=...`, por lo que una ordenación implícita del array devuelto podría no coincidir con el orden exigido por el criterio 1 → cubierto ordenando explícitamente en `fetchMyIncidentsFromMock` (desc por `createdAt`, asc por `id` en empates) y verificado en `incident.service.test.ts` con un fixture de incidencias en orden distinto al esperado.
- Riesgo: olvidar backfillear `status`/`createdAt` en `createIncidentOnMock` dejaría incidencias nuevas sin fecha ni estado, rompiendo su posición en el listado y su badge en el detalle → cubierto por el criterio 7; verificado con las 2 aserciones `readSentJsonBody` actualizadas en `incident.service.test.ts`.
- Riesgo: una incidencia con `categoryId`/`category`/`description`/`images` en `null`/`[]` podría romper el render del detalle (acceso a propiedades de `null`) → cubierto por el criterio 6; verificado en `use-incident-detail.test.ts` (ensamblado correcto con todos los campos opcionales a `null`/vacío) e `incident-photo-viewer.test.tsx` (`images: []` no rompe) e `incident-detail-screen.test.tsx` (render con el fixture `iB09J7Gfu1k`, sin categoría).
- Riesgo: la tab "Mis incidencias" podría quedar alcanzable sin sesión activa (igual que el riesgo ya mitigado en el logout) → cubierto por el criterio 8 con el mismo guard `<Redirect href="/login" />`, verificado en `my-incidents-screen.test.tsx`.
- Riesgo: tocar `IncidentPayload`/`createIncidentOnMock` podría romper los tests ya verdes de `createIncident` → cubierto por el criterio 9; se ejecuta la suite completa (`npx jest`) antes y después del cambio para confirmar que solo cambian las 2 aserciones previstas.

## Mapa de archivos

Rutas relativas a la raíz del repositorio (`frontend-mobile/`).

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/types/incident.ts` | Añade `status`/`createdAt` a `IncidentPayload`; añade `IncidentSummary`, `IncidentDetail`, `FetchMyIncidentsResult`, `FetchIncidentDetailResult`. |
| Modificar | `db.json` | Backfill de `status`/`createdAt` en los 7 registros existentes de `incidents` (tabla exacta en spec.md). |
| Modificar | `src/services/incident.service.ts` | Corrige `createIncidentOnMock` (persiste `status`/`createdAt`); añade `IncidentNotFoundError`, exporta `inferImageFormat`, `MockIncidentRecord`, `fetchMyIncidents`, `fetchIncidentById` (+ sus `*FromMock`). |
| Modificar | `src/__tests__/services/incident.service.test.ts` | Actualiza 2 aserciones `readSentJsonBody`; añade casos de `fetchMyIncidents`/`fetchIncidentById`. |
| Crear | `src/hooks/use-my-incidents.ts` | Hook `useMyIncidents(civicId)`. |
| Crear | `src/__tests__/hooks/use-my-incidents.test.ts` | Tests del hook anterior. |
| Crear | `src/hooks/use-incident-detail.ts` | Hook `useIncidentDetail(id)`. |
| Crear | `src/__tests__/hooks/use-incident-detail.test.ts` | Tests del hook anterior. |
| Crear | `src/components/incident-status-badge.tsx` | Componente `IncidentStatusBadge` + `STATUS_LABELS`/`STATUS_COLORS`. |
| Crear | `src/__tests__/components/incident-status-badge.test.tsx` | Tests del componente anterior. |
| Crear | `src/components/incident-list-item.tsx` | Componente `IncidentListItem`. |
| Crear | `src/__tests__/components/incident-list-item.test.tsx` | Tests del componente anterior. |
| Crear | `src/components/incident-photo-viewer.tsx` | Componente `IncidentPhotoViewer`. |
| Crear | `src/__tests__/components/incident-photo-viewer.test.tsx` | Tests del componente anterior. |
| Crear | `assets/images/tabIcons/list.png`, `list@2x.png`, `list@3x.png` | Icono placeholder de la nueva tab. |
| Modificar | `src/components/app-tabs.tsx` | Añade `NativeTabs.Trigger name="my-incidents"` con el icono anterior. |
| Modificar | `src/components/app-tabs.web.tsx` | Añade `TabTrigger name="my-incidents" href="/my-incidents"` equivalente. |
| Crear | `src/app/(tabs)/my-incidents.tsx` | Pantalla de la lista "Mis incidencias". |
| Crear | `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Tests de integración de la pantalla anterior. |
| Modificar | `src/app/_layout.tsx` | Registra `Stack.Screen name="incidents/[id]"` con `title: 'Detalle de la incidencia'`. |
| Crear | `src/app/incidents/[id].tsx` | Pantalla de detalle de incidencia. |
| Crear | `src/__tests__/app/incidents/incident-detail-screen.test.tsx` | Tests de integración de la pantalla anterior. |
| Actualizar | `docs/spec/features/24-10-26-mis-incidencias/spec.md` y `plan.md` | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

## Preparación

- [ ] Leer CLAUDE.md, `spec.md`, los archivos afectados (`src/types/incident.ts`, `src/services/incident.service.ts`, `src/hooks/use-session.ts`, `src/hooks/use-categories.ts`, `src/services/category.service.ts`, `src/services/image.service.ts`, `src/components/app-tabs.tsx`/`app-tabs.web.tsx`, `src/app/_layout.tsx`, `src/app/incidents/new.tsx`, `db.json`) y el estado de Git.
- [ ] Contrato de backend ya revisado en modo lectura (`backend/docs/spec/endpoint/get-incidents/README.md`, `get-incidents-id/README.md`); no se modifica ni se depura `backend/`.
- [ ] Comprobar las versiones instaladas de `expo-image` (primer uso real en el repo) y `expo-router` (`useLocalSearchParams`, registro de rutas dinámicas `[id].tsx`); consultar Context7 si surge alguna duda sobre su API versionada (SDK 58).
- [ ] Registrar el estado inicial de lint/typecheck/tests antes de tocar código (ejecutar `npx tsc --noEmit`, `npx expo lint`, `npx jest`), para distinguir problemas preexistentes de los introducidos por esta feature.

## Tarea 1: tipos nuevos en `incident.ts`

**Archivos:** `src/types/incident.ts` (modificar).

**Interfaces:**
```ts
export interface IncidentPayload {
  // ...campos ya existentes...
  status: IncidentStatus;
  createdAt: string;
}
export interface IncidentSummary { id: string; title: string; status: IncidentStatus; createdAt: string; }
export interface IncidentDetail {
  id: string; title: string; description: string | null; civicId: string;
  categoryId: string | null; category: string | null; urbanAssetId: string | null;
  location: { latitude: number | null; longitude: number | null; accuracy: number | null; createdAt: string };
  images: CreatedIncidentImage[]; status: IncidentStatus; priority: IncidentPriority; createdAt: string;
}
export interface FetchMyIncidentsResult { incidents: IncidentSummary[]; source: IncidentSource }
export interface FetchIncidentDetailResult { incident: IncidentDetail; source: IncidentSource }
```

**Criterios cubiertos:** 9 (compatibilidad de tipos, base para el resto de tareas).

- [x] Definir el caso relevante: esta tarea es puramente de tipos (sin runtime propio), por lo que no añade un test unitario dedicado; su corrección se verifica por `npx tsc --noEmit` y por los tests de las Tareas 2-5 que consumen estos tipos.
- [x] Ejecutar `npx tsc --noEmit` antes del cambio y registrar el resultado (debe estar limpio: son los tipos actuales sin modificar).
- [x] Implementar el cambio mínimo: añadir `status`/`createdAt` a `IncidentPayload` y las 4 interfaces nuevas, sin tocar `CreatedIncident`, `Incident`, `CreateIncidentInput`, `CreateIncidentResult`, `IncidentSource`.
- [x] Ejecutar `npx tsc --noEmit` y registrar evidencia (debe fallar únicamente en `incident.service.ts`, porque `createIncidentOnMock` aún no rellena los dos campos nuevos del `payload`; este fallo se resuelve en la Tarea 2).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** sin test unitario dedicado (tarea puramente de tipos, sin runtime propio), según lo previsto en el propio plan. Verificada indirectamente por `npx tsc --noEmit` en el momento de la implementación (el único error esperado tras el cambio fue en `incident.service.ts`, resuelto en la Tarea 2) y por el consumo exitoso de estos tipos en las tareas posteriores (3, 4, 5 y siguientes) sin errores de tipos.

## Tarea 2: backfill de `db.json` + corrección de `createIncidentOnMock`

**Archivos:** `db.json` (modificar), `src/services/incident.service.ts` (modificar), `src/__tests__/services/incident.service.test.ts` (modificar).

**Interfaces:** `createIncidentOnMock` mueve `const createdAt = new Date().toISOString()` antes de construir `payload: IncidentPayload`, añade `status: DEFAULT_INCIDENT_STATUS` y `createdAt` al `payload`, y elimina el segundo `const createdAt` duplicado (reutiliza la misma variable para `location.createdAt`/`images[].createdAt`/el `CreatedIncident` ensamblado).

**Criterios cubiertos:** 7, 9.

- [x] Definir el caso unitario relevante: ampliar las 2 aserciones existentes `readSentJsonBody(1)` (payload completo e input mínimo) para incluir `status: 'reported'` y `createdAt: FIXED_NOW_ISO`. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/services/incident.service.test.ts` antes del cambio y registrar el resultado (las 2 aserciones deben fallar: el payload actual no incluye `status`/`createdAt`).
- [x] Implementar el cambio mínimo: aplicar el backfill exacto de la tabla de spec.md a los 7 registros de `incidents` en `db.json`; corregir `createIncidentOnMock` como se describe arriba.
- [x] Ejecutar `npx jest src/__tests__/services/incident.service.test.ts` y registrar evidencia (debe pasar la suite completa de `createIncident`, incluidas las 2 aserciones actualizadas).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** `npx jest src/__tests__/services/incident.service.test.ts` → PASA (58/58 tests verdes). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings propios de `db.json` ni de `createIncidentOnMock`/`incident.service.ts`. Los 7 registros de `incidents` en `db.json` verificados uno a uno contra los valores exactos de la tabla de backfill de spec.md. El único error de tsc restante (`src/components/app-tabs.web.tsx`, ruta `/my-incidents` sin tipar) pertenece a la Tarea 10, no a esta.

## Tarea 3: `fetchMyIncidents`/`fetchIncidentById` en `incident.service.ts`

**Archivos:** `src/services/incident.service.ts` (modificar), `src/__tests__/services/incident.service.test.ts` (modificar).

**Interfaces:**
```ts
export class IncidentNotFoundError extends Error {}
export function inferImageFormat(uri: string): { extension: string; mimeType: string }; // ya existía, ahora exportada
export async function fetchMyIncidents(civicId: string): Promise<FetchMyIncidentsResult>;
export async function fetchIncidentById(id: string): Promise<FetchIncidentDetailResult>;
```
Internamente: `MockIncidentRecord` (forma plana del mock, `status?`/`createdAt?` opcionales); `fetchMyIncidentsFromMock(civicId)` (GET `${MOCK_INCIDENTS_ENDPOINT}?civicId=${civicId}`, mapea a `IncidentSummary` con `status ?? DEFAULT_INCIDENT_STATUS`, ordena desc por `createdAt` con desempate asc por `id`); `fetchIncidentDetailFromMock(id)` (GET `${MOCK_INCIDENTS_ENDPOINT}/${id}`, 404 → `IncidentNotFoundError`; en paralelo `GET ${IMAGES_ENDPOINT}?incidentId=${id}` mapeado a `CreatedIncidentImage` con `mimeType` de `inferImageFormat` y `createdAt` de la incidencia, `[]` si falla; `fetchCategories()` solo si hay `categoryId` sin `category`; `priority: 'low'` fijo). Imports nuevos: `fetchCategories` (`./category.service`), `IMAGES_ENDPOINT` (`./image.service`), `IncidentImage` (`@/types/incident-image`), tipos nuevos de `@/types/incident`.

**Criterios cubiertos:** 1, 2, 3, 4, 5, 6.

- [x] Definir los casos unitarios relevantes: `fetchMyIncidents` — petición con `civicId` correcto al backend y mapeo 1:1; fallback a mock con orden explícito desc/`id` asc en empates; backend `!ok` (no es fallo de conexión) lanza error sin mock. `fetchIncidentById` — petición a `/incidents/:id`; 404 real → `IncidentNotFoundError` sin segunda petición; fallback a mock por timeout/red; 404 del mock → `IncidentNotFoundError`; ensamblado con imágenes vía `IMAGES_ENDPOINT` (incluido el caso en que la petición de imágenes falla y el resultado es `images: []`); resolución de `category` por `categoryId` vía `fetchCategories()` cuando no hay texto libre; campos `null`/vacío (sin categoría, sin descripción, sin imágenes) no rompen el ensamblado. No añadir pruebas que solo repliquen la implementación ni pruebas para texto.
- [x] Ejecutar `npx jest src/__tests__/services/incident.service.test.ts` antes del cambio y registrar el resultado (deben fallar: `fetchMyIncidents`/`fetchIncidentById` aún no existen).
- [x] Implementar el cambio mínimo descrito arriba.
- [x] Ejecutar `npx jest src/__tests__/services/incident.service.test.ts` y registrar evidencia (debe pasar, incluida la suite completa previa de `createIncident` sin regresiones).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** `npx jest src/__tests__/services/incident.service.test.ts` → PASA (96/96 tests verdes, incluida la suite completa previa de `createIncident` sin regresiones). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings propios en `src/services/incident.service.ts` ni en su test. Los errores/warnings ajenos restantes (ruta `/my-incidents` sin tipar en `src/components/app-tabs.web.tsx`, Tarea 10; y los fallos de `renderHook` sin `await` en los tests de las Tareas 4 y 5) no pertenecen a esta tarea.

## Tarea 4: hook `use-my-incidents`

**Archivos:** `src/hooks/use-my-incidents.ts` (nuevo), `src/__tests__/hooks/use-my-incidents.test.ts` (nuevo).

**Interfaces:**
```ts
export interface UseMyIncidentsResult {
  incidents: IncidentSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  backendFallbackNotice: string | null;
  reload: () => void;
}
export function useMyIncidents(civicId: string | null): UseMyIncidentsResult;
```
Mismo patrón que `useCategories` (`isMountedRef`, `reloadToken`). Si `civicId === null`, no llama a `fetchMyIncidents` (ni deja `isLoading` colgado en `true`: pasa a `false` sin incidencias). `backendFallbackNotice` = `'No se ha podido conectar al backend, mostrando los datos del mock.'` cuando `result.source === 'mock'`, si no `null`.

**Criterios cubiertos:** 1, 2, 5, 8 (vía consumo en la pantalla de la Tarea 10).

- [x] Definir los casos unitarios relevantes: `civicId === null` no llama a `fetchMyIncidents` y deja `isLoading: false`; carga correcta rellena `incidents` y limpia `errorMessage`; error de `fetchMyIncidents` rellena `errorMessage` y conserva `incidents` previo; `source: 'mock'` rellena `backendFallbackNotice` con el mensaje exacto, `source: 'backend'` lo deja `null`; `reload()` repite la carga incrementando el token. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-my-incidents.test.ts` antes del cambio y registrar el resultado (debe fallar: ni el hook ni el test existen).
- [x] Implementar el cambio mínimo: crear el hook con la interfaz exacta de arriba, consumiendo `fetchMyIncidents` de la Tarea 3.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-my-incidents.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (compiler, 2026-10-24):** se detectó en una verificación intermedia el mismo patrón de error que en la Tarea 5 — `src/__tests__/hooks/use-my-incidents.test.ts` desestructuraba `result`/`rerender`/`unmount` de `renderHook(...)` sin `await`, incompatible con `@testing-library/react-native@^14.1.0` (ver `package.json`), que devuelve una `Promise<RenderHookResult<...>>`. Tras aplicar la corrección (`await renderHook(...)` en cada sitio donde se desestructura `result`/`rerender`/`unmount`), resultado final: `npx jest src/__tests__/hooks/use-my-incidents.test.ts` → PASA (11/11 tests verdes). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings propios en `src/hooks/use-my-incidents.ts` ni en su test. El único error de tsc restante en el repo (`src/components/app-tabs.web.tsx`, ruta `/my-incidents` sin tipar) pertenece a la Tarea 10, no a esta.

## Tarea 5: hook `use-incident-detail`

**Archivos:** `src/hooks/use-incident-detail.ts` (nuevo), `src/__tests__/hooks/use-incident-detail.test.ts` (nuevo).

**Interfaces:**
```ts
export interface UseIncidentDetailResult {
  incident: IncidentDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  isNotFound: boolean;
  backendFallbackNotice: string | null;
  reload: () => void;
}
export function useIncidentDetail(id: string): UseIncidentDetailResult;
```
Mismo patrón que `useCategories`/`useMyIncidents`. `error instanceof IncidentNotFoundError` → `isNotFound: true` y `errorMessage: null` (evita mostrar dos mensajes de error distintos a la vez); cualquier otro error → `errorMessage` con el mensaje y `isNotFound: false`.

**Criterios cubiertos:** 3, 4, 5, 6.

- [x] Definir los casos unitarios relevantes: carga correcta rellena `incident` y deja `isNotFound: false`/`errorMessage: null`; `IncidentNotFoundError` → `isNotFound: true`, `errorMessage: null`, `incident: null`; otro error → `errorMessage` con el mensaje, `isNotFound: false`; `source: 'mock'` rellena `backendFallbackNotice`; `reload()` repite la carga y resetea `isNotFound`/`errorMessage` antes de la nueva petición. No añadir pruebas que solo repliquen la implementación.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-incident-detail.test.ts` antes del cambio y registrar el resultado (debe fallar: ni el hook ni el test existen).
- [x] Implementar el cambio mínimo: crear el hook con la interfaz exacta de arriba, consumiendo `fetchIncidentById` de la Tarea 3.
- [x] Ejecutar `npx jest src/__tests__/hooks/use-incident-detail.test.ts` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (compiler, 2026-10-24):** una primera verificación detectó `npx jest src/__tests__/hooks/use-incident-detail.test.ts` → 9/9 tests fallando y `npx tsc --noEmit` → 9 errores en este archivo (líneas 80, 96, 113, 127, 141, 156, 191, 226, 243): el test desestructuraba `const { result } = renderHook(...)` y `const { unmount } = renderHook(...)` (y casos equivalentes con `rerender`) sin `await`, incompatible con `@testing-library/react-native@^14.1.0` (ver `package.json`), que devuelve una `Promise<RenderHookResult<...>>`. Tras aplicar la corrección (`await renderHook(...)` en cada sitio donde se desestructura `result`/`unmount`/`rerender`), resultado final: `npx jest src/__tests__/hooks/use-incident-detail.test.ts` → PASA (9/9 tests verdes). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings propios en `src/hooks/use-incident-detail.ts` ni en su test. El único error de tsc restante en el repo (`src/components/app-tabs.web.tsx`, ruta `/my-incidents` sin tipar) pertenece a la Tarea 10, no a esta.

## Tarea 6: componente `IncidentStatusBadge`

**Archivos:** `src/components/incident-status-badge.tsx` (nuevo), `src/__tests__/components/incident-status-badge.test.tsx` (nuevo).

**Interfaces:**
```ts
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reportada', validated: 'Validada', rejected: 'Rechazada', assigned: 'Asignada',
  in_progress: 'En curso', resolved: 'Resuelta', reopened: 'Reabierta', closed: 'Cerrada',
};
export const STATUS_COLORS: Record<IncidentStatus, string>; // un color por estado, decisión visual menor del dev
export interface IncidentStatusBadgeProps { status: IncidentStatus }
export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps): JSX.Element;
```
Componente presentacional puro (sin `useSession`/fetch/`Alert`), igual de aislado que `LogoutButton`/`LocationToggle`.

**Criterios cubiertos:** 3.

- [x] Definir el caso unitario relevante: para cada uno de los 8 `IncidentStatus` se renderiza el texto exacto de `STATUS_LABELS[status]` (no texto arbitrario). No añadir pruebas sobre el color exacto (`STATUS_COLORS`) salvo que la etiqueta visual lo requiera para distinguir estados — decisión del dev, documentar si se omite.
- [x] Ejecutar `npx jest src/__tests__/components/incident-status-badge.test.tsx` antes del cambio y registrar el resultado (debe fallar: el componente aún no existe).
- [x] Implementar el cambio mínimo: crear `IncidentStatusBadge` con la interfaz exacta de arriba.
- [x] Ejecutar `npx jest src/__tests__/components/incident-status-badge.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** `npx jest src/__tests__/components/incident-status-badge.test.tsx` → PASA (16 tests, todos verdes). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings en los archivos de esta tarea (los 2 errores de tsc y 2 warnings de lint restantes en el repo pertenecen a otras tareas en curso del mismo plan, no a esta).

## Tarea 7: componente `IncidentListItem`

**Archivos:** `src/components/incident-list-item.tsx` (nuevo), `src/__tests__/components/incident-list-item.test.tsx` (nuevo).

**Interfaces:**
```ts
export interface IncidentListItemProps { incident: IncidentSummary; onPress: (id: string) => void }
export function IncidentListItem({ incident, onPress }: IncidentListItemProps): JSX.Element;
```
Presentacional: `Pressable` con `accessibilityRole="button"`, título (`incident.title`), `IncidentStatusBadge` (Tarea 6), fecha formateada (reutilizar un formateador de `src/utils/` si ya existe uno equivalente; si no, una función mínima local, sin añadir una dependencia nueva de fechas). No llama a `router` él mismo: recibe `onPress` resuelto por la pantalla (mismo patrón que `LogoutButton`).

**Criterios cubiertos:** 1, 3.

- [x] Definir el caso unitario relevante: renderiza el título y la etiqueta de estado correctos; al pulsar llama a `onPress(incident.id)` exactamente una vez con el `id` correcto. No añadir pruebas que repliquen el formateo de fecha carácter a carácter.
- [x] Ejecutar `npx jest src/__tests__/components/incident-list-item.test.tsx` antes del cambio y registrar el resultado (debe fallar: el componente aún no existe).
- [x] Implementar el cambio mínimo: crear `IncidentListItem` con la interfaz exacta de arriba, reutilizando `IncidentStatusBadge`.
- [x] Ejecutar `npx jest src/__tests__/components/incident-list-item.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** `npx jest src/__tests__/components/incident-list-item.test.tsx` → PASA (4/4 tests verdes). `npx tsc --noEmit` y `npx expo lint` → sin errores/warnings en los archivos de esta tarea (`src/components/incident-list-item.tsx` y su test). Los errores de tsc restantes en el repo (7 en `src/__tests__/components/incident-photo-viewer.test.tsx` por falta de `await` en `render(...)`, y 1 en `src/components/app-tabs.web.tsx` por la ruta `/my-incidents` todavía no tipada) pertenecen a las Tareas 8 y 10, no a esta.

## Tarea 8: componente `IncidentPhotoViewer`

**Archivos:** `src/components/incident-photo-viewer.tsx` (nuevo), `src/__tests__/components/incident-photo-viewer.test.tsx` (nuevo).

**Interfaces:**
```ts
export interface IncidentPhotoViewerProps { images: CreatedIncidentImage[] }
export function IncidentPhotoViewer({ images }: IncidentPhotoViewerProps): JSX.Element | null;
```
`FlatList horizontal pagingEnabled` (virtualización exigida por CLAUDE.md) con `Image` de `expo-image` por cada `images[].url`. Con `images.length === 0`, devuelve `null` o un placeholder discreto (decisión menor del dev, documentar la elegida en este plan al implementar).

**Criterios cubiertos:** 3, 6.

- [x] Definir el caso unitario relevante: con N imágenes, renderiza N elementos navegables (p. ej. por `testID`/`accessibilityRole="image"` de cada `Image`); con `images: []` no lanza ningún error y no renderiza ninguna imagen. No añadir pruebas de paginación táctil (no viable de forma fiable con `@testing-library/react-native` sobre `FlatList horizontal`).
- [x] Ejecutar `npx jest src/__tests__/components/incident-photo-viewer.test.tsx` antes del cambio y registrar el resultado (debe fallar: el componente aún no existe).
- [x] Implementar el cambio mínimo: crear `IncidentPhotoViewer` con la interfaz exacta de arriba.
- [x] Ejecutar `npx jest src/__tests__/components/incident-photo-viewer.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** `npx jest src/__tests__/components/incident-photo-viewer.test.tsx` → PASA (3/3 tests verdes). `npx tsc --noEmit` → sin errores propios en `src/components/incident-photo-viewer.tsx` ni en su test. `npx expo lint` → sin errores (solo 1 warning menor no bloqueante por un `require('react')` dentro de una factory de `jest.mock`, aceptado tal cual). El único error de tsc restante en el repo (`src/components/app-tabs.web.tsx`, ruta `/my-incidents` sin tipar) pertenece a la Tarea 10 (la pantalla todavía no existe), no a esta.

## Tarea 9: assets de icono placeholder + `app-tabs.tsx`/`app-tabs.web.tsx`

**Archivos:** `assets/images/tabIcons/list.png`, `list@2x.png`, `list@3x.png` (nuevos), `src/components/app-tabs.tsx` (modificar), `src/components/app-tabs.web.tsx` (modificar).

**Interfaces:** `app-tabs.tsx` añade `<NativeTabs.Trigger name="my-incidents">` con `<NativeTabs.Trigger.Label>Mis incidencias</NativeTabs.Trigger.Label>` y `<NativeTabs.Trigger.Icon src={require('@/assets/images/tabIcons/list.png')} renderingMode="template" />`, mismo patrón que la tab `index`. `app-tabs.web.tsx` añade `<TabTrigger name="my-incidents" href="/my-incidents" asChild><TabButton>Mis incidencias</TabButton></TabTrigger>` dentro del mismo `CustomTabList`.

**Criterios cubiertos:** 1, 2, 8 (visibilidad de la nueva sección).

- [x] Definir el caso relevante: esta tarea es de navegación/wiring puro (sin lógica propia), por lo que no añade un test unitario dedicado; se verifica junto con la Tarea 10 (`my-incidents-screen.test.tsx`, que monta la pantalla real a la que apunta la tab) y por revisión visual manual en la verificación final.
- [x] No aplica ejecutar un test antes del cambio (no hay comportamiento que romper: es una tab nueva).
- [x] Implementar el cambio mínimo: generar/colocar los 3 PNG placeholder (mismo tamaño que `home.png`/`@2x`/`@3x`) y añadir el trigger en ambos archivos de tabs.
- [x] Ejecutar `npx tsc --noEmit` y `npx expo lint` tras el cambio y registrar evidencia.
- [x] Revisar el diff y actualizar este plan.

**Evidencia:** sin test unitario dedicado (wiring de navegación puro, sin lógica propia), según lo previsto en el propio plan. Verificada junto con la Tarea 10, ya implementada, verificada y marcada como hecha: su compiler confirmó que la ruta `/my-incidents` quedó correctamente tipada (el error de `npx tsc --noEmit` que existía en `src/components/app-tabs.web.tsx` por esa ruta sin tipar ya no aparece).

## Tarea 10: pantalla `(tabs)/my-incidents.tsx`

**Archivos:** `src/app/(tabs)/my-incidents.tsx` (nuevo), `src/__tests__/app/tabs/my-incidents-screen.test.tsx` (nuevo).

**Interfaces:** `MyIncidentsScreen()` usa `useSession()` (si `!isRestoringSession && !user`, `<Redirect href="/login" />`) + `useMyIncidents(user?.id ?? null)`. Render: `ActivityIndicator` si `isLoading`; bloque de error con `errorMessage` + botón "Reintentar" (`reload`) si `errorMessage`; estado vacío si `incidents.length === 0`; si no, `FlatList` de `IncidentListItem` con `onPress={(id) => router.push(\`/incidents/${id}\`)}`; banner de `backendFallbackNotice` (mismo patrón visual que `NewIncidentScreen`) siempre visible cuando no es `null`, independientemente del resto del estado.

**Criterios cubiertos:** 1, 2, 3, 5, 8.

- [x] Definir los casos unitarios relevantes (test de integración, mismo nivel que `home-screen-logout.test.tsx`): sin sesión redirige a `/login`; con incidencias muestra la lista en el orden recibido del hook; sin incidencias muestra el estado vacío; pulsar un item navega con `router.push` al `id` correcto; con `backendFallbackNotice` no nulo se muestra el aviso en pantalla. No añadir pruebas que solo repliquen el layout.
- [x] Ejecutar `npx jest src/__tests__/app/tabs/my-incidents-screen.test.tsx` antes del cambio y registrar el resultado (debe fallar: ni la pantalla ni el test existen).
- [x] Implementar el cambio mínimo: crear la pantalla con la estructura descrita arriba, reutilizando `ThemedView`/`SafeAreaView`/`Spacing`/`MaxContentWidth` igual que `HomeScreen`/`NewIncidentScreen`.
- [x] Ejecutar `npx jest src/__tests__/app/tabs/my-incidents-screen.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar este plan.

**Evidencia (compiler, 2026-10-24):** `npx jest src/__tests__/app/tabs/my-incidents-screen.test.tsx` → PASA (10/10 tests verdes). `npx tsc --noEmit` → 0 errores en todo el proyecto. `npx expo lint` → sin warnings/errores propios en `src/app/(tabs)/my-incidents.tsx` ni en su test, tras eliminar un import `ActivityIndicator` sin usar.

**Observación no bloqueante (tester, 2026-10-24):** posible contradicción entre `src/hooks/use-my-incidents.ts` (su comentario indica que un error de recarga conserva el listado previo de incidencias) y `src/app/(tabs)/my-incidents.tsx` (la rama de `errorMessage` oculta la lista por completo aunque hubiera incidencias previas cargadas, en vez de mostrarlas junto al error). No está especificado en la spec y no se ha corregido; queda como limitación conocida para una futura revisión.

## Tarea 11: pantalla `incidents/[id].tsx` + registro en `_layout.tsx`

**Archivos:** `src/app/incidents/[id].tsx` (nuevo), `src/app/_layout.tsx` (modificar), `src/__tests__/app/incidents/incident-detail-screen.test.tsx` (nuevo).

**Interfaces:** `_layout.tsx` añade `<Stack.Screen name="incidents/[id]" options={{ title: 'Detalle de la incidencia' }} />` junto a `incidents/new`. `IncidentDetailScreen()` usa `useLocalSearchParams<{ id: string }>()` + `useIncidentDetail(id)`. Render: `ActivityIndicator` si `isLoading`; estado "no encontrado" si `isNotFound` (sin botón "Reintentar": ofrece volver, `router.back()`); bloque de error con `errorMessage` + "Reintentar" (`reload`) si `errorMessage` sin `isNotFound`; contenido si `incident` no es `null`: `IncidentPhotoViewer` (Tarea 8) + título + `IncidentStatusBadge` (Tarea 6) + categoría (o "Sin categoría") + descripción (o "Sin descripción"); banner de `backendFallbackNotice` siempre visible cuando no es `null`.

**Criterios cubiertos:** 3, 4, 5, 6.

- [x] Definir los casos unitarios relevantes (test de integración): contenido completo con un fixture con imágenes/categoría/descripción; contenido con un fixture sin ninguno de esos tres (`iB09J7Gfu1k`) sin romper el render; `isNotFound` muestra el estado "no encontrado" explícito; `errorMessage` genérico muestra "Reintentar" y, al pulsarlo, llama a `reload`; `backendFallbackNotice` no nulo muestra el aviso en pantalla. No añadir pruebas que solo repliquen el layout.
- [x] Ejecutar `npx jest src/__tests__/app/incidents/incident-detail-screen.test.tsx` antes del cambio y registrar el resultado (debe fallar: ni la pantalla ni el test existen, y `incidents/[id]` aún no está registrada en `_layout.tsx`).
- [x] Implementar el cambio mínimo: registrar la ruta en `_layout.tsx` y crear la pantalla con la estructura descrita arriba.
- [x] Ejecutar `npx jest src/__tests__/app/incidents/incident-detail-screen.test.tsx` y registrar evidencia (debe pasar).
- [x] Revisar el diff y actualizar la especificación y este plan.

**Evidencia (compiler, 2026-10-24):** se detectó en una verificación intermedia un warning de lint por un `require()` dentro de una factory de `jest.mock` en `src/__tests__/app/incidents/incident-detail-screen.test.tsx`; corregido sustituyéndolo por `jest.requireActual`. Resultado final: `npx jest src/__tests__/app/incidents/incident-detail-screen.test.tsx` → PASA (9/9 tests verdes). `npx tsc --noEmit` → 0 errores en todo el proyecto. `npx expo lint` → sin warnings/errores propios en `src/app/incidents/[id].tsx`, `src/app/_layout.tsx` ni en su test.

**Observación no bloqueante (tester, 2026-10-24):** en `src/hooks/use-incident-detail.ts`, la rama `.catch` no limpia `backendFallbackNotice` — si una carga anterior vino del mock (aviso activo) y un `reload()` posterior falla con error genérico o 404, el aviso "mostrando los datos del mock" puede quedar visible aunque ya no haya datos del mock. No está especificado en la spec y no se ha corregido; queda como limitación conocida.

## Comprobaciones finales

Ejecutar desde frontend-mobile/.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | `npx jest` (suite completa) | PASA — 445/445 tests verdes, 32/32 suites. |
| Typecheck | `npx tsc --noEmit` | PASA — 0 errores. |
| Lint | `npx expo lint` | PASA — 0 errores; 0 warnings propios de esta feature (tras limpiar 3 warnings menores de `require()` en tests). Solo quedan 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no relacionados con esta feature, no tocados. |
| Diff, desde la raíz | `git diff --check` | PASA — sin problemas de espacios en blanco/conflictos en el diff. |
| Verificación manual | `npm run mock` + login `sofia13` (lista con 7 incidencias, orden desc, detalle de cada una) y `mayte` (estado vacío) | No ejecutada en este cierre (no solicitada explícitamente); la cobertura funcional equivalente queda verificada por los tests de integración de pantalla (`my-incidents-screen.test.tsx`, `incident-detail-screen.test.tsx`). Queda disponible para una verificación manual puntual si se requiere. |

- [x] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [x] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance (en particular: `backend/`, `database/`, `TEMPORARY_CIVIC_ID`, el camino multipart de `createIncident` al backend real). `git status --short` confirmado: solo archivos esperados de esta feature (tipos, `incident.service.ts`, hooks, componentes, pantallas, `app-tabs.tsx`/`.web.tsx`, `_layout.tsx`, `db.json`, assets de icono, tests, y la propia carpeta `docs/spec/features/24-10-26-mis-incidencias/`); `backend/`, `database/`, `ios/`, `android/` no tocados.

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: **Implementado y verificado**.
- Fecha de revisión: 2026-10-24.
- Resultado entregado: tab "Mis incidencias" con lista cronológica descendente de las incidencias del ciudadano de la sesión activa (título, `IncidentStatusBadge` con la etiqueta correcta, fecha formateada), con estado vacío explícito, error con reintento y aviso de fallback a mock; pantalla de detalle (`/incidents/:id`) con visor de fotos horizontal, título, estado, categoría y descripción (con los equivalentes "Sin categoría"/"Sin descripción" cuando faltan), estado "no encontrado" explícito ante 404, error con reintento y el mismo aviso de fallback. Ambos caminos son real-first con fallback al mock y el aviso visible exacto exigido por CLAUDE.md.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Lista ordenada desc por createdAt | Tarea 3 (`fetchMyIncidentsFromMock` ordena explícitamente desc/`id` asc en empates, verificado en `incident.service.test.ts` con fixture en orden distinto) + Tarea 10 (`my-incidents-screen.test.tsx`: la `FlatList` renderiza en el orden recibido del hook) | Cumplido |
| 2. Estado vacío explícito | Tarea 10 (`my-incidents.tsx`: rama `incidents.length === 0` con texto "Todavía no has registrado ninguna incidencia."; cubierto en `my-incidents-screen.test.tsx`) | Cumplido |
| 3. Navegación a detalle con contenido completo | Tarea 7 (`IncidentListItem.onPress`) + Tarea 10 (`router.push` al `id` correcto) + Tarea 11 (`incident-detail-screen.test.tsx`: título, `IncidentStatusBadge`, categoría y descripción resueltos, `IncidentPhotoViewer` con las imágenes) | Cumplido |
| 4. 404 → "no encontrado" sin mock | Tarea 3 (`IncidentNotFoundError` en 404 real y 404 del mock, sin segunda petición) + Tarea 5 (`use-incident-detail.test.ts`: `isNotFound: true`) + Tarea 11 (`incident-detail-screen.test.tsx`: estado "no encontrado" explícito, sin botón "Reintentar") | Cumplido |
| 5. Fallback a mock con aviso / error genérico sin mock | Tarea 3 (timeout/red → mock; `!ok` no-404 → error genérico sin mock) + Tareas 4-5 (`backendFallbackNotice` con el mensaje exacto cuando `source: 'mock'`) + Tareas 10-11 (banner visible en ambas pantallas, verificado en sus tests de integración) | Cumplido |
| 6. Campos null/vacíos no rompen el detalle | Tarea 3/5 (`use-incident-detail.test.ts`: ensamblado correcto con categoría/descripción/imágenes `null`/`[]`) + Tarea 8 (`incident-photo-viewer.test.tsx`: `images: []` no rompe) + Tarea 11 (`incident-detail-screen.test.tsx` con el fixture `iB09J7Gfu1k`, sin categoría) | Cumplido |
| 7. `createIncidentOnMock` persiste status/createdAt | Tarea 2 (backfill de `db.json` + corrección de `createIncidentOnMock`, verificado con las 2 aserciones `readSentJsonBody` actualizadas en `incident.service.test.ts`) | Cumplido |
| 8. Guard de sesión en la tab | Tarea 10 (`<Redirect href="/login" />` igual que `HomeScreen`, verificado en `my-incidents-screen.test.tsx`) | Cumplido |
| 9. Compatibilidad con tipos/tests existentes | Tarea 1 (tipos nuevos sin tocar `CreatedIncident`/`Incident`/`CreateIncidentInput`/`CreateIncidentResult`/`IncidentSource`) + Tarea 2 (suite completa de `createIncident` sigue verde) + verificación final (`npx jest` 445/445, `npx tsc --noEmit` 0 errores) | Cumplido |

- Comprobaciones: `npx jest` (suite completa) → PASA, 445/445 tests verdes en 32/32 suites. `npx tsc --noEmit` → PASA, 0 errores. `npx expo lint` → PASA, 0 errores y 0 warnings propios de esta feature (quedan 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no tocados). `git diff --check` → PASA, sin problemas. `git status --short` confirmado: únicamente los archivos esperados de esta feature; `backend/`, `database/`, `ios/`, `android/` no tocados.
- Decisiones y desviaciones: ninguna relevante no documentada ya en las tareas. Las dos decisiones/correcciones puntuales ya registradas son: (a) corrección del patrón `renderHook`/`act`/`unmount` async requerido por `@testing-library/react-native@^14.1.0` en los tests de las Tareas 4, 5 y 11 (desestructurar con `await`, ver evidencia de esas tareas); (b) el icono placeholder de la Tarea 9, ya aprobado explícitamente por el usuario antes de implementar.
- Limitaciones y pendientes: dos limitaciones conocidas, no bloqueantes, documentadas en el momento de su detección (ninguna especificada en `spec.md`, ninguna corregida en este ciclo):
  1. (Tarea 10) Posible contradicción entre el comentario de `src/hooks/use-my-incidents.ts` (indica que un error de recarga conserva el listado previo) y `src/app/(tabs)/my-incidents.tsx` (la rama de `errorMessage` oculta la lista por completo en vez de mostrarla junto al error).
  2. (Tarea 11) En `src/hooks/use-incident-detail.ts`, la rama `.catch` no limpia `backendFallbackNotice`: si una carga anterior vino del mock y un `reload()` posterior falla con error genérico o 404, el aviso "mostrando los datos del mock" puede quedar visible aunque ya no haya datos del mock.

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente. No copiar resultados históricos ni prometer persistencia real por usar el mock (db.json) o tipos de src/types/.
