# 2026-10-27 - Cambiar el estado con actor autenticado

- Método y ruta: PATCH /incidents/:id/status.
- Estado: implementado; unitarias, compilación y lint correctos.
- Acceso: Bearer y rol actual admin o administrative; ningún otro rol puede operar.

## Entrada y respuesta

id UUID. Cuerpo JSON solo con status (validated o rejected, en minúsculas) y cause (cadena obligatoria, trim y no vacía). No admite civicId, actorId, userId, fechas o identificadores de historial elegidos por el cliente. Omisión, null, tipos incorrectos o campos extra: 400. UUID válido ausente: 404. Estado distinto de reported: 409, incluida repetición.

Ejemplo: {"status":"validated","cause":"Reporte confirmado"}.

200 con recurso completo, misma estructura que el registro. Conserva dueño y datos originales, cambiando solo status; no expone auditoría. ActorId de CambioEstado es users.id actual del operador autenticado, no el dueño ni un identificador recibido en el cuerpo. Estado e historial se publican juntos con UUID/fecha de servidor y motivo normalizado.

DEUDA-47-01 de identidad/permisos cerrada; historial en memoria sin durabilidad. El actor puede ser distinto del dueño y no lo reemplaza.

## Identidad, errores y almacenamiento

Se ejecutan JwtAuthGuard y después la comprobación del usuario y rol actuales en PostgreSQL, antes de interceptores y pipes. Un usuario eliminado o JWT inválido/ausente devuelve 401. Rol actual insuficiente o civic sin vinculación citizens devuelve 403. Un fallo de DB es error de servidor; no se acepta identidad de respaldo del cliente. El rol firmado antiguo no conserva privilegios tras cambiar el usuario en DB.

Metadatos e historial siguen en el Map de esta instancia y se pierden al reiniciar; imágenes locales. Las imágenes de /uploads requieren ahora JWT y permiso de propietario u operador; no existe el montaje estático público. Véase [descarga protegida](../get-uploads-incidents-id-archivo/README.md). No se han ejecutado pruebas HTTP, DB o frontend.

## Referencias

- [Identidad y permisos vigentes](../../features/specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- [Plan y evidencia de cierre](../../features/plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Autorización actual](../../../../src/incidents/guards/acceso-incidencias.guard.ts).
