# 03-11-26 — Bug: límite de imágenes desalineado entre UI, envío y backend (issue #91)

- Feature afectada: registro-incidencia.
- Rama: feat-imagenes-cloudinary.
- Última actualización: 2026-11-03.
- Estado: Corregido y verificado.
- Origen: entrada de `bugs/todo.md` (issue #91, migrada originalmente desde
  `docs/old/spec/features/001-registro-incidencia/plan.md`).

## Síntoma observado

Al crear una incidencia desde `src/app/incidents/new.tsx` adjuntando más de 5 fotos (el picker
permite seleccionar hasta 8), solo las 5 primeras llegaban al backend (o al mock, en el camino de
fallback): el resto se descartaba en silencio, sin ningún aviso en la UI ni en el objeto
`CreateIncidentResult` devuelto.

## Diagnóstico

- Archivo y línea donde estaba la causa real: `src/services/incident.service.ts:30`,
  `export const MAX_INCIDENT_IMAGES = 5;`, usada para recortar el array de URIs tanto en el
  camino real (`imageUris.slice(0, MAX_INCIDENT_IMAGES)`, antes línea 252) como en el camino mock
  (antes línea 174).
- Causa: la constante quedó desactualizada. El backend real, en esta rama
  (`backend/src/incidents/incidents.controller.ts`, `FilesInterceptor('images', 8, { limits: {
  fileSize: 5*1024*1024, files: 8 } })`), acepta hasta 8 ficheros por incidencia desde que se
  implementó la persistencia con Cloudinary — límite leído en `backend/` solo para confirmar el
  contrato, sin modificar nada ahí (política del repo). El picker (`MAX_SELECTED_PHOTOS = 8` en
  `src/hooks/use-photo-attachment.ts:7`) ya estaba alineado con ese límite de 8, pero
  `incident.service.ts` seguía con el valor antiguo de 5, nunca actualizado en el mismo cambio.
- Alcance del fallo: aislado al recorte de imágenes en `createIncident` (camino real y camino
  mock). No afecta a la subida en sí (multipart/`File` de `expo-file-system`) ni a la
  visualización (`IncidentPhotoViewer`), que ya muestra correctamente cualquier número de
  imágenes que reciba.
- No es un fallo de backend: el backend ya aceptaba 8 ficheros; el recorte ocurría enteramente en
  el cliente antes de construir la petición.

## Corrección aplicada

Subir `MAX_INCIDENT_IMAGES` de 5 a 8 en `src/services/incident.service.ts`, alineando las tres
capas (UI, envío, backend) en 8. No se cambia ninguna lógica de recorte ni se añade aviso de
truncado en la UI, porque al igualar los tres límites deja de producirse ningún recorte real con
el flujo actual del picker.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `MAX_INCIDENT_IMAGES` pasa de 5 a 8; comentario actualizado |
| modificar | `src/__tests__/services/incident.service.test.ts` | 3 tests actualizados: `'con 9 URIs envía solo las 8 primeras como partes images'`, `'con 8 URIs exactas envía las 8 sin recortar'` (camino backend) y `'recorta a las 8 primeras imágenes: con 9 uris solo llama a createImage 8 veces'` (camino mock) |
| modificar | `docs/spec/bugs/todo.md` | issue #91 marcado como resuelto, remite a este archivo |

## Verificación

- [x] Reproducir el fallo antes del cambio: con `MAX_INCIDENT_IMAGES = 5`, los tests
  `'con 6 URIs envía solo las 5 primeras como partes images'` y `'recorta a las 5 primeras
  imágenes: con 6 uris solo llama a createImage 5 veces'` confirmaban el recorte a 5 incluso con
  6 URIs seleccionadas (por debajo del tope real de 8 del picker/backend).
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: con 9 URIs, se envían/crean exactamente 8 (los tests
  renombrados lo verifican); con 8 URIs exactas no se recorta nada.
- [x] `pnpm expo lint` sin errores nuevos (solo los 2 warnings preexistentes y ajenos de
  `src/__tests__/app/login-session-restore.test.tsx`).
- [x] `pnpm tsc --noEmit` sin errores.
- [x] Tests en `src/__tests__/services/incident.service.test.ts` actualizados (110/110 verdes en
  ese archivo).

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-11-03.
- Evidencia de que no reaparece: `pnpm jest` (suite completa) → 615/615 tests verdes, 43/43
  suites, sin regresiones; `pnpm tsc --noEmit` → 0 errores; `pnpm expo lint` → 0 errores.
- Limitaciones y pendientes: no se ha probado manualmente en dispositivo/Expo Go subiendo 8 fotos
  reales contra el backend real con Cloudinary (no se dispuso de dispositivo/emulador en este
  entorno); queda como confirmación end-to-end pendiente, no como bug abierto, porque el
  comportamiento está cubierto y verificado por tests unitarios.
