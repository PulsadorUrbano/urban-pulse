# POST /incidents

- Estado: implementado; JWT y perfil ciudadano vigente obligatorios.
- Última revisión: 2026-11-22.
- Content-Type: `application/json`.

El cuerpo admite `title` de 4 a 35 caracteres, categoría opcional mediante `categoryId` o `category`, y `latitude` y `longitude` obligatorias y finitas dentro de sus rangos. `description` es texto opcional sin longitud mínima; `accuracy` no puede ser negativa; `urbanAssetId` debe existir si se envía; `address` es opcional con `street`, `zipCode` y `district`. Si se indica una categoría, debe pertenecer al catálogo activo; si llegan ID y nombre, deben coincidir. No se crean categorías a partir de texto libre. El propietario se deriva del token; no se admiten `civicId`, imágenes ni archivos en esta ruta.

La respuesta 201 contiene la incidencia, la categoría obtenida por relación y la ubicación. Si se omite la categoría, `categoryId` y `category` se devuelven como `null`. Si se omite `address`, el backend intenta resolverla desde las coordenadas antes de guardar; una dirección manual conserva prioridad y evita la consulta. La resolución externa es de mejor esfuerzo: un error, timeout o resultado sin número, código postal de cinco dígitos o distrito de Málaga reconocido deja `location.address` en `null` y no impide crear la incidencia. Cuando se resuelve, `street` contiene la vía y el número en una línea (por ejemplo, `Calle Larios, 12`). La llamada externa ocurre fuera de la transacción; la dirección, la ubicación y la incidencia se guardan atómicamente. `images` comienza vacío; después se añaden fotos mediante [POST /incidents/:id/images](../post-incidents-id-images/README.md). El detalle devuelve las fotos persistidas con URL temporales.

Errores: 400 entrada o catálogo inválidos; 401 identidad inválida; 403 perfil ausente; 503 PostgreSQL no disponible. Los fallos del geocodificador no se devuelven al cliente.

## Referencias

- [Especificación](../../features/specs/2026-11-22-geocodificar-direcciones-incidencias-spec.md).
- [Plan](../../features/plans/2026-11-22-geocodificar-direcciones-incidencias-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/create-incident.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
