# GET /incidents/:id — consultar una incidencia

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-09.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Roles: `civic`, `admin` y `administrative` vigentes en PostgreSQL.

`id` debe ser UUID y no hay cuerpo. Un operador puede consultar cualquier incidencia. Un ciudadano solo puede consultar una incidencia cuyo `civicId` coincida con su vínculo ciudadano; una incidencia ajena responde 404, igual que una inexistente, para no revelar su existencia.

La respuesta 200 usa el recurso completo documentado en [POST /incidents](../post-incidents/README.md). `images` siempre es `[]` por compatibilidad temporal. Errores: 400 UUID inválido; 401 JWT inválido; 403 rol o vínculo no permitido; 404 ausente o ajena; 503 PostgreSQL no disponible.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
- [Diseño integrado](../../../../../docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md)
