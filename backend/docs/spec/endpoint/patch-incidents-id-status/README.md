# PATCH /incidents/:id/status — validar o rechazar

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-09.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Roles: `admin` o `administrative` vigentes en PostgreSQL.

`id` debe ser UUID. El cuerpo JSON admite exactamente `status` (`validated` o `rejected`) y `cause` (texto no vacío después de trim). `civicId` y otros campos devuelven 400; el actor se deriva del usuario autenticado.

```json
{
  "status": "validated",
  "cause": "Reporte comprobado"
}
```

Solo permite la transición desde `reported`. El estado y `CambioEstado` se escriben en una misma transacción Prisma, con UUID y fecha de servidor. Responde 200 con el recurso completo; no expone historial ni actor. Errores: 400 entrada inválida; 401 JWT inválido; 403 rol no permitido; 404 incidencia ausente; 409 estado concurrente o incompatible; 503 fallo de PostgreSQL.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación](../../../../src/incidents/cambiar-estado-incidencia.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
