# 2026-10-27 - Registrar una incidencia a nombre del ciudadano autenticado

- Método y ruta: POST /incidents.
- Estado: implementado; unitarias, compilación y lint correctos.
- Acceso: Bearer JWT y rol actual civic, con registro citizens vinculado.

## Entrada y respuesta

Multipart/form-data: title obligatorio (trim, 4-35 puntos de código). Opcionales: description, categoryId UUID, category, urbanAssetId UUID, latitude [-90,90], longitude [-180,180], accuracy >=0 e images. Coordenadas/precisión como cadenas numéricas finitas. Hasta 8 imágenes JPEG/PNG/WebP de 5 MiB cada una.

No se admite civicId, actorId ni userId en el cuerpo. El propietario se obtiene de citizens.user_id vinculado al usuario autenticado; el cliente no puede crear a nombre de otra persona. Campos desconocidos, formatos o archivos inválidos: 400. Guardas anteriores a la subida: un rechazo de acceso no almacena archivos ni incidencias.

201 con Location: /incidents/{id} y recurso público: id, title, description, civicId real del dueño, categoryId, category, urbanAssetId, location, images, status=reported, priority=low y createdAt ISO. Omitidos opcionales según contrato existente (null). No expone historial ni relaciones internas. Las referencias de categoría/activo se validan por formato; no se verifican en DB en esta fase.

## Identidad, errores y almacenamiento

Se ejecutan JwtAuthGuard y después la comprobación del usuario y rol actuales en PostgreSQL, antes de interceptores y pipes. Un usuario eliminado o JWT inválido/ausente devuelve 401. Rol actual insuficiente o civic sin vinculación citizens devuelve 403. Un fallo de DB es error de servidor; no se acepta identidad de respaldo del cliente. El rol firmado antiguo no conserva privilegios tras cambiar el usuario en DB.

Metadatos e historial siguen en el Map de esta instancia y se pierden al reiniciar; imágenes locales. Las imágenes de /uploads requieren ahora JWT y permiso de propietario u operador; no existe el montaje estático público. Véase [descarga protegida](../get-uploads-incidents-id-archivo/README.md). No se han ejecutado pruebas HTTP, DB o frontend.

## Referencias

- [Identidad y permisos vigentes](../../features/specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- [Plan y evidencia de cierre](../../features/plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Autorización actual](../../../../src/incidents/guards/acceso-incidencias.guard.ts).
