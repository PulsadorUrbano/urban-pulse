# 2026-11-09 — Especificación: consultar todas las incidencias

- Desarrollador responsable: no indicado por la persona usuaria.
- Asistente de IA: OpenCode.
- Modelo de IA que creó la especificación: opencode-go/gpt-6-luna.

- Rama: `feature/web-typescript-migration`.
- Última actualización: 2026-11-12.
- Estado: implementado y verificado; ver resultados y comprobaciones en el [plan](../plans/2026-11-09-consultar-todas-las-incidencias-plan.md).
- Plan: [Plan de implementación](../plans/2026-11-09-consultar-todas-las-incidencias-plan.md).
- Referencias: solicitud de consultar todas las incidencias y contrato vigente de [GET /incidents](../../endpoint/get-incidents/README.md).

## Objetivo y decisiones vigentes

Permitir que un consumidor del backend consulte los resúmenes de todas las incidencias registradas. Se conserva el contrato existente de consulta por ciudadano para no romper consumidores.

- Alcance confirmado: si GET /incidents no recibe parámetros, lista todas las incidencias; si recibe civicId, conserva el listado filtrado por ciudadano.
- Decisiones confirmadas: reutilizar GET /incidents y el formato de resumen ya existente; ordenar por fecha descendente y desempatar por identificador ascendente.
- Suposiciones por validar: ninguna.
- Fuera de alcance: autenticación/autorización, paginación, persistencia, detalle completo, historial y cambios en consumidores o frontends.

## Contexto verificado

- Implementación actual: `IncidentsController.listar` recibía civicId obligatorio; `ListarIncidenciasPipe` rechazaba consulta vacía y `IncidentsService` solo listaba por ciudadano.
- Contratos y referencias del dominio: GET /incidents?civicId=<UUID> ya existía; GET /incidents/:id devuelve el detalle individual.
- Configuración y dependencias disponibles: NestJS 12, Prisma 7.10.1, TypeScript 6 y Vitest 4; el listado consulta PostgreSQL.
- Diferencia entre estado actual y propuesto: civicId pasa a ser opcional; omitirlo consulta globalmente, manteniendo la validación estricta de los demás parámetros.

## Contrato HTTP

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| GET /incidents | Sin cuerpo; civicId=<UUID> es opcional | 200 y array de resúmenes, ordenados del más reciente al más antiguo | Sin autenticación ni autorización implementada |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| civicId, consulta | Texto UUID | No | Si está presente debe ser un único UUID; se normaliza a minúsculas | Si se omite, no filtra por ciudadano; null y vacío se rechazan |

- Campos desconocidos y campos controlados por servidor: parámetros de consulta desconocidos se rechazan; los registros existentes determinan los resultados.
- Recurso de respuesta: array sin envoltorio; cada resumen incluye id, title, status y createdAt en formato ISO. No expone civicId, ubicación, imágenes ni historial.
- Errores: 400 para un civicId inválido, repetido, anidado o acompañado de parámetros desconocidos.
- Identidad y permisos: no se comprueban. El listado global es accesible sin autenticación; esto mantiene una limitación de seguridad existente del módulo de incidencias y queda documentado como deuda.
- Compatibilidad: las consultas existentes con civicId conservan la misma respuesta. Una consulta vacía ahora devuelve resultados globales en lugar de 400.

## Modelos y objetos Prisma

No se añaden ni modifican modelos Prisma: se reutiliza `Incident` y la proyección pública `ResumenIncidencia`. El servicio consulta solo los campos necesarios y serializa `createdAt` como ISO; no expone los objetos internos.

- Almacenamiento de esta fase: PostgreSQL mediante Prisma.
- Ciclo de vida: los datos persisten tras reiniciar y pueden consultarse desde otros procesos conectados a la misma base.
- Relaciones: no se consultan ni se validan referencias adicionales.
- Base de datos y migraciones: se usa el esquema existente de `dev`; esta PR no crea ni aplica migraciones.

## Diseño mínimo

Ampliar el pipe existente para aceptar una consulta vacía o un único civicId válido. El servicio usa `findMany` con filtro opcional y proyección de resumen; el controlador devuelve el mismo array HTTP con las cabeceras de paginación.

## Criterios de aceptación

1. GET /incidents sin consulta devuelve un resumen de cada incidencia almacenada, incluidos distintos civicId, ordenado de más reciente a más antiguo.
2. GET /incidents?civicId=<UUID> mantiene el filtrado existente; UUID inválido o parámetros desconocidos producen 400.
3. La respuesta conserva solo id, title, status y createdAt y no permite modificar los registros almacenados.
4. Una colección sin incidencias devuelve [] y la limitación de acceso no autenticado queda documentada.
5. Catálogo, README del backend y pruebas unitarias reflejan el contrato actualizado.

## Documentación de endpoints

- Carpeta por endpoint: [GET /incidents](../../endpoint/get-incidents/README.md).
- El contrato documenta los dos modos de consulta sin realizar solicitudes en vivo ni conectar consumidores.

## Estrategia de verificación

Pruebas unitarias del servicio para listado global, orden, lista vacía y aislamiento; pruebas unitarias del pipe para consulta vacía y validación del filtro. Ejecutar las comprobaciones de backend y `git diff --check`; si npm está disponible, usar `npm test`, `npm run build` y `npm run lint`. No se crean ni ejecutan pruebas e2e.

Los resultados y la confirmación de implementación se registran en el [plan](../plans/2026-11-09-consultar-todas-las-incidencias-plan.md#confirmación-de-implementación).
