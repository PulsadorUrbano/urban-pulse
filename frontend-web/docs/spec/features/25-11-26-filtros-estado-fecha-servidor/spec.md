# 2026-11-25 — Especificación: enviar al backend los filtros de estado, fecha y orden

- Desarrollador responsable: Alejandro (Alewuito).
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: feature/213-filtros-estado-fecha-servidor-frontend-web.
- Última actualización: 2026-11-25.
- Estado: implementado y verificado con pruebas unitarias; prueba manual con el backend pendiente.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: issue #213 (parte frontend), #173, PR #214 (backend) y PR #215 (prioridad y categoría). Sustituye el filtrado local de [19-11-26-filtros-estado-fecha](../19-11-26-filtros-estado-fecha/spec.md).

## Objetivo y decisiones vigentes

Los filtros de estado, fecha y orden se aplicaban en el navegador sobre las páginas ya cargadas, así que no veían toda la base de datos. Desde la #214, `GET /incidents` filtra y ordena antes de paginar. La web debe enviar todos los filtros en la petición y mostrar lo que devuelve el backend.

- Alcance confirmado: enviar `status`, `from`, `to` y `order` junto a `priority` y `categoryId`; volver a la primera página al cambiar cualquier filtro; quitar el filtrado, la ordenación y el aviso de resultado parcial del navegador.
- Decisiones confirmadas:
  - Los valores por defecto (todos los estados, sin fechas, más recientes primero) no se envían.
  - Se conserva el intercambio de «Desde» y «Hasta» invertidos, porque el backend responde 400 si `from` es posterior a `to`.
  - Las fechas se envían tal como las elige el usuario y el backend las interpreta en UTC (#214). Se acepta para no cambiar el backend.
- Suposiciones por validar: ninguna.
- Fuera de alcance: cambios en `backend/` y en los controles de prioridad y categoría.

## Contexto verificado

- Implementación actual: `useIncidentFilters` envía solo prioridad y categoría y filtra el resto con `applyIncidentFilters`.
- Contratos y referencias del dominio: `ListarIncidenciasPipe` acepta `status`, `from`, `to`, `order`, `priority` y `categoryId`, y liga el cursor a los filtros.
- Configuración y dependencias disponibles: sin dependencias nuevas.
- Diferencia entre estado actual y propuesto: todos los filtros se resuelven en la consulta del backend.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| GET /incidents | `status`, `from`, `to` (AAAA-MM-DD, UTC), `order` (`newest`/`oldest`), `priority`, `categoryId`, `limit`, `cursor`; JWT Bearer | 200 con `{ id, title, status, createdAt }[]` y `X-Next-Cursor` | [get-incidents](../../../../../backend/docs/spec/endpoint/get-incidents/README.md) |

- Identidad y permisos: token de administración, igual que el listado actual.
- Si el backend no responde: se mantiene el error con «Reintentar» del listado.

### Mock (`src/mocks/`)

No aplica: el listado no tiene mock.

## Contrato de UI y navegación

- Vistas afectadas: `src/components/incident-list-view.tsx`.
- Componentes nuevos vs. reutilizados: se reutilizan `IncidentFilters` e `IncidentListView`.
- Estados explícitos de carga/error/aviso: desaparecen el contador «X de Y cargadas» y el aviso de resultado parcial; sin resultados se muestra «No hay incidencias que coincidan con los filtros».

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentPageFilters` | añade `status`, `from`, `to` y `order`, todos opcionales | Omitir un campo equivale a no filtrar |

- Almacenamiento de esta fase: estado en memoria del hook.
- Ciclo de vida: los filtros se pierden al salir del listado.

## Diseño mínimo

`toPageFilters` en `src/utils/incident-filters.ts` traduce los controles a los parámetros. `useIncidentFilters` se los pasa a `useIncidentList`, cuya consulta cambia de identidad al cambiar cualquier filtro y vuelve a la primera página. `fetchIncidentPage` los añade a la URL.

## Criterios de aceptación

1. Cambiar estado, fechas u orden pide la primera página con esos parámetros y descarta las filas anteriores.
2. «Cargar más» conserva todos los filtros junto al cursor.
3. Los valores por defecto no se envían y «Limpiar filtros» vuelve a una petición sin criterios.
4. Un rango elegido al revés se envía ordenado.
5. La web no filtra ni reordena en el navegador lo que devuelve el backend.

## Estrategia de verificación

Pruebas unitarias de `toPageFilters`, de `useIncidentFilters`, de `useIncidentList` (cambio de criterio) y de `fetchIncidentPage` (parámetros), más `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.

Los resultados reales se registran en [el plan](./plan.md#confirmación-de-implementación).
