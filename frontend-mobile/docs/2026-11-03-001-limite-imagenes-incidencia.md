# Sesión — 2026-11-03 · Bug issue #91 · Límite de imágenes desalineado (UI/envío/backend)

## Contexto

Se pidió revisar la rama `feat-imagenes-cloudinary` para añadir a `frontend-mobile` la subida y
visualización de fotos de incidencia. Tras investigar (solo lectura) se confirmó que ambas
funcionalidades ya existían, ya estaban testeadas y eran idénticas entre `dev` y
`feat-imagenes-cloudinary` (el árbol `frontend-mobile/` es byte-idéntico entre las dos ramas):

- Subida: `incidents/new.tsx` → `use-photo-attachment.ts`/`use-create-incident.ts` →
  `incident.service.ts::createIncident` → `POST {BACKEND_API_URL}/incidents` multipart, con
  fallback a mock.
- Visualización: `incidents/[id].tsx` ya renderiza `<IncidentPhotoViewer images={incident.images} />`.

Confirmado con la usuaria que el único trabajo pendiente real era un bug ya registrado en
`docs/spec/bugs/todo.md` (issue #91): el picker permite seleccionar hasta 8 fotos y el backend
real acepta hasta 8, pero el envío solo mandaba las 5 primeras sin avisar.

Trazabilidad completa en
`docs/spec/bugs/registro-incidencia/03-11-26-limite-imagenes-desalineado.md`.

## Alcance

- `MAX_INCIDENT_IMAGES` en `src/services/incident.service.ts` sube de 5 a 8, alineando UI
  (`MAX_SELECTED_PHOTOS = 8`), envío y backend (`FilesInterceptor('images', 8, ...)`, confirmado
  leyendo `backend/` solo en modo lectura, sin tocarlo).
- 3 tests de `src/__tests__/services/incident.service.test.ts` actualizados a 8/9 URIs en vez de
  5/6.
- Issue #91 marcado como resuelto en `docs/spec/bugs/todo.md`.

## Decisiones clave

- No se añade ningún aviso de "recorte" en la UI: al igualar los tres límites a 8, ya no hay
  recorte posible con el flujo actual del picker, así que ese aviso dejaría de tener caso de uso.
- Fuera de alcance, por decisión explícita de la usuaria: visor a pantalla completa con zoom y
  miniaturas en "Mis incidencias". No se tocó nada de `backend/` (solo lectura). No se mergeó la
  rama a `dev` ni se hizo push/PR.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/services/incident.service.ts` | `MAX_INCIDENT_IMAGES` de 5 a 8; comentario actualizado. |
| `src/__tests__/services/incident.service.test.ts` | 3 tests renombrados/ampliados a 8/9 URIs. |
| `docs/spec/bugs/todo.md` | Issue #91 tachado como resuelto, remite al bug file. |
| `docs/spec/bugs/registro-incidencia/03-11-26-limite-imagenes-desalineado.md` | Trazabilidad completa del bug (diagnóstico, corrección, verificación, confirmación). |

## Checklist de la sesión

- [x] Investigación solo lectura: confirmar que subida/visualización ya existían y eran iguales
  en `dev` y `feat-imagenes-cloudinary`.
- [x] Confirmación de alcance con la usuaria (`AskUserQuestion`): solo arreglar issue #91.
- [x] `MAX_INCIDENT_IMAGES` de 5 a 8 en `incident.service.ts`.
- [x] Tests actualizados (8/9 URIs en vez de 5/6).
- [x] Documentación: `bugs/todo.md`, bug file nuevo, esta nota de sesión.
- [x] Comprobaciones finales (`pnpm jest`, `pnpm tsc --noEmit`, `pnpm expo lint`).

## Documentos actualizados

- [x] `docs/spec/bugs/todo.md` — issue #91 tachado, remite al bug file.
- [x] `docs/spec/bugs/registro-incidencia/03-11-26-limite-imagenes-desalineado.md` — "Estado" a
  "Corregido y verificado", checklist de verificación y confirmación final rellenos.

## Estado / Verificación

Bug **corregido y verificado**.

- `pnpm jest` (suite completa) — 615/615 tests verdes, 43/43 suites, sin regresiones.
- `pnpm tsc --noEmit` — 0 errores.
- `pnpm expo lint` — 0 errores, solo los 2 warnings preexistentes y ajenos ya conocidos en
  `src/__tests__/app/login-session-restore.test.tsx`.

## Pendiente / diferido

- [ ] Confirmación end-to-end manual en dispositivo/Expo Go: crear una incidencia con 8 fotos
  reales contra el backend real con Cloudinary y comprobar que las 8 llegan y se ven en el
  detalle. No se dispuso de dispositivo/emulador en este entorno.
- Fuera de alcance (no tocado en esta sesión): visor a pantalla completa con zoom, miniaturas en
  "Mis incidencias", cualquier cambio en `backend/`, merge de `feat-imagenes-cloudinary` a `dev`.

> Detalle granular en
> `docs/spec/bugs/registro-incidencia/03-11-26-limite-imagenes-desalineado.md`.
