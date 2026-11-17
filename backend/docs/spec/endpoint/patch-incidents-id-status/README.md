# PATCH /incidents/:id/status

JWT obligatorio. JSON con status y cause no vacío, sin otros campos.
Transiciones y permisos: reported a validated/rejected por administración; assigned a in_progress y de ahí a resolved por el técnico asignado; resolved a closed/reopened por administración o departamento propio; closed a reopened por administración.
La entrada en assigned se realiza mediante PATCH assignment, también desde reopened. rejected es terminal.
El motivo describe la intervención al resolver. Escritura atómica con historial y control de concurrencia. 200 devuelve el recurso.
Errores: 400 entrada inválida, 401 identidad inválida, 403 actor sin permiso, 404 ausente, 409 transición o concurrencia incompatible, 503 persistencia.
Última revisión: 2026-11-17.
