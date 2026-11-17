# PATCH /incidents/:id/status

- Estado: implementado; JWT obligatorio.
- Última revisión: 2026-11-17.

El JSON admite exactamente `status` y `cause` no vacío. Administración puede pasar `reported` a `validated` o `rejected`; el técnico asignado puede pasar `assigned` a `in_progress` y después a `resolved`; administración o el departamento propio pueden pasar `resolved` a `closed` o `reopened`; administración puede pasar `closed` a `reopened`. La entrada en `assigned` se hace mediante PATCH assignment, también desde `reopened`. `rejected` es terminal.

El estado y su historial se escriben atómicamente con el actor autenticado y control de concurrencia. La respuesta 200 contiene la incidencia y las fotos con URL temporales. Si falla su lectura o firma, conserva el cambio con `images: []` y registra el fallo. Errores: 400 entrada inválida; 401 identidad inválida; 403 actor sin permiso; 404 ausente; 409 transición o concurrencia incompatible; 503 persistencia.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/cambiar-estado-incidencia.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
