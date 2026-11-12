# GET /incidents — listar incidencias propias

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-09.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Rol: `civic` con relación `citizens` vigente en PostgreSQL.

## Contrato

No recibe cuerpo ni parámetros de consulta. En particular, `civicId` está prohibido: la identidad se obtiene del JWT, se vuelve a consultar en PostgreSQL y el listado se filtra por el ciudadano vinculado. Cualquier parámetro devuelve 400; un usuario sin token devuelve 401 y un usuario sin rol o vínculo válido, 403.

Responde 200 con un array de resúmenes ordenado por `createdAt` descendente e `id` ascendente en empates. Sin resultados devuelve `[]`.

```json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "title": "Farola apagada",
    "status": "reported",
    "createdAt": "2026-11-09T10:00:00.000Z"
  }
]
```

PostgreSQL no disponible devuelve 503. No hay paginación ni historial en esta respuesta.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación de consulta](../../../../src/incidents/listar-incidencias.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
- [Diseño integrado](../../../../../docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md)
