# Refactor · Conexión del registro de incidencia al backend real (multipart)

> Estado: **completado** (2026-10-19). El registro de incidencia deja de enviar JSON al mock y
> pasa a conectarse **de verdad** al backend real vía `POST /incidents` en `multipart/form-data`.
> Verificado en vivo contra el backend levantado (201, con y sin imagen).

## Motivo
El contrato front↔backend ya estaba alineado (ver [`alineacion-contrato-incidencia.md`](alineacion-contrato-incidencia.md)).
Faltaba que el móvil **apuntara al backend real** en lugar del mock para el registro de incidencia.

## Cambios (front)
- `src/services/incident.service.ts`:
  - `INCIDENTS_ENDPOINT` pasa de `${API_BASE_URL}` (mock) a **`${BACKEND_API_URL}/incidents`** (backend real, puerto 4000).
  - `createIncident(input, imageUris = [])` envía **`FormData`** (sin cabecera `Content-Type`, el boundary lo pone `fetch`). Campos añadidos solo si presentes: `title` (trim), `civicId` (UUID), `description?`, `categoryId?`, `category?`, `latitude?/longitude?/accuracy?` (como string). Las **imágenes van dentro del mismo POST** (`images`, con `type`/`name` inferidos), limitado a `MAX_INCIDENT_IMAGES = 5`.
  - Devuelve `CreatedIncident` (nuevo tipo en `src/types/incident.ts`, espejo de la respuesta del backend).
- `src/hooks/use-create-incident.ts`: `submitIncident(input, imageUris?)` reenvía las URIs a `createIncident`.
- `src/app/incidents/new.tsx`: pasa `selectedPhotoUris` al POST; se **elimina** el guardado de imágenes aparte contra el mock (`createImage`) y el `photoNotice` asociado.

## Alcance
- **Solo** `POST /incidents` (único endpoint de datos que existe en el backend).
- Categorías siguen leyéndose del **mock** (el backend no expone `GET /categories`).
- `src/services/image.service.ts` queda **sin uso** (a revisar/limpiar aparte).

## Verificación
- Front: `tsc` OK · `lint` OK · `jest` 259/259.
- Backend en vivo (puerto 4000, sin DB): `POST /incidents` → **201** sin imagen y con imagen
  (imagen subida en `/uploads/incidents/.../.jpg`).

## Pendiente / fuera de alcance
- Transporte de otros endpoints (sin equivalente real en el backend) y el desajuste general multipart/JSON
  en el resto del sistema.
- `civicId` sigue temporal (UUID hardcodeado, issue #61).
