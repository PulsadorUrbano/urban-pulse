# 2026-11-01 — Plan para retirar el almacenamiento local de incidencias

1. Quitar la publicación estática de `/uploads/` en `backend/src/main.ts`, el helper `uploadsRoot` en `backend/src/incidents/upload-storage.service.ts` y la prueba e2e heredada `backend/test/incidents.e2e-spec.ts`, dependiente de archivos locales.
2. Quitar la escritura y lectura de incidencias e imágenes del mock en `frontend-mobile/src/services/incident.service.ts`; eliminar `frontend-mobile/src/services/image.service.ts`, `frontend-mobile/src/types/incident-image.ts` y las colecciones de incidencias de `frontend-mobile/db.json`.
3. Eliminar la simulación de guardado de fotos en `frontend-mobile/src/services/storage.service.ts` y su llamada en `frontend-mobile/src/hooks/use-photo-attachment.ts`. Mantener la URI temporal que necesita el envío multipart.
4. Actualizar tipos, pantallas, hooks, documentación vigente y pruebas unitarias afectadas. Verificar compilación, lint y pruebas unitarias sin servicios externos.

## Progreso y comprobaciones

- [x] Código backend y frontend modificado.
- [x] Backend: `npm run build`, `npm run lint`, `npm test` (183 pruebas pasan; cuatro avisos de lint preexistentes).
- [x] Frontend: `npm test -- --runInBand --silent` (481 pruebas en 41 suites) y `npm run lint` sin errores.
- [x] Revisión de referencias activas y `git diff --check` sin errores.
- [ ] `npm exec -- tsc --noEmit` conserva cuatro errores previos ajenos al cambio: dos de Expo Router y dos del tema visual.
