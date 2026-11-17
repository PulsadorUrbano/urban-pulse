# GET /incidents/:id — consultar una incidencia

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-15.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Roles: `civic`, `admin` y `administrative` vigentes en PostgreSQL.

`id` debe ser UUID y no hay cuerpo. Un operador puede consultar cualquier incidencia. Un ciudadano solo puede consultar una incidencia cuyo `civicId` coincida con su vínculo ciudadano; una incidencia ajena responde 404, igual que una inexistente, para no revelar su existencia.

La respuesta 200 usa el recurso completo documentado en [POST /incidents](../post-incidents/README.md). `images` contiene las fotos registradas, con URL HTTPS firmadas durante 15 minutos; puede estar vacío. Con CloudFront configurado, las URL son de la distribución privada. Durante la transición sin configuración CloudFront, son URL prefirmadas de S3. La clave S3 no se expone. Errores: 400 UUID inválido; 401 JWT inválido; 403 rol o vínculo no permitido; 404 ausente o ajena; 502 error al firmar las fotos; 503 PostgreSQL no disponible o configuración de CloudFront incompleta.

## Referencias

- [Especificación CloudFront](../../features/15-11-26-integrar-fotos-cloudfront/spec.md)

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
- [Diseño integrado](../../features/09-11-26-integrar-incidencias-jwt-prisma-sin-imagenes/spec.md)
