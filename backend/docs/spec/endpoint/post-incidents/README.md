# 2026-10-21 — Registrar incidencias

- Método y ruta: POST /incidents.
- Estado: contrato comprobado por lectura del código; conectividad no probada en esta adaptación documental.
- Última revisión: 2026-11-03.

## Entrada, respuesta y errores

Entrada multipart/form-data. Campos obligatorios: title (texto con trim, 4-35 puntos de código) y civicId (UUID). Opcionales: description, categoryId (UUID), category, urbanAssetId (UUID), latitude [-90,90], longitude [-180,180] y accuracy >=0. Las coordenadas y precisión se reciben como cadenas numéricas finitas. Rechaza campos desconocidos. Las omisiones de metadatos opcionales se devuelven como null.

Admite hasta ocho archivos images JPEG/PNG/WebP, cada uno de 5 MB. Ejemplo mínimo de campos: title=Farola apagada y civicId=20ac442e-0f00-4fe4-bad3-61c8e8e0bff5.

Respuesta 201 con cabecera Location: /incidents/{id}. Devuelve id, title, description, civicId, categoryId, category, urbanAssetId, `departmentId=null`, `teamId=null`, `technicianId=null`, location (latitude, longitude, accuracy y createdAt), images (id, url, mimeType y createdAt), status=reported, priority=low y createdAt ISO. Las nuevas URLs de imágenes son HTTPS de Cloudinary. Los incidentId internos no se exponen en location o images.

Errores 400: campos o formatos inválidos, demasiados archivos, tamaño excesivo o MIME no admitido. No autentica al ciudadano ni comprueba la existencia de UUID referenciados. El nombre de categoría y categoryId se almacenan tal como se reciben tras validar la entrada; no se resuelve el nombre desde el ID.

## Integración para frontend

El cliente envía una petición `multipart/form-data` a `POST /incidents`. Incluye `title` y `civicId` como campos de texto y agrega cada foto al campo repetido `images`; los demás campos son opcionales según el contrato anterior. El backend recibe los bytes y los sube a Cloudinary sin escribirlos en su disco. El frontend no necesita claves de Cloudinary ni enviar un `public_id`.

Tras el 201, el cliente puede usar `images[].url` como URL HTTPS de cada foto. En GET /incidents/:id se devuelven esas mismas referencias. Si la subida o la persistencia fallan, no se devuelve 201; el cliente debe tratar la petición como fallida. El equipo de frontend decidirá cómo integrar este flujo y cuándo retirar su mock local.

## Almacenamiento y límites

Incidencias, ubicaciones, historial y referencias de imágenes se guardan en PostgreSQL. Las imágenes nuevas se guardan en Cloudinary y su `public_id` se conserva internamente. Requiere el esquema local preparado; no se aplican migraciones automáticamente.

El registro sigue creando status=reported; no devuelve el historial interno. Los cambios se describen en [validar o rechazar incidencias](../patch-incidents-id-status/README.md).

Las prioridades se etiquetan Baja (low), Media (medium) y Alta (high). El registro inicia Baja (low); las lecturas y respuestas completas pueden reflejar cualquier prioridad vigente. Véase [asignación manual](../patch-incidents-id-priority/README.md).

## Referencias

- [Especificación vigente](../../features/specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/create-incident.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
