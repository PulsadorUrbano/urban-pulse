# 2026-10-21 — Registrar incidencias

- Método y ruta: POST /incidents.
- Estado: contrato comprobado por lectura del código; conectividad no probada en esta adaptación documental.
- Última revisión: 2026-10-21.

## Entrada, respuesta y errores

Entrada multipart/form-data. Campos obligatorios: title (texto con trim, 4-35 puntos de código) y civicId (UUID). Opcionales: description, categoryId (UUID), category, urbanAssetId (UUID), latitude [-90,90], longitude [-180,180] y accuracy >=0. Las coordenadas y precisión se reciben como cadenas numéricas finitas. Rechaza campos desconocidos. Las omisiones de metadatos opcionales se devuelven como null.

Admite hasta ocho archivos images JPEG/PNG/WebP, cada uno de 5 MB. Ejemplo mínimo de campos: title=Farola apagada y civicId=20ac442e-0f00-4fe4-bad3-61c8e8e0bff5.

Respuesta 201 con cabecera Location: /incidents/{id}. Devuelve id, title, description, civicId, categoryId, category, urbanAssetId, location (latitude, longitude, accuracy y createdAt), images (id, url, mimeType y createdAt), status=reported, priority=low y createdAt ISO. Las URLs de imágenes son relativas a /uploads/. Los incidentId internos no se exponen en location o images.

Errores 400: campos o formatos inválidos, demasiados archivos, tamaño excesivo o MIME no admitido. No autentica al ciudadano ni comprueba la existencia de UUID referenciados. El nombre de categoría y categoryId se almacenan tal como se reciben tras validar la entrada; no se resuelve el nombre desde el ID.

## Almacenamiento y límites

Incidencias y metadatos en un Map local tipado por modelos Prisma; se pierden al reiniciar y no se comparten entre procesos. Las imágenes son archivos locales; su existencia no conserva el registro de la incidencia tras un reinicio. No hay base de datos activa ni garantía de persistencia duradera.

El registro sigue creando status=reported; no devuelve el historial interno. Los cambios se describen en [validar o rechazar incidencias](../patch-incidents-id-status/README.md).

Las prioridades se etiquetan Baja (low), Media (medium) y Alta (high). El registro inicia Baja (low); las lecturas y respuestas completas pueden reflejar cualquier prioridad vigente. Véase [asignación manual](../patch-incidents-id-priority/README.md).

## Referencias

- [Especificación vigente](../../features/specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/create-incident.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
