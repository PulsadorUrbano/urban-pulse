# GET /incidents/assignment-options

JWT obligatorio. admin y administrative consultan el catálogo global activo; department solo su departamento, sus equipos y sus técnicos. Excluye usuarios y membresías inactivos.
200 devuelve departments, teams y technicians. 401 identidad inválida; 403 rol no permitido; 503 persistencia.
Última revisión: 2026-11-17.
