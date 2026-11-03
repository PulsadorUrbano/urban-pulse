# 2026-10-27 - Asignar prioridad con actor autenticado

- Método y ruta: PATCH /incidents/:id/priority.
- Estado: implementado; unitarias, compilación y lint correctos.
- Acceso: Bearer y rol actual admin o administrative; ningún otro rol puede operar.

## Entrada y respuesta

id UUID. Cuerpo JSON solo priority y cause. Prioridad: Baja=low, Media=medium, Alta=high. cause obligatorio, cadena con trim y contenido. No se admite civicId, actorId, userId, esManual/is_manual o campos de servidor. Omisión, null, tipo incorrecto y desconocidos: 400; recurso ausente: 404; estado distinto de validated: 409.

Ejemplo: {"priority":"high","cause":"Riesgo en zona de paso"}.

200 con recurso completo y prioridad actualizada; conserva dueño, estado, datos de creación e historial de estado. No expone motivo ni actor/historial internos. Cada asignación aceptada, incluso del mismo valor, genera CambioPrioridad con esManual=true, motivo normalizado y actorId igual a users.id actual del operador autenticado. Prioridad e historial se publican juntos. No se deduplican reintentos.

El registro inicial sigue Baja (low) con historial vacío: no es una asignación manual ni IA. DEUDA-28-01 de identidad/permisos cerrada; persistencia en memoria pendiente.

## Identidad, errores y almacenamiento

Se ejecutan JwtAuthGuard y después la comprobación del usuario y rol actuales en PostgreSQL, antes de interceptores y pipes. Un usuario eliminado o JWT inválido/ausente devuelve 401. Rol actual insuficiente o civic sin vinculación citizens devuelve 403. Un fallo de DB es error de servidor; no se acepta identidad de respaldo del cliente. El rol firmado antiguo no conserva privilegios tras cambiar el usuario en DB.

Metadatos e historial siguen en el Map de esta instancia y se pierden al reiniciar; imágenes locales. Las imágenes de /uploads requieren ahora JWT y permiso de propietario u operador; no existe el montaje estático público. Véase [descarga protegida](../get-uploads-incidents-id-archivo/README.md). No se han ejecutado pruebas HTTP, DB o frontend.

## Referencias

- [Identidad y permisos vigentes](../../features/specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- [Plan y evidencia de cierre](../../features/plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Autorización actual](../../../../src/incidents/guards/acceso-incidencias.guard.ts).
