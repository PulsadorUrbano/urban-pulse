# 2026-11-25 - Especificación: conectar prioridad y categoría al backend desde la web

- Desarrollador responsable: Artina (`artina09`).
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: GPT-6. Identificador exacto de la sesión no disponible.

- Rama: feature/filtros-prioridad-categoria-web.
- Última actualización: 2026-11-25.
- Estado: frontend implementado y verificado mediante pruebas unitarias; prueba manual con backend pendiente.
- Plan: [Plan de implementación](./plan.md).
- Referencias: [#196](https://github.com/PulsadorUrbano/urban-pulse/issues/196), [#197](https://github.com/PulsadorUrbano/urban-pulse/issues/197), [#214](https://github.com/PulsadorUrbano/urban-pulse/pull/214).

## Objetivo y decisiones vigentes

Completar frontend web de prioridad/categoría consumiendo el filtrado servidor ya implementado por José e integrado por Artina.

- Solo frontend-web; no implementar ni modificar backend.
- Filtrado real mediante GET /incidents, nunca sobre páginas recibidas en el navegador.
- Consumir el contrato integrado, no el contrato propuesto anteriormente en estos documentos.
- Estado/fecha/orden web corresponden a Suito; preservar su implementación actual y no duplicarla.
- Fuera de alcance: móvil, otros filtros, totales globales, cambios de permisos y esquema.

## Contexto verificado

#214 implementa filtros combinables de estado, fechas, orden, prioridad y categoría antes de paginar en PostgreSQL. Conserva resumen y autorización; vincula cursor a criterios. La integración fue confirmada por Artina. Se comprobó que el hook remoto de Suito seguía local al implementar. El último fetch ya actualizó origin/dev con #214; falta incorporar esos cambios a la rama antes de probar el flujo real/publicar.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Endpoint/parámetro | Contrato integrado relevante |
| --- | --- |
| GET /incidents, priority | Opcional: low, medium o high. Omitido: todas |
| GET /incidents, categoryId | UUID opcional. Omitido: todas; combinación AND con prioridad |
| GET /incidents, cursor | Opaco; repetir criterios vigentes en cada continuación. Cambios requieren reinicio sin cursor |
| GET /incidents, limit | Contrato existente: 1–100, predeterminado 10 |
| GET /categories | Catálogo real activo: array de id, name y createdAt |

- Identidad: Bearer de sesión y permisos actuales.
- Respuesta listado: array de id, title, status, createdAt; X-Next-Cursor indica continuación. No exige devolver prioridad/categoría.
- Entradas inválidas o cursor incompatible: 400. JWT/acceso: 401/403. Persistencia no disponible: 503.
- Cursores anteriores a #214 no son compatibles; empezar por primera página. El frontend no los interpreta ni migra.
- La API también admite status, from, to y order. Fechas AAAA-MM-DD con límites de día UTC; order newest por defecto u oldest. Esta feature no migra los controles de Suito.
- «Todas» no se envía como all, cadena vacía ni null literal.
- Referencias de consumo: [GET /incidents](../../../../../backend/docs/spec/endpoint/get-incidents/README.md) y [GET /categories](../../../../../backend/docs/spec/endpoint/get-categories/README.md). Leer las versiones de dev que incluya #214.

### Mock (src/mocks/)

No añadir fallback ficticio del listado. Unitarias web con respuestas controladas conformes al contrato integrado; conservar demostración de asignaciones existente.

## Contrato de UI y navegación

- Ampliar panel existente: prioridad todas/baja/media/alta y categoría todas/catálogo por ID.
- Selección nueva reinicia páginas/cursor y solicita resultados al servidor. No presentar filas de otra consulta como actuales.
- Cargar más conserva criterios y agrega solo páginas de la misma consulta.
- Reintento corresponde a la consulta vigente; ignorar respuestas tardías y de otra sesión.
- Limpiar restaura todos los controles y solicita primera página sin nuevos criterios.
- Catálogo con carga/error/reintento independiente y sin opciones inventadas.
- Mantener estado/fecha/orden y, si todavía son locales, sus avisos de parcialidad.
- Contador de cargadas, sin total global inventado; accesibilidad y claro/oscuro coherentes.

## Tipos y datos mock

Reutilizar IncidentPriority; ampliar selecciones/opciones de petición y tipo de catálogo cuando haga falta. IncidentSummary mantiene el contrato integrado. Estado en memoria; sin nueva persistencia ni tipos backend duplicados.

## Diseño mínimo

Servicios serializan filtros y validan JSON; hook de listado gestiona criterios, páginas y cancelación/obsolescencia; hook de filtros guarda selección y reset; vista conecta panel y catálogo. Reutilizar la adaptación de Suito si ya existe en dev. Sin predicados locales nuevos de prioridad/categoría ni consultas de detalle por fila.

## Criterios de aceptación

1. Prioridad/categoría solas y combinadas se envían a GET /incidents; «todas» omite el criterio.
2. Categorías provienen del catálogo real con validación; fallos ofrecen reintento sin bloquear prioridad/listado.
3. Cambiar criterio reinicia cursor/filas; continuación repite filtros y acumula solo páginas del mismo conjunto.
4. Respuestas obsoletas no mezclan búsquedas/sesiones; errores y reintentos conservan la selección vigente.
5. Se mantiene resumen, permisos y servicios existentes; sin filtrado local nuevo ni peticiones de detalle por fila.
6. Limpiar restaura controles y consulta; estado/fecha/orden conservan su implementación vigente, con aviso parcial si siguen locales.

## Estrategia de verificación

Unitarias web: serialización, catálogo, reinicio y continuación, reset, errores y respuestas fuera de orden. Ejecutar tests, typecheck, lint, build y diff --check. No repetir implementación o pruebas backend. Sin e2e/integración salvo petición.

Resultados reales en [el plan](./plan.md#confirmación-de-implementación).
