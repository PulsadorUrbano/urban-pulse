# GET /incidents/:id/assignments

JWT obligatorio; admin, administrative, department, team y technician. Se comprueba el mismo ámbito que el detalle: departamento propio, equipo propio o propiedad ciudadana; administración tiene acceso global.
200 devuelve un array cronológico de assignment_changes con actorId, motivo (comentarios adicionales o null), fechaCreacion y los UUID anteriores y nuevos de departamento, equipo y técnico. No modifica datos. Las asignaciones anteriores a la migración no tienen historial retrospectivo.
Errores: 400 UUID inválido, 401 identidad inválida, 403 rol no permitido, 404 incidencia ausente o fuera de ámbito, 503 fallo de persistencia.
Última revisión: 2026-11-17.
