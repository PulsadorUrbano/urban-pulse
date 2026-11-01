# 2026-11-01 — Retirar el almacenamiento local de incidencias

Las incidencias, sus ubicaciones, imágenes e historiales se conservan en PostgreSQL. El binario de cada imagen se almacena en Cloudinary y PostgreSQL guarda su identificador y URL HTTPS.

La API deja de publicar `/uploads/` y de leer `UPLOADS_DIRECTORY`. La aplicación móvil registra y consulta incidencias exclusivamente mediante el backend. Un fallo de red produce un error visible; no se crea ni consulta una copia local. Las fotos elegidas por el usuario conservan una URI temporal hasta el envío multipart, sin persistirla en `db.json`.

El mock puede seguir usándose para categorías y autenticación mientras esas funciones mantengan su fallback propio. Las colecciones `incidents`, `images` y `locations` se retiran de `frontend-mobile/db.json`. Los registros existentes en PostgreSQL no se modifican.
