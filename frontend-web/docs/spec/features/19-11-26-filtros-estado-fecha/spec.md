# 2026-11-19 — Especificación: filtrar el listado de incidencias por estado y fecha

- Desarrollador responsable: Alejandro (Alewuito).
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: feature/173-filtros-estado-fecha-frontend-web.
- Última actualización: 2026-11-20.
- Estado: implementado y verificado con pruebas unitarias; prueba manual en navegador pendiente.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: issue #173 (filtros del dashboard), sub-issues #194 (estado) y #195 (fecha), issue #44 (filtrado en el backend) y ADR 0002.

## Objetivo y decisiones vigentes

El personal municipal necesita encontrar rápido las incidencias que tiene que tratar. Esta feature añade al listado del panel web un filtro por estado, el orden por fecha (más recientes o más antiguas primero) y un rango de días con calendario.

- Alcance confirmado: filtro por estado, orden por fecha de creación y rango de días con `<input type="date">`, combinables entre sí y con un botón para limpiarlos.
- Decisiones confirmadas:
  - El reparto de #173 deja estado y fecha a Alejandro, y prioridad y categoría a Artina (#196 y #197). Ubicación queda aplazada.
  - Los filtros se aplican en el navegador sobre las páginas ya cargadas, porque `GET /incidents` todavía no filtra (#44). El usuario decidió no tocar el backend.
  - Cuando el resultado puede estar incompleto se muestra un aviso y el usuario puede seguir con «Cargar más».
  - Como el backend devuelve las incidencias de más reciente a más antigua, un rango cuyo inicio es posterior a la incidencia más antigua cargada ya está completo y no muestra el aviso.
  - Los días se interpretan en hora local, de 00:00:00 a 23:59:59.999. Si «Desde» es posterior a «Hasta» se intercambian, también en los calendarios, para que muestren el rango aplicado.
- Suposiciones por validar: ninguna.
- Fuera de alcance: filtros en el backend (#44), prioridad, categoría y ubicación, persistir los filtros en la URL y cambios en `backend/` o `frontend-mobile/`.

## Contexto verificado

- Implementación actual: `src/components/incident-list-view.tsx` muestra el listado paginado de `useIncidentList` sin filtros.
- Contratos y referencias del dominio: `GET /incidents` devuelve `id`, `title`, `status` y `createdAt` (`ResumenIncidencia` en `backend/src/incidents/incident.ts`), ordenados por `createdAt` descendente, y rechaza parámetros distintos de `civicId`, `limit` y `cursor`.
- Configuración y dependencias disponibles: React 19, Tailwind 3 y `lucide-react` ya instalados. No se añaden dependencias.
- Diferencia entre estado actual y propuesto: el listado gana un panel de filtros y muestra solo las incidencias que coinciden.

## Contrato de datos (backend real + mock)

No se crea ni cambia ningún endpoint. Los filtros trabajan sobre la respuesta actual de `GET /incidents`.

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| GET /incidents | `limit` y `cursor` en la query, JWT Bearer | 200 con un array de `{ id, title, status, createdAt }` y cabecera `X-Next-Cursor` | [get-incidents](../../../../../backend/docs/spec/endpoint/get-incidents/README.md) |

- Identidad y permisos: token Bearer de la sesión, como el listado actual. Los filtros sirven igual a todos los roles del panel (ADR 0002).
- Si el backend no responde: se mantiene el comportamiento actual del listado (mensaje de error y «Reintentar»).

### Mock (`src/mocks/`)

No aplica: el listado no tiene mock y esta feature no lo añade.

## Contrato de UI y navegación

- Vistas afectadas: `src/components/incident-list-view.tsx`, la pantalla inicial tras iniciar sesión.
- Componentes nuevos vs. reutilizados: nuevo `IncidentFilters`; se reutiliza `IncidentListView` y su paginación.
- Estados explícitos de carga, error y aviso: contador de coincidencias, aviso ámbar de resultado parcial y mensaje cuando ninguna incidencia cargada coincide.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentListFilters` | `status: IncidentStatusFilter`, `order: IncidentSortOrder`, `from: string \| null`, `to: string \| null` | Inicial: todos los estados, más recientes primero y sin rango |
| `IncidentStatusFilter` | `IncidentStatus \| 'all'` | `'all'` no filtra |
| `IncidentSortOrder` | `'newest' \| 'oldest'` | `'newest'` coincide con el orden del backend |

- Almacenamiento de esta fase: estado en memoria del hook.
- Ciclo de vida: los filtros se pierden al salir del listado o recargar.

## Diseño mínimo

`src/utils/incident-filters.ts` contiene la lógica pura (filtrar, ordenar y detectar si el resultado es parcial). `src/hooks/use-incident-filters.ts` guarda los filtros y deriva la lista visible. `src/components/incident-filters.tsx` pinta los controles con las recetas de `diseno-web`.

## Criterios de aceptación

1. Elegir un estado muestra solo las incidencias cargadas con ese estado.
2. El orden «Más antiguas primero» invierte el orden y desempata por id.
3. Un rango de días incluye los dos extremos completos; un rango abierto por un lado también funciona, y uno invertido se corrige también en los calendarios.
4. Si quedan páginas por cargar y el resultado puede estar incompleto, se muestra el aviso; si el rango ya está cubierto, no. Si falla la carga de la página siguiente, el aviso remite a «Reintentar».
5. «Limpiar filtros» vuelve al estado inicial y los valores desconocidos de los controles caen en el valor por defecto.

## Estrategia de verificación

Pruebas unitarias de `src/utils/incident-filters.ts` en `src/__tests__/utils/incident-filters.test.ts` para cada criterio, y comprobaciones de `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación).
