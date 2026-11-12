# PATCH /incidents/:id/priority — asignar prioridad manual

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-09.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Roles: `admin` o `administrative` vigentes en PostgreSQL.

`id` debe ser UUID. El cuerpo JSON admite exactamente `priority` (`low`, `medium` o `high`) y `cause` (texto no vacío después de trim). `civicId` y otros campos devuelven 400; el actor se deriva del usuario autenticado.

```json
{
  "priority": "high",
  "cause": "Riesgo para peatones"
}
```

Solo admite incidencias `validated`. La prioridad y `CambioPrioridad` se escriben en una misma transacción Prisma, con `esManual=true`, UUID y fecha de servidor. Responde 200 con el recurso completo; no expone historial ni actor. Errores: 400 entrada inválida; 401 JWT inválido; 403 rol no permitido; 404 incidencia ausente; 409 estado incompatible; 503 fallo de PostgreSQL.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación](../../../../src/incidents/cambiar-prioridad-incidencia.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
