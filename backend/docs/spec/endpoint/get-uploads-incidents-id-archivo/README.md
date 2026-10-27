# 2026-10-27 - Descargar una imagen de incidencia con autorización

- Ruta: GET /uploads/incidents/:id/:archivo.
- Estado: implementado y verificado con unitarias, compilación y lint; sin HTTP/DB real.
- Acceso: Authorization: Bearer <JWT>. Civic vinculado propietario de la incidencia o admin/administrative actuales en DB.

## Entrada y respuesta

id es UUID. archivo debe coincidir exactamente con el UUID y extensión de una imagen registrada en la incidencia, según su MIME: jpg, png o webp. No se utiliza una ruta del cliente ni el campo url para leer disco. Sin cuerpo ni token en consulta. Las URLs generadas no cambian, pero un enlace anónimo ya no entrega la imagen.

200 con bytes del archivo y su Content-Type registrado, Content-Disposition inline con nombre del servidor, Cache-Control: private, no-store y X-Content-Type-Options: nosniff. No se añade Range, caché compartida, redirect público o URL firmada. HEAD pasa por las mismas guardas que GET.

## Errores

- 400: UUID de incidencia inválido, tras autorización.
- 401: JWT ausente/inválido/expirado o usuario eliminado.
- 403: rol actual no permitido o ciudadano sin vinculación.
- 404: incidencia ajena/ausente, imagen no registrada, extensión/nombre manipulados, archivo perdido/no regular o escape fuera de raíz.
- 500: error inesperado de almacenamiento, con mensaje genérico y sin ruta del sistema.

Se autoriza la incidencia y su asociación con la imagen antes de leer archivos. No existe montaje estático alternativo de /uploads en el arranque productivo. Los nombres con traversal/separadores/NUL/porcentajes o extensiones dobles no coinciden con metadatos de servidor.

## Almacenamiento y límites

Metadatos en Map; imágenes locales con límite de subida de 5 MiB. Leer imagen registrada mediante Buffer tras realpath y comprobación de archivo regular. Sin registro en memoria, el archivo no se entrega aunque exista: reiniciar no reconstruye permisos desde disco. No se limpian ni migran archivos.

Consumidores deben descargar con Authorization; no se modifica frontend en esta entrega. No pueden revocarse copias ya descargadas o cachés anteriores. No se promete aislamiento frente a un atacante local que pueda modificar concurrentemente el almacenamiento.

## Referencias

- [Especificación](../../features/specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-plan.md).
- [Controlador](../../../../src/incidents/controllers/uploads.controller.ts).
- [Autorización de incidencia](../../../../src/incidents/incidents.service.ts).
- [Almacenamiento](../../../../src/incidents/upload-storage.service.ts).
- [Unitarias de descarga](../../../../test/incidents/controllers/uploads.controller.spec.ts).
- [Unitarias de lectura](../../../../test/incidents/services/leer-imagen.service.spec.ts).
