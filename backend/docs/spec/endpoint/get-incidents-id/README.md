# GET /incidents/:id

JWT obligatorio. Administración puede consultar cualquier incidencia; department las de su departamento; team y technician las de su equipo activo. Un usuario con perfil ciudadano puede consultar sus propias incidencias independientemente de su rol municipal.
200 devuelve el recurso, con categoría obtenida por relación y ubicación obligatoria; dirección opcional, images siempre [].
400 UUID inválido; 401 usuario/token inválido; 403 rol o perfil inválido; 404 inexistente o fuera de ámbito; 503 persistencia.
Última revisión: 2026-11-17.
