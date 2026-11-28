# 2026-11-26 — Especificación: Mapa de incidencias propias (Issue #136, parte móvil)

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5.5 (claude-sonnet-5-5).

- Rama: feature/mapa-frontend-mobile.
- Última actualización: 2026-11-26.
- Estado: implementada (pendiente prueba manual en dispositivo/Expo Go).
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: Issue #136 "Mapa frontend" y comentario de Soviji13; plan aprobado `~/.claude/plans/vamos-a-centrarnos-en-stateless-thunder-...md`; [Spec de Mis incidencias](../24-10-26-mis-incidencias/spec.md).

## Objetivo y decisiones vigentes

La ciudadanía ve en un mapa a pantalla completa (estilo Waze) sus propias incidencias abiertas, agrupadas en clusters, filtrables, y puede abrir un resumen y saltar al detalle.

- Alcance confirmado: pestaña "Mapa" con `MapView` a pantalla completa; marcadores coloreados por categoría; clustering con `supercluster` recalculado al mover la región; tap en cluster = zoom animado; tap en marcador = bottom sheet (título, estado, categoría, fotos, botón "Ver detalle" a `/incidents/[id]`); chips flotantes de filtro (antigüedad `7d/30d/90d/all` y categorías); botón "centrar en mi ubicación"; variante web con aviso.
- Decisiones confirmadas:
  - Solo se muestran MIS incidencias: el backend devuelve 403 al ciudadano que lista incidencias ajenas y el backend no se toca.
  - "Resueltas" = `resolved` + `closed`, siempre ocultas; `rejected` sí se muestra.
  - Color del marcador por nombre de categoría normalizado (ids mock "1" y UUID del backend no coinciden).
  - Lógica reutilizable (filtros, clusters, colores) en TS puro bajo `src/utils/map/`, sin imports de RN, para copiarla/extraerla a la web.
  - Dependencias ya instaladas y aprobadas: `react-native-maps` 1.29.11 y `supercluster` 9.1.0 (trae tipos propios; no se usa `@types/supercluster`; es ESM, posible `transformIgnorePatterns` en Jest).
  - Se aprueba modificar `db.json`: estados variados (incl. `resolved`/`closed`), fechas, categorías e imágenes `picsum.photos`.
- Suposiciones por validar: compatibilidad de `react-native-maps` con Expo Go del SDK en uso y config necesaria en `app.json` (comprobar con Context7/docs versionadas antes de codificar).
- Fuera de alcance: incidencias ajenas de prioridad alta/media (requiere endpoint backend), filtro por assets urbanos (sin endpoint), integración en frontend-web, cambios en backend.

## Contexto verificado

- Implementación actual: `fetchMyIncidents` (`src/services/incident.service.ts`) devuelve solo `{id,title,status,createdAt}` (sin `location`, `categoryId` ni prioridad); `fetchIncidentById` devuelve el detalle completo. Hooks `use-my-incidents.ts`, `use-categories.ts`, `use-session.ts`; servicio `src/services/device-location.ts`; componentes `incident-status-badge`, `incident-photo-viewer`, `primary-button`, `fallback-notice-card`; tabs en `app-tabs.tsx` y `app-tabs.web.tsx` (Inicio, Mis incidencias; iconos en `assets/images/tabIcons/`).
- Contratos del dominio: `backend/docs/spec/endpoint/get-incidents/` y `get-incidents-id/` (solo lectura).
- Dependencias: `react-native-maps` 1.29.11, `supercluster` ^9.1.0 en `package.json`; reanimated ya instalado (bottom sheet sin dependencia nueva).
- Diferencia: hoy no hay vista de mapa; se añade pestaña, servicio compuesto y módulos puros.
- Pendiente de reportar al backend (no se arregla aquí): `GET /incidents` no devuelve `location`/`categoryId`, lo que obliga a N+1 llamadas a `GET /incidents/:id`.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `GET /incidents?civicId=` | query, `Authorization: Bearer` | 200, lista `{id,title,status,createdAt}` | backend/docs/spec/endpoint/get-incidents/ |
| `GET /incidents/:id` | sin cuerpo, Bearer | 200, detalle con `location`, categoría, imágenes | backend/docs/spec/endpoint/get-incidents-id/ |

- Identidad y permisos: se envía el token de la sesión (`AuthToken | null`; sesión mock no envía token falso). Solo `civicId` propio.
- Si el backend no responde: aviso `BACKEND_FALLBACK_NOTICE` en pantalla y caída al mock (real-first con fallback). Se propaga `source`.

### Mock (json-server / db.json)

Entidad `incidents` ya existe (8 registros) con `categories` (3). Se ajusta el contenido, no el esquema.

Actualización 2026-11-28 (revisión de la PR #218): `db.json` ya no se versiona. Los datos de ejemplo, inventados, están en `db.example.json`: un usuario demo, 3 categorías, 8 incidencias (6 visibles en el mapa, 1 `resolved` y 1 `closed`) y 3 imágenes `picsum.photos`. El `db.json` local se crea con `cp db.example.json db.json`.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `status` | string | sí | variar entre abiertos y `resolved`/`closed`/`rejected` | n/a |
| `createdAt` | ISO string | sí | repartir en <7d, <30d, <90d y >90d | n/a |
| `location.latitude/longitude` | number | sí para el mapa | incidencias sin coordenadas se descartan | descartada |
| `categoryId` | string | sí | repartir entre las 3 categorías | color neutro |
| `images` | string[] | no | URLs `https://picsum.photos/...` | sin fotos |

- Recurso simulado: incidencias con coordenadas cercanas entre sí (para probar clusters) y alguna lejana.
- Errores simulados: los ya existentes en el servicio (401, no encontrada, sin conexión).

## Contrato de UI y navegación

- Ruta nueva: `src/app/(tabs)/map.tsx` (pestaña "Mapa"); detalle existente `/incidents/[id]` se empuja desde el sheet con `router.push`.
- Ubicación: tab en `(tabs)/` por ser sección de primer nivel; `app-tabs.tsx` y `app-tabs.web.tsx` reciben un `Trigger` "Mapa" con icono `assets/images/tabIcons/map.png` (nuevo asset).
- Componentes nuevos: `incident-map`, `incident-map.web`, `incident-map-marker`, `incident-cluster-marker`, `incident-map-sheet`, `incident-map-filter-bar`, `locate-me-button`. Reutilizados: `IncidentStatusBadge`, `IncidentPhotoViewer`, `PrimaryButton`, `FallbackNoticeCard`.
- Estados explícitos: carga (indicador mientras N+1), error con reintento (`reload`), vacío, aviso de fallback, permiso de ubicación denegado (mensaje; el mapa sigue usable). Concurrencia limitada (4) evita saturar.
- Web: `incident-map.web.tsx` muestra "Mapa disponible solo en la app móvil".

## Tipos y datos mock

| Tipo (src/types/incident-map.ts) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `MapIncident` | `id`, `title`, `status`, `category`, `categoryId`, `latitude`, `longitude`, `createdAt`, `images` | derivado de `IncidentDetail`; coordenadas obligatorias |
| `IncidentAgeFilter` | `'7d' \| '30d' \| '90d' \| 'all'` | por defecto `'all'` |
| `IncidentMapFilters` | `{ age, categoryIds: string[] }` | `categoryIds` vacío = todas |
| `FetchMapIncidentsResult` | `{ incidents: MapIncident[]; source }` | `source` igual que en `fetchMyIncidents` |

- Estrategia de medios: semillas `picsum.photos` en `db.json`; fotos mostradas con `IncidentPhotoViewer`; sin subida.
- Almacenamiento de esta fase: solo lectura; mock conservado junto al camino real.
- Ciclo de vida: `db.json` persistente; backend en memoria.

## Diseño mínimo

`fetchMyMapIncidents(civicId, token)` reutiliza `fetchMyIncidents`, descarta `resolved`/`closed` por resumen, llama a `fetchIncidentById` con concurrencia 4, descarta sin coordenadas y mapea a `MapIncident` (pagina por cursor hasta `limit` 100 si `fetchMyIncidents` no lo hace; se verifica al implementar). `useMapIncidents` (patrón de `use-my-incidents`) y `useIncidentMapFilters` (estado + lista filtrada memoizada). `incident-map` calcula clusters con `supercluster` en `onRegionChangeComplete`. Estilos NativeWind; filtros en `FlatList` horizontal; sin Zod (no hay formularios).

## Criterios de aceptación

1. Con incidencias propias con coordenadas, el mapa muestra marcadores coloreados por categoría; cercanas se agrupan en cluster con contador y al pulsarlo se hace zoom y se separan.
2. Incidencias `resolved`/`closed` nunca aparecen; `rejected` sí. Las sin coordenadas se descartan sin error.
3. Filtros de antigüedad y categorías actualizan el mapa; categorías vacías = todas; sin resultados muestra estado vacío.
4. Tap en marcador abre sheet con título, estado, categoría y fotos (o sin fotos); "Ver detalle" navega a `/incidents/[id]`.
5. Botón de ubicación centra el mapa; con permiso denegado se informa sin romper el mapa.
6. Sin backend se usa el mock y se muestra el aviso de fallback; el camino mock se conserva.
7. En web se muestra el aviso "Mapa disponible solo en la app móvil" sin importar `react-native-maps`.
8. La pestaña "Mapa" aparece en `app-tabs` y `app-tabs.web`.
9. `pnpm expo lint`, `pnpm tsc --noEmit` y `pnpm test` pasan.
10. Al volver a la pestaña "Mapa" tras salir de ella (p. ej. después de crear una incidencia) los datos se recargan y se muestran las incidencias nuevas; el primer foco no genera una petición adicional.
11. El mock es arrancable desde un clon nuevo: `db.json` no se versiona y `db.example.json` (datos ficticios) más las instrucciones del `README.md` (`cp db.example.json db.json`) permiten usar `pnpm run mock`.

## Estrategia de verificación

Tests unitarios en `src/__tests__/` (utils/map, servicio, hooks, sheet, tabs) con `react-native-maps` mockeado; verificación manual contra mock (`pnpm run mock` + `pnpm run start`) de los criterios 1-6. Contra backend real solo si la usuaria lo pide, comprobando únicamente que el front envía bien las peticiones.

Los resultados reales y la confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación).
