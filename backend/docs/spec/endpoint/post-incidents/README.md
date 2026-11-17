# POST /incidents

- Estado: implementado; JWT y perfil ciudadano vigente obligatorios.
- Última revisión: 2026-11-17.
- Content-Type: `application/json`.

El cuerpo admite `title` de 4 a 35 caracteres, categoría obligatoria mediante `categoryId` o `category`, y `latitude` y `longitude` obligatorias y finitas dentro de sus rangos. `description` es opcional de al menos 10 caracteres; `accuracy` no puede ser negativa; `urbanAssetId` debe existir si se envía; `address` es opcional con `street`, `zipCode` y `district`. La categoría debe pertenecer al catálogo activo; si llegan ID y nombre, deben coincidir. No se crean categorías a partir de texto libre. El propietario se deriva del token; no se admiten `civicId`, imágenes ni archivos en esta ruta.

La respuesta 201 contiene la incidencia, la categoría obtenida por relación y la ubicación. Alta, ubicación y estado inicial `reported` se guardan en una transacción. `images` comienza vacío; después se añaden fotos mediante [POST /incidents/:id/images](../post-incidents-id-images/README.md). El detalle devuelve las fotos persistidas con URL temporales.

Errores: 400 entrada o catálogo inválidos; 401 identidad inválida; 403 perfil ausente; 503 PostgreSQL no disponible.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/create-incident.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
