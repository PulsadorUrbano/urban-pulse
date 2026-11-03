# 2026-10-27 - Consultar una incidencia con permiso

- Método y ruta: GET /incidents/:id.
- Estado: implementado; unitarias, compilación y lint correctos.
- Acceso: Bearer y usuario actual. Civic vinculado solo consulta la propia; admin/administrative pueden consultar cualquier detalle. Los demás roles reciben 403.

## Entrada y respuesta

id UUID en ruta; comparación sin distinguir mayúsculas. Sin cuerpo. UUID inválido: 400. Recurso ausente o perteneciente a otro ciudadano: 404, sin revelar su existencia. No hay parámetros para elegir otra identidad.

200 con el mismo recurso público del registro, incluidos civicId del dueño, estado y prioridad vigentes, ubicación, imágenes y fechas ISO. No se devuelven referencias mutables, actores, motivos ni historiales. Las prioridades se etiquetan Baja (low), Media (medium) y Alta (high).

## Identidad, errores y almacenamiento

Se ejecutan JwtAuthGuard y después la comprobación del usuario y rol actuales en PostgreSQL, antes de interceptores y pipes. Un usuario eliminado o JWT inválido/ausente devuelve 401. Rol actual insuficiente o civic sin vinculación citizens devuelve 403. Un fallo de DB es error de servidor; no se acepta identidad de respaldo del cliente. El rol firmado antiguo no conserva privilegios tras cambiar el usuario en DB.

Metadatos e historial siguen en el Map de esta instancia y se pierden al reiniciar; imágenes locales. Las imágenes de /uploads requieren ahora JWT y permiso de propietario u operador; no existe el montaje estático público. Véase [descarga protegida](../get-uploads-incidents-id-archivo/README.md). No se han ejecutado pruebas HTTP, DB o frontend.

## Referencias

- [Identidad y permisos vigentes](../../features/specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- [Plan y evidencia de cierre](../../features/plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Autorización actual](../../../../src/incidents/guards/acceso-incidencias.guard.ts).
