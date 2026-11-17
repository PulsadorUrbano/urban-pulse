# PATCH /incidents/:id/assignment

- Estado: implementado; JWT obligatorio.
- Última revisión: 2026-11-17.
- Roles: admin, administrative o department dentro de su departamento, sin traslado a otro.

## Entrada y respuesta

`:id` es UUID. El JSON exige `cause` no vacío y al menos uno de `departmentId`, `teamId` o `technicianId`. Los campos omitidos se conservan, salvo que cambiar departamento limpia equipo y técnico omitidos, o cambiar equipo limpia técnico omitido. El resultado exige departamento y equipo; el técnico es opcional y debe ser miembro activo asignable.

Solo admite incidencias `validated`, `assigned` o `reopened`. El resultado queda `assigned`; se registra también el cambio de estado cuando procede. Actor, motivo y destinos anteriores y nuevos se guardan atómicamente en `assignment_changes`. El historial no se borra ni sustituye.

La respuesta 200 contiene la incidencia y las fotos con URL de lectura temporales. La asignación se confirma antes de consultar las fotos; si falla su lectura o firma, responde con `images: []` y registra el fallo. Errores: 400 entrada o catálogo inválido; 401 identidad inválida; 403 ámbito ajeno; 404 ausente; 409 estado, jerarquía o concurrencia incompatible; 503 persistencia.

Cambio de contrato: `cause` es obligatorio y no se admite una asignación resultante sin equipo. Los clientes deben adaptarse.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Validación](../../../../src/incidents/asignar-incidencia.pipe.ts).
