# PATCH /incidents/:id/assignment

JWT obligatorio. Roles admin y administrative; department solo para incidencias de su departamento, sin trasladarlas a otro.
JSON con cause no vacío y al menos un campo departmentId, teamId o technicianId. Los campos omitidos se conservan; cambiar departamento limpia equipo y técnico omitidos, cambiar equipo limpia técnico omitido. El resultado exige departamento y equipo; técnico opcional y miembro activo asignable.
Solo admite validated, assigned y reopened. El resultado queda assigned; se registra también el cambio de estado cuando procede.
Actor, motivo y asignaciones anterior y nueva se guardan atómicamente en assignment_changes. No se borra ni sustituye historial.
200 devuelve el recurso. 400 entrada/catálogo inválidos, 401 identidad inválida, 403 ámbito ajeno, 404 ausente, 409 estado, jerarquía o concurrencia incompatibles, 503 fallo de persistencia.
Cambio de contrato: cause pasa a ser obligatorio y no se admite dejar una asignación sin equipo. Los clientes deben adaptarse.
Última revisión: 2026-11-17.
