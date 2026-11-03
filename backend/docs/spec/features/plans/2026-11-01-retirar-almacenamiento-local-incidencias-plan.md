# 2026-11-03 — Plan para retirar archivos locales del backend sin cambiar frontend

1. Conservar la recepción multipart de `POST /incidents` y la subida de imágenes desde memoria a Cloudinary. Mantener las referencias y la incidencia en PostgreSQL, sin archivos de imagen nuevos en el disco del backend.
2. Devolver `url` HTTPS, `id`, `mimeType` y `createdAt` por imagen. Mantener `cloudinaryId` y credenciales fuera de la respuesta pública.
3. Devolver `frontend-mobile/` exactamente al contenido de `dev` en esta PR. Documentar el contrato para que el equipo de frontend decida su integración posterior.
4. Verificar el diff de la PR, el contrato documentado y las comprobaciones del backend.

## Progreso y comprobaciones

- [x] El backend de la rama recibe archivos en memoria, los sube a Cloudinary y no publica nuevas rutas `/uploads/`.
- [x] Se retiraron del diff de la PR los cambios propios de `frontend-mobile/`.
- [x] El índice de la rama no difiere de `dev` en `frontend-mobile/` ni `frontend-web/`; `git diff --cached --check` pasa.
- [x] `npm run build` correcto; `npm run lint` termina con cuatro avisos; `npm test`: 19 suites y 183 pruebas correctas.
- [ ] La subida real a Cloudinary y la recuperación con PostgreSQL quedan pendientes de una comprobación de integración autorizada; las unitarias usan dobles.

## Confirmación de implementación

El backend conserva los binarios fuera del disco local y expone la subida mediante `POST /incidents`. La integración del frontend no forma parte de esta PR. No se ha ejecutado una subida real a Cloudinary ni una prueba con PostgreSQL real en esta revisión.
