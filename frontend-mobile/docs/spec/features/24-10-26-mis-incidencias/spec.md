# 2026-10-24 — Especificación: Mis incidencias (lista + detalle de incidencias del ciudadano)

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: feature/ver-mis-incidencias-frontend-mobile.
- Última actualización: 2026-10-24.
- Estado: implementado y verificado (2026-10-24, ver [Confirmación de implementación](./plan.md#confirmación-de-implementación)).
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: plan técnico ya aprobado explícitamente por el usuario (incluye backfill de `db.json`, contratos de tipos, servicios, hooks, componentes y pantallas); `backend/docs/spec/endpoint/get-incidents/README.md` y `backend/docs/spec/endpoint/get-incidents-id/README.md` (solo lectura).

## Objetivo y decisiones vigentes

La app móvil ya permite registrar incidencias (`/incidents/new`), pero la ciudadanía no tiene ninguna forma de ver las incidencias que ha reportado. Esta feature añade una nueva tab "Mis incidencias" con la lista de incidencias del ciudadano autenticado (ordenada de más reciente a más antigua) y una pantalla de detalle (`/incidents/:id`) con la información completa de una incidencia, incluidas sus fotos.

- Alcance confirmado:
  - Nueva tab `my-incidents` en `(tabs)/` que lista `IncidentSummary[]` del ciudadano de la sesión activa (`useSession().user.id` como `civicId`).
  - Nueva pantalla empujada `incidents/[id].tsx` (fuera de `(tabs)/`, registrada en el `Stack` raíz) con el detalle completo de una incidencia (`IncidentDetail`), incluido un visor de fotos horizontal.
  - Dos funciones de servicio nuevas: `fetchMyIncidents(civicId)` y `fetchIncidentById(id)`, real-first con fallback a mock según la política de CLAUDE.md.
  - Backfill de los 7 registros existentes de `db.json` con `status`/`createdAt` y corrección de `createIncidentOnMock` para que las incidencias nuevas creadas contra el mock también persistan esos dos campos.
- Decisiones confirmadas:
  - `civicId` de la lista/detalle es `useSession().user.id` (sesión real ya existente), **no** el `TEMPORARY_CIVIC_ID` que sigue usando `createIncident`/`createIncidentOnMock` para el alta de incidencias (ese valor no se toca, es un camino ya existente fuera del alcance de esta feature).
  - El backend real ya expone `GET /incidents?civicId=<uuid>` (resumen) y `GET /incidents/:id` (detalle completo); no se modifica `backend/` bajo ninguna circunstancia.
  - `IncidentNotFoundError` (404 real o 404 del mock) nunca cae al mock: un 404 significa "esa incidencia no existe", y mostrar el mock encima sería engañoso. Solo los fallos de conexión (timeout/red) activan el fallback.
  - Un `!ok` del backend que no sea 404 (p. ej. 400 por UUID mal formado, 500) tampoco usa el mock: se trata como error genérico, igual que ya hace `createIncident` con las respuestas de rechazo del backend.
  - El icono de la nueva tab es un PNG placeholder simple (`list.png` + `@2x`/`@3x`), mismo patrón que `home.png`; ya aprobado explícitamente por el usuario, sin más validación de diseño necesaria.
  - `priority` en `IncidentDetail` del mock es siempre `'low'` fijo (el mock no modela prioridad), igual que ya hace `createIncidentOnMock`.
  - La categoría mostrada en el detalle del mock reutiliza la misma dualidad ya existente en el alta (`categoryId` del catálogo vs. `category` texto libre de "Otros"): si el registro trae `category` (texto libre) se usa tal cual; si no, y trae `categoryId`, se resuelve el nombre contra `fetchCategories()`; si no hay ninguno de los dos, `category` es `null`.
- Suposiciones por validar: ninguna; el plan técnico, el backfill exacto de `db.json` y el icono placeholder ya fueron validados y aprobados explícitamente por el usuario antes de redactar esta especificación.
- Fuera de alcance:
  - Cualquier cambio en `backend/` (solo lectura, se referencia su contrato ya documentado).
  - Cualquier cambio en `createIncident`/el camino de alta de incidencias salvo la corrección puntual de `createIncidentOnMock` descrita arriba (persistir `status`/`createdAt`); no se toca `TEMPORARY_CIVIC_ID` ni el resto del flujo de creación.
  - Edición, eliminación o cambio de estado de una incidencia desde el móvil (fuera del alcance general de la app: la ciudadanía solo crea y consulta, ver CLAUDE.md).
  - Paginación, filtros o búsqueda sobre el listado (el backend ya documenta que no pagina; el listado real en esta fase es pequeño).
  - Subida/gestión de imágenes nuevas desde el detalle (solo lectura de las ya adjuntadas al crear la incidencia).

## Contexto verificado

- Implementación actual:
  - `src/types/incident.ts`: ya define `IncidentStatus`, `DEFAULT_INCIDENT_STATUS`, `IncidentPriority`, `IncidentPayload` (sin `status`/`createdAt`), `CreatedIncidentImage`, `CreatedIncident`, `IncidentSource`, `CreateIncidentResult`. No existen hoy `IncidentSummary`/`IncidentDetail`/`FetchMyIncidentsResult`/`FetchIncidentDetailResult`.
  - `src/services/incident.service.ts`: expone hoy solo `createIncident` (real-first con fallback a mock vía `createIncidentOnMock`), más `INCIDENTS_ENDPOINT`, `MAX_INCIDENT_IMAGES`. `inferImageFormat` existe pero no está exportada. `createIncidentOnMock` calcula `createdAt` una sola vez más abajo (línea 159) y **no** incluye `status` ni `createdAt` en el `payload` JSON enviado al mock, por lo que los registros que persiste `db.json` tampoco los tienen hoy.
  - `db.json`: los 7 registros de `incidents` (todos `civicId` de `sofia13`, `20ac442e-0f00-4fe4-bad3-61c8e8e0bff5`) no tienen hoy `status` ni `createdAt`. `mayte` (`civicId` `a62218e7563`) no tiene ninguna incidencia.
  - `src/hooks/use-session.ts`: `useSession()` ya expone `{ user, token, isRestoringSession, signIn, signOut }`; `user: SessionUser | null` (`SessionUser = Omit<User, 'password'>`, con `id: string`).
  - `src/hooks/use-categories.ts`: patrón de referencia para hooks de carga (`isLoading`/`errorMessage`/`reload` con `reloadToken` y `isMountedRef`).
  - `src/services/category.service.ts`: `fetchCategories()` ya existe, consulta `GET ${API_BASE_URL}/categories` (mock), sin fallback a backend real (no aplica a esta feature, se reutiliza tal cual).
  - `src/services/image.service.ts`: exporta `IMAGES_ENDPOINT` (`${API_BASE_URL}/images`) y `createImage`; no existe hoy ninguna función para listar imágenes por `incidentId`.
  - `src/components/app-tabs.tsx` (nativo) y `app-tabs.web.tsx` (web): una única tab `index`/`home` hoy. `assets/images/tabIcons/` solo tiene `home.png`/`@2x`/`@3x`.
  - `src/app/_layout.tsx`: `Stack` raíz con `login`, `(tabs)` y `incidents/new` registradas; no existe `incidents/[id]`.
  - `src/app/incidents/new.tsx`: pantalla de referencia para patrones de layout (`ThemedView`/`SafeAreaView` con `MaxContentWidth` centrado, estados de error con `Text` rojo (`#d92d20`) sobre `ThemedView type="backgroundElement"`, aviso de fallback a mock con el mismo patrón visual).
- Contratos y referencias del dominio (solo lectura, no se modifican):
  - `backend/docs/spec/endpoint/get-incidents/README.md`: `GET /incidents?civicId=<UUID>` (obligatorio). Ausencia, vacío, UUID mal formado, valores repetidos u otros parámetros → 400. 200 con array sin envoltorio de `{ id, title, status, createdAt }`; sin coincidencias → `[]`; orden `createdAt` descendente, `id` ascendente en empates. DEUDA-27-01 abierta: no hay autenticación, `civicId` es un filtro del cliente sin verificación de identidad (documentado, no se corrige desde el móvil).
  - `backend/docs/spec/endpoint/get-incidents-id/README.md`: `GET /incidents/:id`. 400 si `id` no es UUID; 404 si el UUID es válido pero no existe en esta instancia. 200 con la misma estructura pública que devuelve `POST /incidents` (`CreatedIncident`): identidad, datos, ubicación, imágenes, `status` (`reported`/`validated`/`rejected` en esta fase del backend), `priority: 'low'`, fechas ISO.
- Configuración y dependencias disponibles: `expo` `^58.0.17`, `expo-router` `~58.0.25`, `expo-image` `~58.0.16` (ya instalada, sin uso previo en el repo salvo configuración — se usa por primera vez en `IncidentPhotoViewer`), `react-native-safe-area-context`, `jest-expo` `~58.0.12`. No se añade ninguna dependencia nueva.
- Diferencia entre estado actual y propuesto: hoy la ciudadanía no puede ver ninguna incidencia ya reportada desde la app; tras esta feature, dispone de una tab "Mis incidencias" con la lista propia y puede abrir el detalle completo de cada una, con el mismo patrón real-first/fallback a mock ya usado en el alta.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

Referencia de solo lectura a los contratos ya documentados por backend; no se redefinen ni se implementan desde el frontend.

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `GET /incidents?civicId=<UUID>` | Query obligatoria `civicId` (UUID), sin cuerpo, sin otros parámetros | 200, array `IncidentSummary[]` sin envoltorio (`id`, `title`, `status`, `createdAt`), orden `createdAt` desc / `id` asc en empates; `[]` sin coincidencias | `backend/docs/spec/endpoint/get-incidents/README.md` |
| `GET /incidents/:id` | `id` en la ruta (debe ser UUID), sin cuerpo | 200, `CreatedIncident`-shape completo (identidad, ubicación, imágenes, `status`, `priority: 'low'`, fechas ISO) | `backend/docs/spec/endpoint/get-incidents-id/README.md` |

- Identidad y permisos: el backend documenta explícitamente que no hay autenticación ni comprobación de propiedad (DEUDA-27-01 abierta); el móvil no implementa ninguna comprobación adicional de identidad propia, solo envía `civicId = useSession().user.id` tal cual.
- Si el backend no responde (timeout o fallo de red): aviso claro en pantalla ("No se ha podido conectar al backend, mostrando los datos del mock.") y caída al mock, según la política real-first/fallback de CLAUDE.md. Un `400`/`404`/`500` con backend respondiendo (`!ok`, pero sí hay conexión) **no** cae al mock: `404` en `GET /incidents/:id` se traduce a `IncidentNotFoundError` (estado "no encontrado" explícito en la UI); cualquier otro `!ok` se traduce a un error genérico con reintento.

### Mock (json-server / db.json)

La entidad `incidents` ya existe en `db.json`; esta feature amplía su esquema (no crea una entidad nueva) añadiendo `status` y `createdAt` a los 7 registros existentes y corrigiendo `createIncidentOnMock` para que los persista también en las incidencias nuevas. El contenido exacto del backfill ya fue aprobado explícitamente por el usuario (ver tabla abajo), por lo que no se requiere una nueva confirmación antes de aplicarlo.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `status` | `IncidentStatus` | Sí (tras el backfill) | Valor fijo `'reported'` para los 7 registros existentes; `createIncidentOnMock` escribe siempre `DEFAULT_INCIDENT_STATUS` | Si un registro mock careciera de `status` (no debería tras el backfill), el servicio por defecto a `DEFAULT_INCIDENT_STATUS` al leerlo (defensivo, no comportamiento esperado) |
| `createdAt` | `string` (ISO 8601) | Sí (tras el backfill) | Fecha ISO fija por registro (ver tabla); `createIncidentOnMock` escribe `new Date().toISOString()`, calculado una sola vez y reutilizado también para `images[].createdAt` y `location.createdAt` | Si un registro mock careciera de `createdAt`, se usa `''` como último recurso solo para no romper el `sort`; ese registro ordenaría al final (defensivo, no comportamiento esperado tras el backfill) |

- Recurso simulado — backfill exacto de los 7 registros existentes de `incidents` en `db.json` (todos `civicId` `20ac442e-0f00-4fe4-bad3-61c8e8e0bff5`, usuario `sofia13`), todos `status: "reported"`:

  | id | createdAt |
  | --- | --- |
  | `RLfTcvEVqlc` | `2026-10-20T09:00:00.000Z` |
  | `bALCrQcm_gw` | `2026-10-20T09:15:00.000Z` |
  | `5zbBHCMzWNo` | `2026-10-21T10:00:00.000Z` |
  | `6NslGK70n2o` | `2026-10-21T16:30:00.000Z` |
  | `1C_kClDKmFk` | `2026-10-22T08:45:00.000Z` |
  | `nZcfRC9__gA` | `2026-10-22T18:10:00.000Z` |
  | `iB09J7Gfu1k` | `2026-10-23T11:20:00.000Z` |

  Orden descendente esperado en la lista: `iB09J7Gfu1k` primero, `RLfTcvEVqlc` último. `mayte` (`civicId` `a62218e7563`) sigue sin ninguna incidencia → es el caso de referencia para el estado vacío de la lista.
- Errores simulados: `fetchMyIncidentsFromMock`/`fetchIncidentDetailFromMock` reutilizan el mismo manejo de errores ya existente en el servicio (`RequestTimeoutError`/`TypeError` → mensaje de conexión amigable; `!ok` del mock → error genérico; `404` del mock en el detalle → `IncidentNotFoundError`, igual que un 404 real).

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/` (Expo Router):
  - `src/app/(tabs)/my-incidents.tsx` (nueva, ruta `/my-incidents`, tab "Mis incidencias").
  - `src/app/incidents/[id].tsx` (nueva, ruta `/incidents/:id`, pantalla empujada desde el Stack raíz, fuera de `(tabs)/`).
- Ubicación: `my-incidents` vive en `(tabs)/` porque es una sección de primer nivel siempre accesible para la ciudadanía (al mismo nivel que "Inicio"). El detalle (`incidents/[id]`) va fuera de `(tabs)/`, igual que `incidents/new`, porque es una pantalla de contenido específico que se abre desde la lista y debe apilarse con botón de atrás sobre la tab bar.
- Componentes nuevos vs. reutilizados:
  - Nuevos: `IncidentStatusBadge`, `IncidentListItem`, `IncidentPhotoViewer`.
  - Reutilizados sin modificar: `ThemedView`, `ThemedText`, `useTheme`, `useSession`, `SafeAreaView`/`useSafeAreaInsets` de `react-native-safe-area-context`, `router`/`useLocalSearchParams`/`Redirect` de `expo-router`, `Spacing`/`MaxContentWidth` de `@/constants/theme`.
- Estados explícitos de carga/error (evitan dejar al usuario sin feedback, no hay envíos duplicados porque ambas pantallas son de solo lectura):
  - `my-incidents.tsx`: cargando (`ActivityIndicator`), error con botón "Reintentar" (`reload()`), vacío ("Todavía no has reportado ninguna incidencia." o equivalente), lista con `FlatList` + `IncidentListItem`, banner de aviso de fallback a mock cuando `source === 'mock'`.
  - `incidents/[id].tsx`: cargando, "no encontrado" explícito (404, sin reintento con sentido — se ofrece volver), error de conexión/genérico con "Reintentar" (`reload()`), contenido con `IncidentPhotoViewer` + título + `IncidentStatusBadge` + categoría + descripción, mismo banner de aviso de fallback a mock.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentPayload` (modificado) | Añade `status: IncidentStatus` y `createdAt: string` a los campos ya existentes (`title`, `description`, `latitude`, `longitude`, `accuracy`, `civicId`, `categoryId`, `category`) | Ambos obligatorios; `createIncidentOnMock` los rellena con `DEFAULT_INCIDENT_STATUS` y `new Date().toISOString()` antes de construir el payload |
| `IncidentSummary` (nuevo) | `id: string`; `title: string`; `status: IncidentStatus`; `createdAt: string` | Forma exacta de la respuesta real de `GET /incidents?civicId=...`; sin relaciones anidadas |
| `IncidentDetail` (nuevo) | `id`, `title: string`, `description: string \| null`, `civicId: string`, `categoryId: string \| null`, `category: string \| null`, `urbanAssetId: string \| null`, `location: { latitude: number \| null; longitude: number \| null; accuracy: number \| null; createdAt: string }`, `images: CreatedIncidentImage[]`, `status: IncidentStatus`, `priority: IncidentPriority`, `createdAt: string` | Misma forma pública que `CreatedIncident`/`GET /incidents/:id`; se define como tipo independiente (no un alias de `CreatedIncident`) porque conceptualmente representa "la incidencia que se consulta", no "la incidencia que se acaba de crear", aunque hoy coincidan campo a campo |
| `IncidentSource` (reutilizado sin cambios) | `'backend' \| 'mock'` | Ya existe, se reutiliza igual que en `CreateIncidentResult` |
| `FetchMyIncidentsResult` (nuevo) | `incidents: IncidentSummary[]`; `source: IncidentSource` | Envuelve el resultado de `fetchMyIncidents` para que la UI sepa si mostrar el aviso de fallback |
| `FetchIncidentDetailResult` (nuevo) | `incident: IncidentDetail`; `source: IncidentSource` | Envuelve el resultado de `fetchIncidentById`, mismo motivo que arriba |
| `MockIncidentRecord` (nuevo, interno de `incident.service.ts`, no exportado en `src/types/`) | Forma plana tal cual la devuelve json-server para un registro de `incidents`: `id`, `title`, `description`, `latitude`, `longitude`, `accuracy`, `civicId`, `categoryId`, `category`, `status?: IncidentStatus`, `createdAt?: string` | `status`/`createdAt` opcionales para tolerar registros antiguos sin backfillear (defensivo); el resto obligatorio, igual que ya persiste `createIncidentOnMock` |

No se introduce ninguna entidad nueva en `db.json` (se amplía el esquema de `incidents`, ya existente). `CreatedIncident`, `CreateIncidentInput`, `CreateIncidentResult`, `Incident`, `Category`, `IncidentImage`/`CreateIncidentImageInput` se conservan exactamente igual, sin tocarlos: esta feature los consume (`fetchCategories`, `CreatedIncidentImage`) o convive con ellos (`CreatedIncident` sigue siendo la respuesta de `POST /incidents`, `IncidentDetail` la de `GET /incidents/:id`; ambas comparten forma pero no tipo, a propósito).

- Estrategia de medios: las imágenes del detalle son siempre de solo lectura (ya adjuntadas al crear la incidencia): URIs `file://...` locales si la incidencia se creó contra el mock en ese mismo dispositivo, o URLs del backend/`picsum.photos` para datos semilla. Esta feature no captura ni sube ninguna imagen nueva, por lo que no amplía `src/services/storage.service.ts`.
- Almacenamiento de esta fase: el backend real guarda en memoria (Map, se pierde al reiniciar, ya documentado); el mock persiste en `db.json`. Esta feature no cambia esa política, solo lee de ambos.
- Ciclo de vida: igual que ya documenta `createIncident`: backend real no persiste tras reiniciar el proceso; mock persiste en `db.json` hasta que se edite a mano.

## Diseño mínimo

- **`src/services/incident.service.ts`** (modificar): añade `export class IncidentNotFoundError extends Error {}`; exporta `inferImageFormat` (ya existe, solo añade `export`); define `MockIncidentRecord` (interno); añade `export async function fetchMyIncidents(civicId: string): Promise<FetchMyIncidentsResult>` y `export async function fetchIncidentById(id: string): Promise<FetchIncidentDetailResult>`, cada una con su función `*FromMock` privada de fallback. Corrige `createIncidentOnMock`: mueve el cálculo de `createdAt` antes de construir `payload`, añade `status`/`createdAt` al payload, elimina el `const createdAt` duplicado reutilizando la misma variable.
- **`src/hooks/use-my-incidents.ts`** (nuevo) y **`src/hooks/use-incident-detail.ts`** (nuevo): mismo patrón que `use-categories.ts` (`isMountedRef`, `reloadToken`, `isLoading` inicial `true`), añadiendo `backendFallbackNotice` (deriva de `result.source`) y, en el caso del detalle, `isNotFound` (deriva de `error instanceof IncidentNotFoundError`). `useMyIncidents` no dispara ningún fetch mientras `civicId === null` (sesión aún restaurándose o sin usuario).
- **`src/components/incident-status-badge.tsx`** (nuevo): componente presentacional puro, `className` de NativeWind para el pill, color de fondo por `STATUS_COLORS[status]`.
- **`src/components/incident-list-item.tsx`** (nuevo): fila presentacional (`Pressable` con `onPress`), título + `IncidentStatusBadge` + fecha formateada.
- **`src/components/incident-photo-viewer.tsx`** (nuevo): `FlatList horizontal pagingEnabled` (virtualización ya exigida por CLAUDE.md para colecciones dinámicas) + `expo-image` (`Image` de `expo-image`, primera vez que se usa en el repo); con `images.length === 0` no renderiza nada (o un placeholder discreto, decisión menor del `dev` documentada en el plan).
- **`src/app/(tabs)/my-incidents.tsx`** (nueva pantalla): `useSession()` (si `!user` y ya no está restaurando, `<Redirect href="/login" />`, mismo guard que `HomeScreen`) + `useMyIncidents(user?.id ?? null)`; `FlatList` de `IncidentListItem` (nunca `.map()` en un `ScrollView`, exigido por CLAUDE.md); `onPress` de cada item → `router.push(\`/incidents/${id}\`)`.
- **`src/app/incidents/[id].tsx`** (nueva pantalla, registrada en `src/app/_layout.tsx` con `title: 'Detalle de la incidencia'`): `useLocalSearchParams<{ id: string }>()` + `useIncidentDetail(id)`.
- No se añaden capas especulativas: no hay validación de formulario (Zod no aplica, ninguna pantalla envía datos) ni almacenamiento nuevo.

## Criterios de aceptación

1. Con sesión activa y al menos una incidencia propia, la tab "Mis incidencias" muestra la lista ordenada de más reciente a más antigua (por `createdAt` descendente, con `sofia13` tras el backfill: `iB09J7Gfu1k` primero, `RLfTcvEVqlc` último).
2. Con sesión activa y ninguna incidencia propia (`mayte`), la tab "Mis incidencias" muestra un estado vacío explícito, sin error ni lista vacía silenciosa.
3. Pulsar un elemento de la lista navega a `/incidents/:id` y muestra el detalle completo: título, `IncidentStatusBadge` con la etiqueta correcta, categoría resuelta (texto libre o nombre del catálogo), descripción y las imágenes adjuntas en `IncidentPhotoViewer`.
4. Un `id` con formato válido pero inexistente (404, real o mock) muestra un estado "no encontrado" explícito en `/incidents/:id`, sin caer al mock y sin mostrar datos parciales o erróneos.
5. Un fallo de conexión (timeout o red) en `fetchMyIncidents`/`fetchIncidentById` cae al mock correspondiente y muestra el aviso "No se ha podido conectar al backend, mostrando los datos del mock." en pantalla; un `!ok` del backend que no sea 404 (p. ej. 400/500) muestra un error genérico con opción de reintentar, sin usar el mock.
6. Una incidencia sin imágenes, sin categoría (`categoryId` y `category` ambos `null`, como `iB09J7Gfu1k`) o sin descripción se muestra sin romper la pantalla de detalle (visor de fotos vacío, categoría omitida o "Sin categoría", descripción omitida o "Sin descripción").
7. `createIncidentOnMock` persiste siempre `status: 'reported'` y un `createdAt` válido (ISO, mismo instante que `location.createdAt`/`images[].createdAt`) en el payload JSON enviado al mock, de modo que una incidencia recién creada contra el mock aparece correctamente ordenada en "Mis incidencias" sin necesitar un backfill manual adicional.
8. La tab "Mis incidencias" nunca es alcanzable sin sesión activa: redirige a `/login` igual que ya hace `HomeScreen`.
9. Los tipos y tests ya existentes de `createIncident`/`CreatedIncident`/`IncidentPayload` siguen compilando y pasando tras los cambios (los únicos ajustes necesarios en `src/__tests__/services/incident.service.test.ts` son las dos aserciones `readSentJsonBody` que ahora deben incluir `status: 'reported'` y `createdAt: FIXED_NOW_ISO`).

## Estrategia de verificación

- `src/__tests__/services/incident.service.test.ts` (modificar + ampliar): actualizar las 2 aserciones `readSentJsonBody(1)` existentes (payload del fallback a mock) para incluir `status: 'reported'` y `createdAt: FIXED_NOW_ISO`; añadir casos nuevos para `fetchMyIncidents` (petición con `civicId` correcto al backend, mapeo a `IncidentSummary[]`, fallback a mock con orden descendente por `createdAt`/`id` como desempate, `!ok` sin mock) y `fetchIncidentById` (petición a `/incidents/:id`, 404 → `IncidentNotFoundError` sin mock, fallback a mock con imágenes vía `IMAGES_ENDPOINT` y resolución de categoría vía `fetchCategories()`, 404 del mock → `IncidentNotFoundError`).
- `src/__tests__/hooks/use-my-incidents.test.ts` (nuevo): `civicId === null` no dispara fetch; carga correcta rellena `incidents`; error de `fetchMyIncidents` rellena `errorMessage`; `source: 'mock'` rellena `backendFallbackNotice` con el mensaje exacto; `reload()` repite la carga.
- `src/__tests__/hooks/use-incident-detail.test.ts` (nuevo): carga correcta rellena `incident`; `IncidentNotFoundError` → `isNotFound: true` sin `errorMessage` genérico; otro error → `errorMessage` sin `isNotFound`; `source: 'mock'` rellena `backendFallbackNotice`; `reload()` repite la carga.
- `src/__tests__/components/incident-status-badge.test.tsx`, `incident-list-item.test.tsx`, `incident-photo-viewer.test.tsx` (nuevos): casos presentacionales mínimos (etiqueta/color correctos por estado, `onPress` del item se llama una vez, el visor pagina N imágenes y no rompe con `images: []`). No se añaden pruebas que solo repliquen la implementación ni pruebas para texto visual suelto.
- `src/__tests__/app/tabs/my-incidents-screen.test.tsx` (nuevo): redirección sin sesión; lista con incidencias; estado vacío; navegación al pulsar un item; banner de fallback visible con `source: 'mock'`.
- `src/__tests__/app/incidents/incident-detail-screen.test.tsx` (nuevo): detalle con contenido completo; estado "no encontrado"; estado de error con reintento; banner de fallback visible con `source: 'mock'`.

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e/integración adicionales a los dos tests de pantalla ya descritos (equivalentes a los de integración de `HomeScreen`/`NewIncidentScreen` ya existentes en el repo). Un contrato de consumo documentado (`get-incidents`/`get-incidents-id`) no equivale a una verificación de que el backend responde correctamente: el frontend solo comprueba que la petición se envía bien formada (`civicId`/`id` correctos en la URL) y que la respuesta se interpreta según el contrato documentado; no es responsabilidad del frontend depurar la lógica interna del backend (si el backend real falla durante la verificación manual, se reporta y se continúa, sin intentar arreglarlo).

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
