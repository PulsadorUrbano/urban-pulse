# 2026-11-25 — Especificación: filtrar el listado de incidencias en el backend

- Desarrollador responsable: @CodeJose21 (asignado en la incidencia #213).
- Asistente de IA: Codex con Ponytail.
- Modelo de IA: GPT-6 (versión exacta no disponible).
- Rama: `feature/filtrar-listado-incidencias-213-backend`.
- Última actualización: 2026-11-25.
- Estado: implementado y verificado el 2026-11-25.
- Plan: [Plan de implementación](plan.md).
- Referencia: [incidencia #213](https://github.com/PulsadorUrbano/urban-pulse/issues/213).

## Objetivo y alcance

`GET /incidents` debe filtrar sobre todas las incidencias en PostgreSQL antes de paginar. Los filtros opcionales `status`, `from`, `to`, `order`, `priority` y `categoryId` se pueden combinar entre sí y con `civicId`. Se conserva el cuerpo como array de resúmenes y las cabeceras de paginación. Solo se modifica el backend; la integración web de #213 queda fuera de alcance.

## Contrato HTTP

| Método y ruta | Entrada | Respuesta | Acceso |
| --- | --- | --- | --- |
| `GET /incidents` | Parámetros de consulta opcionales, sin cuerpo | `200`, array de resúmenes, `X-Page`, `X-Limit` y, si hay más, `X-Next-Cursor` y `Link` | JWT y permisos existentes |

| Parámetro | Validación y normalización | Omisión |
| --- | --- | --- |
| `civicId` | UUID único; se normaliza a minúsculas | Listado global si el rol lo permite |
| `limit` | Entero decimal entre 1 y 100 | 10 |
| `cursor` | Cursor opaco válido, asociado a los filtros actuales | Primera página |
| `status` | Uno de los valores de `IncidentStatus` | Todos |
| `from` | Fecha calendario `AAAA-MM-DD`; `createdAt` desde las 00:00 UTC inclusive | Sin límite inferior |
| `to` | Fecha calendario `AAAA-MM-DD`; `createdAt` antes de las 00:00 UTC del día siguiente | Sin límite superior |
| `order` | `newest` u `oldest` | `newest` |
| `priority` | `low`, `medium` o `high` | Todas |
| `categoryId` | UUID único; se normaliza a minúsculas | Todas |

Se rechazan con 400 valores repetidos, anidados, nulos, desconocidos o mal formados, así como `from` posterior a `to`. El cursor conserva el identificador, fecha, página, `civicId` y los seis filtros normalizados; si alguno no coincide con la petición, responde 400. El orden es por `createdAt` ascendente o descendente y, en ambos casos, por `id` ascendente en los empates. `Link` repite los filtros de la página siguiente. Los cursores anteriores al cambio no son reutilizables; se puede iniciar otra vez desde la primera página.

## Datos y diseño

Se reutiliza el modelo Prisma `Incident` y sus campos `status`, `createdAt`, `priority`, `categoryId`, `civicId` e `id`; no se cambian relaciones, nulabilidad, valores iniciales ni el esquema. Las incidencias siguen persistidas en PostgreSQL. `ListarIncidenciasPipe` valida la entrada y el cursor; `IncidentsService.listarPagina` aplica `where`, `orderBy` y el cursor keyset en la misma consulta; el controlador conserva el contrato HTTP y amplía la documentación Swagger. No se añaden dependencias, migraciones ni llamadas a servicios nuevos.

## Criterios de aceptación

1. Cada filtro válido limita la consulta de PostgreSQL y la combinación usa intersección.
2. Las fechas UTC incluyen todo el día `to`; fechas inválidas o rangos invertidos devuelven 400.
3. Ambos órdenes paginan sin duplicados, con desempate estable por `id`.
4. Un cursor con filtros diferentes o inválidos devuelve 400; el enlace siguiente conserva los filtros.
5. La ausencia de filtros conserva el listado y los permisos actuales; la ficha de [GET /incidents](../../endpoint/get-incidents/README.md) describe el contrato real.

## Verificación

Pruebas unitarias del pipe, servicio y controlador para validación, cada filtro, combinación, orden, cursores y enlaces; después `pnpm test`, `pnpm run build`, `pnpm run lint` y `git diff --check`. Los resultados se registran en el plan.
