# ADR 0009: Arquitectura del dashboard municipal (mapa por ventana, indicadores en servidor y visibilidad por ámbito)

- Estado: Propuesto, pendiente de revisión.
- Fecha de registro: 2026-11-28.
- Relacionados: [DD-001 - Dashboard para operadores municipales y técnicos](../disenyo/disenyo-dashboard.md), [ADR 0004 - Stack del frontend web](0004-frontend-web-stack.md), [contrato de GET /incidents](../../backend/docs/spec/endpoint/get-incidents/README.md).

## Contexto

`frontend-web/` cuenta hoy con inicio de sesión, listado paginado por cursor con filtros básicos (`status`, `priority`, `categoryId`, `from`, `to` y `order`) y vista de detalle para validar, priorizar y asignar incidencias. Faltan el mapa de incidencias, los indicadores generales y los filtros por distrito y departamento previstos para la Fase 6.

En el backend, `GET /incidents` devuelve resúmenes sin coordenadas (`limit <= 100`) y limita la consulta global a `admin` y `administrative`, dejando con `403` a `department`, `team`, `technician` y `analyst`. Con la ampliación del conjunto de datos a 50.000 incidencias (PR #219), descargar todas las incidencias al navegador o consultar cada detalle por separado no es viable.

## Decisión propuesta

Servir el mapa municipal mediante un endpoint dedicado `GET /incidents/map` filtrado por ventana visible (`bbox` y `zoom`), devolviendo agrupaciones espaciales calculadas en PostgreSQL/PostGIS en zooms bajos y medios, y puntos ligeros en zooms cercanos con un tope máximo por respuesta.

Calcular los indicadores generales en el servidor mediante `GET /incidents/summary` (totales, desgloses por estado, prioridad, categoría y distrito, y tiempos de resolución), compartiendo exactamente los mismos filtros combinables que el mapa y el listado. El listado `GET /incidents` mantiene su contrato actual y añade de forma compatible `district` y `departmentId`.

Abrir el acceso al dashboard para todos los roles municipales aplicando siempre la visibilidad por ámbito desde el JWT y las membresías activas en base de datos: `admin`, `administrative` y `analyst` consultan todas las incidencias (`analyst` en solo lectura), `department` consulta su departamento, `team` su equipo, `technician` sus incidencias asignadas y `civic` queda bloqueado en mapa e indicadores.

Esta decisión es una propuesta preliminar pendiente de revisión por el equipo y de validación por el cliente antes de pasar a implementación.

## Alternativas consideradas

- **Reutilizar `GET /incidents` y `GET /incidents/:id` desde el navegador:** evita añadir endpoints nuevos, pero genera miles de peticiones N+1 con 50.000 incidencias, impide calcular indicadores reales sin descargar toda la base y penaliza el cliente.
- **Endpoint plano de coordenadas con clustering solo en cliente (Leaflet + Supercluster):** simplifica el backend, pero con 50.000 incidencias obliga a transferir megabytes en vistas generales de la ciudad o a truncar marcadores de forma sesgada.
- **Lectura global para todos los operadores y técnicos:** simplifica la autorización, pero rompe el mínimo privilegio y expone incidencias ajenas al departamento o equipo de cada perfil.

## Consecuencias

Positivas:

- El tamaño de las respuestas y el consumo del navegador permanecen acotados aunque el volumen crezca a 50.000 incidencias o más.
- Los indicadores reflejan la base de datos completa filtrada y coinciden con el mapa y el listado.
- Se aprovecha PostgreSQL/PostGIS ya desplegado sin añadir nuevos contenedores ni APIs de mapas de pago.
- Se conserva la compatibilidad con los consumidores actuales de `GET /incidents`, incluido `frontend-mobile/`.
- El control de ámbito por rol se aplica siempre en el servidor.

Negativas y riesgos:

- El backend asume mayor complejidad al mantener dos endpoints nuevos, consultas espaciales PostGIS e índices adicionales en base de datos.
- El cálculo de tiempos de resolución sobre `status_changes` y el clustering bajo concurrencia deben medirse con `k6` sobre 50.000 filas; si el rendimiento no basta, habrá que valorar una columna `resolvedAt` en `Incident` o una caché corta.
- Las incidencias creadas sin `Address` no tienen distrito hasta integrar la geocodificación (`#210`), por lo que aparecen bajo "Sin distrito".
- Cuando se implemente la unificación de reportes (`DD-003`), estos endpoints deberán adaptarse para leer incidencias normalizadas y no duplicar recuentos.
