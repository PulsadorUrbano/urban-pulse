# GET /incidents/:id

- Estado: implementado; JWT obligatorio.
- Última revisión: 2026-11-17.

Un operador municipal puede consultar una incidencia de su ámbito: administración cualquier incidencia, departamento las propias y equipo o técnico las de su equipo activo. Un usuario con perfil ciudadano puede consultar las suyas aunque tenga también función municipal. Una incidencia ajena responde 404, igual que una inexistente.

La respuesta 200 contiene categoría obtenida por relación, ubicación obligatoria e imágenes persistidas con URL de lectura temporales. Con CloudFront configurado, las URL proceden de la distribución privada; durante la transición sin esa configuración, son URL prefirmadas de S3. La clave S3 no se expone.

Errores: 400 UUID inválido; 401 JWT inválido; 403 rol o perfil no permitido; 404 ausente o fuera de ámbito; 502 fallo al firmar fotos; 503 PostgreSQL no disponible o configuración de CloudFront incompleta.

## Referencias

- [Especificación CloudFront](../../features/15-11-26-integrar-fotos-cloudfront/spec.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
