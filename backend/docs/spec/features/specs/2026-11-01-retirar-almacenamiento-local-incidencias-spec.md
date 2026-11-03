# 2026-11-03 — Alcance del almacenamiento de incidencias

Las incidencias, sus ubicaciones, referencias de imágenes e historiales se conservan en PostgreSQL. El backend envía los binarios de las imágenes a Cloudinary directamente desde los buffers recibidos por `POST /incidents`; no crea archivos de imagen en el disco local ni publica nuevas rutas `/uploads/`.

El cliente puede enviar hasta ocho archivos JPEG, PNG o WebP, de hasta 5 MB cada uno, en el campo multipart `images`. La respuesta 201 incluye para cada imagen un `url` HTTPS de Cloudinary. El backend mantiene `cloudinaryId` y las credenciales exclusivamente en el servidor.

La integración de la aplicación móvil corresponde al equipo de frontend. Esta rama no modifica sus pantallas, servicios, pruebas ni `db.json`. Su comportamiento actual de mock y almacenamiento local permanece hasta que ese equipo adopte el contrato del backend.
