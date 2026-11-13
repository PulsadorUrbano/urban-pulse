# PATCH /incidents/:id/assignment — asignar departamento, equipo y técnico

- Método y ruta: PATCH /incidents/:id/assignment.
- Estado: restaurado y cubierto por pruebas unitarias; requiere la migración de asignaciones y un catálogo cargado para operar con datos reales.
- Última revisión: 2026-11-13.
- Acceso: token Bearer válido y rol actual `admin` o `administrative` en PostgreSQL.

## Entrada, respuesta y errores

`:id` es UUID. Cuerpo JSON no vacío con uno o varios campos `departmentId`, `teamId` y `technicianId`, cada uno UUID o null. No se admiten otros campos. La omisión conserva el valor actual, salvo que cambiar el departamento limpia equipo y técnico, o cambiar el equipo limpia técnico. Un valor null desasigna el nivel correspondiente y sus descendientes. Se permite solo departamento o solo técnico cuando ya existe la cadena superior.

Respuesta 200: incidencia completa, con los tres IDs siempre presentes y anulables. El estado, prioridad, imágenes e historiales se conservan. Los cambios se guardan en una transacción PostgreSQL.

Errores: 400 por cuerpo o UUID inválido o ID de catálogo ausente; 401 sin identidad vigente; 403 por rol insuficiente; 404 por incidencia ausente; 409 por estado distinto de `validated` o `assigned`, jerarquía incompatible o cambio concurrente; 503 si PostgreSQL falla. Los rechazos no guardan una asignación parcial.

## Almacenamiento y referencias

`Incident` conserva las tres claves foráneas. El equipo debe pertenecer al departamento y el técnico debe ser miembro asignable del equipo. El endpoint no cambia el estado ni proporciona CRUD del catálogo.

- [Especificación](../../features/specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md).
- [Plan](../../features/plans/2026-11-03-asignar-departamento-equipo-y-tecnico-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Validación](../../../../src/incidents/asignar-incidencia.pipe.ts).
