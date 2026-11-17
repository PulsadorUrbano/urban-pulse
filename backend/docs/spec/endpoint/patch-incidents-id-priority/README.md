# PATCH /incidents/:id/priority — asignar prioridad manual

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-17.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Roles: `admin` o `administrative` vigentes en PostgreSQL.

`id` debe ser UUID. El cuerpo JSON admite exactamente `priority` (`low`, `medium` o `high`) y `cause` (texto no vacío después de trim). `civicId` y otros campos devuelven 400; el actor se deriva del usuario autenticado.

```json
{
  "priority": "high",
  "cause": "Riesgo para peatones"
}
```

Solo admite incidencias `validated`. La prioridad y `CambioPrioridad` se escriben en una misma transacción Prisma, con `esManual=true`, el usuario autenticado, UUID y fecha de servidor. El servicio dispone además de una operación interna para cambios automáticos con `esManual=false` y sin usuario; no tiene ruta HTTP pública. Responde 200 con el recurso completo y fotos con URL temporales; no expone historial ni actor. Si falla la lectura o firma de fotos, conserva el cambio con `images: []` y registra el fallo. Errores: 400 entrada inválida; 401 JWT inválido; 403 rol no permitido; 404 incidencia ausente; 409 estado incompatible; 503 fallo de PostgreSQL.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación](../../../../src/incidents/cambiar-prioridad-incidencia.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
