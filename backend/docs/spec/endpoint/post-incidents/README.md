# POST /incidents

Requiere JWT y perfil citizens, compatible con cualquier rol municipal. El propietario se deriva del token.
JSON: title de 4 a 35 caracteres, categoría obligatoria mediante categoryId o category, latitude y longitude obligatorias y finitas en sus rangos. description opcional de al menos 10 caracteres; accuracy no negativa; urbanAssetId opcional existente; address opcional con street, zipCode y district.
La categoría debe pertenecer al catálogo activo. Si llegan ID y nombre, deben coincidir. No se crean categorías.
201 devuelve el recurso, category obtenido por relación y Location. Alta, ubicación y estado inicial reported se guardan en una transacción.
Errores: 400 entrada o catálogo inválidos, 401 identidad inválida, 403 perfil ausente, 503 almacenamiento no disponible.
Última revisión: 2026-11-17.
