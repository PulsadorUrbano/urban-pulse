# Informe de implementación: registro de incidencias

## Alcance entregado

Se implementó un módulo NestJS independiente para crear y consultar incidencias sin base de datos, identidad ciudadana ni autenticación. El módulo valida el cuerpo HTTP, genera identificador y fecha en el servidor y guarda los datos en memoria del proceso.

## API

- `POST /incidents`: crea una incidencia, responde `201 Created` y añade `Location: /incidents/{id}`.
- `GET /incidents/:id`: devuelve `200` para una incidencia existente, `400` para un UUID de ruta inválido y `404` para un UUID válido inexistente.

Las entradas aceptan `title`, `description`, `categoryId`, `latitude`, `longitude` y opcionalmente `urbanAssetId`. Se rechazan campos desconocidos, incluidos `civicId`, `id`, `createdAt`, `status` y `priority`. Categoría y activo urbano se comprueban solo como UUID; no existe todavía comprobación de referencias.

## Archivos principales

- `backend/src/incidents/`: tipo, DTO, pipe de validación, servicio, controlador, módulo y pruebas unitarias.
- `backend/test/incidents.e2e-spec.ts`: contrato HTTP y Swagger.
- `backend/src/app.module.ts`: activa `IncidentsModule` y deja de activar Prisma en la raíz.
- `backend/test/app.e2e-spec.ts`: comprueba inicio sin `DATABASE_URL`, salud e incidencias.
- `README.md` y `backend/AGENTS.md`: contrato y limitaciones actualizados.

## Comprobaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `npm run build` | Correcto. |
| `npm run lint` | Correcto con 3 avisos de Oxlint sobre el conteo de puntos de código Unicode. |
| `npm test -- src/incidents/incidents.service.spec.ts` | Correcto: 3 pruebas. |
| `npm test -- src/incidents/create-incident.pipe.spec.ts` | Correcto: 18 pruebas. |
| `npm run test:e2e` | Correcto: 3 pruebas. |
| `npm test` | Un fallo previo: `src/prisma/prisma.service.spec.ts` no proporciona `ConfigService`. |

También se ejecutó `node dist/main` sin `DATABASE_URL`: `POST /incidents` y `GET /health` respondieron correctamente. Tras detener realmente el proceso y arrancarlo de nuevo, el identificador creado respondió `404`.

## Limitaciones y trabajo aplazado

El almacenamiento es un `Map` local al proceso: los datos se pierden al reiniciar y no se comparten entre instancias. Se aplazan base de datos, migraciones, comprobación de referencias, identidad ciudadana, autenticación, autorización, edición, borrado, listado, asignación e historial.
