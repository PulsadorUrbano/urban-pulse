# 2026-11-03 — Consultar opciones de asignación

- Método y ruta: GET /incidents/assignment-options.
- Estado: implementado en `feature/asignaciones-backend`; requiere migración y catálogo cargado para devolver datos reales.
- Última revisión: 2026-11-03.
- Acceso: token Bearer válido y rol actual `admin` o `administrative` en PostgreSQL.

## Entrada, respuesta y errores

Sin cuerpo ni parámetros. Respuesta 200: `{ "departments": [{ "id": "UUID", "name": "texto" }], "teams": [{ "id": "UUID", "name": "texto", "departmentId": "UUID" }], "technicians": [{ "id": "UUID", "name": "texto", "teamId": "UUID" }] }`. Las listas pueden estar vacías. El nombre del técnico es `users.username`; solo se incluyen miembros con `isTechnician=true`.

Errores: 401 sin token válido o usuario vigente; 403 sin rol permitido; 503 si PostgreSQL no está disponible. No se guardan cambios.

## Almacenamiento y referencias

Lee `Department`, `Team`, `TeamMember` y `users` en PostgreSQL. Este endpoint no crea ni administra el catálogo.

- [Especificación](../../features/specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md).
- [Plan](../../features/plans/2026-11-03-asignar-departamento-equipo-y-tecnico-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
