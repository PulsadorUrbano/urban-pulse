# 2026-10-27 - Consultar las incidencias propias

- Método y ruta: GET /incidents.
- Estado: implementado; unitarias, compilación y lint correctos.
- Acceso: Bearer JWT, rol actual civic y registro citizens vinculado.

## Entrada y respuesta

Sin cuerpo ni parámetros. El servidor deriva el ciudadano del usuario autenticado. Cualquier parámetro, incluido civicId (aunque coincida con el usuario real), devuelve 400. Ya no existe el filtro arbitrario GET /incidents?civicId=...; los consumidores deben dejar de enviarlo.

200 con array sin envoltorio de resúmenes propios: exactamente id, title, status y createdAt ISO. Orden por createdAt descendente, id ascendente para empates. Sin coincidencias devuelve []. Sin ubicación, imágenes, causa, actor ni historial. Admin/administrative no tienen un listado global en esta ruta.

DEUDA-27-01 de identidad cerrada: creación y listado usan el ciudadano real y el GET individual comprueba propiedad. La persistencia sigue pendiente.

## Identidad, errores y almacenamiento

Se ejecutan JwtAuthGuard y después la comprobación del usuario y rol actuales en PostgreSQL, antes de interceptores y pipes. Un usuario eliminado o JWT inválido/ausente devuelve 401. Rol actual insuficiente o civic sin vinculación citizens devuelve 403. Un fallo de DB es error de servidor; no se acepta identidad de respaldo del cliente. El rol firmado antiguo no conserva privilegios tras cambiar el usuario en DB.

Metadatos e historial siguen en el Map de esta instancia y se pierden al reiniciar; imágenes locales. Las imágenes de /uploads requieren ahora JWT y permiso de propietario u operador; no existe el montaje estático público. Véase [descarga protegida](../get-uploads-incidents-id-archivo/README.md). No se han ejecutado pruebas HTTP, DB o frontend.

## Referencias

- [Identidad y permisos vigentes](../../features/specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- [Plan y evidencia de cierre](../../features/plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Autorización actual](../../../../src/incidents/guards/acceso-incidencias.guard.ts).
