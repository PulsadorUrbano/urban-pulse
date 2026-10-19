# Informe de implementación: registro de incidencias

## Alcance entregado

Se amplió el módulo NestJS temporal para crear y consultar incidencias sin base de datos, autenticación ni consulta de identidad ciudadana. Acepta formularios multipart con `civicId`, categoría por nombre, ubicación, precisión e imágenes; los metadatos viven en memoria y las imágenes se guardan temporalmente en disco local.

## API

- `POST /incidents`: crea una incidencia, responde `201 Created` y añade `Location: /incidents/{id}`.
- `GET /incidents/:id`: devuelve `200` para una incidencia existente, `400` para un UUID de ruta inválido y `404` para un UUID válido inexistente.

Las entradas aceptan `title`, `description` opcional, `civicId`, `categoryName`, `latitude`, `longitude`, `accuracy` opcional, `urbanAssetId` opcional y hasta cinco imágenes JPEG/PNG/WebP de 5 MB. `civicId` y el activo urbano se comprueban solo como UUID. La categoría se resuelve por nombre normalizado contra cinco categorías simuladas o se crea temporalmente. Se rechazan campos desconocidos y los controlados por el servidor. La respuesta incluye `description: null` cuando falta, categoría, ubicación con `createdAt` y URL locales bajo `/uploads/`.

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
| Pruebas focalizadas de categorías y servicio | Correcto: 7 pruebas. |
| Pruebas focalizadas de pipe y servicio | Correcto: 26 pruebas. |
| Pruebas e2e de incidencias multipart y Swagger | Correcto: 9 pruebas. |
| `npm run build` | Correcto. |
| `npm run lint` | Correcto con 3 avisos existentes sobre el conteo de puntos de código Unicode. |
| `npm test` | 28 de 29 correctas; persiste el fallo previo de `src/prisma/prisma.service.spec.ts` porque no proporciona `ConfigService`. |
| `npm run test:e2e` | Correcto: 10 pruebas. |

La prueba de humo compilada creó una incidencia multipart en el puerto local de prueba, recuperó su imagen con `200 image/png`, reinició el proceso y comprobó que el identificador anterior respondía `404`. Se eliminaron los archivos y registros de esa prueba.

## Limitaciones y trabajo aplazado

El almacenamiento es un `Map` local y las imágenes residen en disco local temporal: ambos se pierden al reiniciar y no se comparten entre instancias. Se aplazan base de datos, migraciones, almacenamiento cloud, análisis antivirus, comprobación de referencias, identidad ciudadana, autenticación, autorización, edición, borrado, listado, asignación e historial.
