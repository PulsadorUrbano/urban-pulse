# 2026-11-09 — Especificación: paginar incidencias con cursor

- Desarrollador responsable: no indicado por la persona usuaria.
- Asistente de IA: OpenCode.
- Modelo de IA que creó la especificación: opencode-go/gpt-6-luna.
- Rama: `feature/web-typescript-migration`.
- Última actualización: 2026-11-12.
- Estado: implementado y verificado; resultados en el [plan](../plans/2026-11-09-paginar-incidencias-con-cursor-plan.md).
- Plan: [Plan de implementación](../plans/2026-11-09-paginar-incidencias-con-cursor-plan.md).
- Referencias: solicitud de limitar y paginar GET /incidents; contrato existente de [GET /incidents](../../endpoint/get-incidents/README.md).

## Objetivo y decisiones vigentes

Limitar el tamaño del listado y permitir continuar páginas sin desplazamiento OFFSET. La solicitud inicial representa la página 0, devuelve hasta 10 elementos por defecto y permite pedir hasta 100.

- Alcance confirmado: `limit` opcional 1–100; cursor opaco de continuación; conservar filtro civicId y cuerpo de respuesta como array para no romper consumidores.
- Decisiones confirmadas: keyset con `(createdAt DESC, id ASC)`; cursor codifica ambas claves y el índice de página. `Link: rel="next"` y cabeceras X-* exponen continuidad sin cambiar el array JSON.
- Suposiciones por validar: ninguna.
- Fuera de alcance: cambiar frontends, autenticación, persistencia, total de resultados o saltar arbitrariamente a páginas numéricas.

## Contexto verificado

- Implementación base: `dev` consultaba el listado filtrado en PostgreSQL mediante Prisma; la rama original de esta PR había aplicado el cursor sobre un almacenamiento en memoria.
- Dependencias: NestJS 12, Prisma 7.10.1, TypeScript 6 y Vitest 4; incidencias en PostgreSQL.
- Cambio: tomar como máximo `limit + 1`, aplicar una clave keyset estable y emitir cursor solo si existe otra página.

## Contrato HTTP

| Método y ruta | Entrada | Respuesta | Acceso |
| --- | --- | --- | --- |
| GET /incidents | `limit` opcional, `cursor` opcional, `civicId` opcional | Array JSON existente; cabeceras X-Page, X-Limit, opcional X-Next-Cursor y Link rel=next | Sin autenticación implementada |

### Validación y normalización

| Parámetro | Tipo | Obligatorio | Validación | Omisión |
| --- | --- | --- | --- | --- |
| limit | Entero decimal | No | 1–100 | 10 |
| cursor | Base64url | No | JSON con UUID, fecha ISO, página positiva y civicId coherente | Inicia la página 0 |
| civicId | UUID | No | Único UUID válido | Lista global |

- Orden determinista: fecha de creación descendente e id ascendente para empates.
- Cursor continua después de su `(createdAt,id)`; el filtro del ciudadano queda ligado al cursor. Cursor no es una credencial ni autorización.
- Respuesta correcta: array sin envoltorio y las mismas propiedades de resumen previas. `X-Page` empieza en 0. No se devuelve total global.
- 400 para límite, cursor, UUID o parámetros inválidos/desconocidos.
- Compatibilidad: conserva el cuerpo JSON existente; añade metadatos en cabeceras.

## Datos y diseño

No se modifican modelos Prisma. `findMany` aplica el filtro `civicId`, la condición lexicográfica `(createdAt < fecha) OR (createdAt = fecha AND id > idCursor)`, el orden y `take: limit + 1` en PostgreSQL. El servicio serializa como máximo `limit` resúmenes y usa la fila adicional solo para decidir si hay continuación. Los registros sobreviven al reinicio; el cursor no representa una instantánea de la colección.

## Criterios de aceptación

1. Primera página sin cursor es página 0 con 10 elementos como máximo; limit acepta hasta 100 y rechaza valores fuera del rango.
2. Cursor keyset recorre páginas en orden determinista, sin repetir la última fila ni usar OFFSET.
3. El filtro civicId se conserva a través de la paginación.
4. El cuerpo sigue siendo el array existente; cabeceras anuncian página, límite y continuación.
5. Las pruebas unitarias y la ficha del endpoint cubren el contrato.

## Verificación

Unitarias del pipe y servicio; compilación, lint y `git diff --check`. No se crean ni ejecutan pruebas e2e. Resultados y confirmación en el [plan](../plans/2026-11-09-paginar-incidencias-con-cursor-plan.md#confirmación-de-implementación).
