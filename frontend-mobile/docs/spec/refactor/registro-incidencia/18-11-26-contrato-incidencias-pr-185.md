# 18-11-26 — Refactor: adaptar el registro de incidencias al contrato de la PR #185 (issue #191)

- Feature afectada: registro-incidencia.
- Rama: `refactor/191-adaptar-frontend-mobile-contrato-incidencias`.
- Última actualización: 2026-11-18.
- Estado: Implementado con verificación pendiente (manual en dispositivo y contra el backend real de la PR #185).

## Motivo

La issue #191 pide adaptar el móvil al contrato de incidencias de la PR #185 del backend (`fix/prisma-model-integrity`, aún abierta). Según ese contrato (`backend/docs/spec/endpoint/post-incidents/README.md` y `incidents.controller.ts` de esa rama), `POST /incidents`:

- Acepta solo `application/json`, con `Authorization: Bearer <JWT>` y rol `civic`. El ciudadano se deriva del token: rechaza `civicId`, imágenes y archivos en el cuerpo.
- Exige `title` (4-35), una categoría del **catálogo activo** (`categoryId` o el nombre exacto; ya no crea categorías de texto libre) y `latitude`/`longitude`.
- Acepta `description` opcional, pero de **al menos 10 caracteres** si se envía.
- Crea la incidencia con `images: []`. Las fotos se suben después a `POST /incidents/:id/images` (multipart, campo `images`, máx. 8, 5 MiB cada una).

El móvil enviaba un multipart con `civicId` y las fotos en la misma petición. Además permitía "Otros" (categoría libre), enviar sin categoría y enviar sin ubicación ("Enviar sin ubicación"), y solo avisaba de las descripciones cortas.

> Nota sobre el término "refactor": igual que en `refactor/independent/26-10-26-auth-real-first-fallback-mock.md`, el cambio sí altera comportamiento observable (nuevas validaciones bloqueantes, fin de "Otros" y de "Enviar sin ubicación", reintento de fotos). Se documenta como refactor porque así lo pide la issue y la rama: es una adaptación de contrato, no la corrección de un fallo.

## Decisiones confirmadas con la usuaria (2026-11-18)

1. **"Otros":** se elimina del selector junto con su modal de texto libre. Solo se eligen categorías del catálogo.
2. **Interruptor de ubicación:** se mantiene. Si está apagado no se envía y se muestra "La ubicación es obligatoria para registrar la incidencia. Actívala e inténtalo de nuevo."
3. **Descripción de 1 a 9 caracteres:** pasa a ser un error de validación que bloquea el envío. La descripción vacía sigue permitida, con su aviso "¿Enviar de todas formas?".
4. **Fallo de la subida de fotos:** la confirmación muestra "La incidencia se registró, pero no se pudieron subir las fotos." y un botón "Reintentar subida de fotos". El botón solo llama a `POST /incidents/:id/images` con las fotos pendientes, sin volver a crear la incidencia.

Decisión técnica tomada sin consultar (por defecto razonable):

- Con un **token de origen mock**, la incidencia se registra directamente en el mock (con el aviso de fallback), porque ese token nunca es un JWT válido para el backend (daría 401). Sin token, se muestra "No se pudo verificar tu sesión. Vuelve a iniciar sesión…" y no se hace ninguna petición.

## Alcance

- Alcance confirmado:
  - `createIncident` envía JSON autenticado `{ title, description?, categoryId, latitude, longitude, accuracy? }` con `Authorization: Bearer`, sin `civicId`, sin `category` y sin archivos. Un 401 muestra "Tu sesión ha caducado…".
  - Función nueva `uploadIncidentImages(id, uris, source, token)`:
    - Backend: un multipart a `/incidents/:id/images`.
    - Mock: `createImage` por foto.
    - Nunca lanza y nunca crea otra incidencia. Devuelve las fotos subidas, las pendientes y el motivo del fallo.
    - Tras una creación correcta, ningún fallo de la subida se propaga, para que la usuaria no reenvíe y duplique la incidencia.
  - `CreateIncidentResult` incorpora `pendingImageUris` e `imagesUploadErrorMessage`.
  - Real-first con fallback se conserva: sin conexión al crear, se registra en el mock con las mismas reglas (categoría del catálogo y coordenadas obligatorias). La subida de fotos de una incidencia del backend nunca cae al mock.
  - Validador: categoría obligatoria, descripción de 1-9 caracteres como error y ubicación desactivada como error. El único aviso no bloqueante que queda es la descripción vacía.
  - `useIncidentLocationSubmit`:
    - Si falta la preferencia de ubicación, los servicios del dispositivo, el permiso o las coordenadas, no envía y deja un mensaje claro. El botón queda liberado para reintentar.
    - Sin permiso, en native ofrece "Abrir Ajustes"; en web basta el mensaje.
    - Expone `imagesUploadErrorMessage`, `isRetryingImageUpload` y `retryImageUpload`, con un bloqueo síncrono contra el doble reintento.
  - `useCreateIncident(civicId, token)` expone `uploadPendingImages`.
  - `CategoryPicker` sin "Otros". `incidents/new.tsx` usa el token de la sesión, muestra los errores nuevos y el bloque de reintento de fotos.
- Fuera de alcance:
  - Envío de `address` y `urbanAssetId` (opcionales en el contrato; el móvil no los recoge).
  - `GET /incidents?civicId=` y `GET /incidents/:id` (listado y detalle) siguen igual que antes. Ese listado y el resto de los cambios de la PR #185 se tratarán en otra tarea.
  - `backend/` (solo lectura). El catálogo mock de `db.json` (ids `"1"`, `"2"`, `"3"`) no se toca.
- Comportamiento preservado:
  - Fallback al mock por timeout/red con el aviso "No se ha podido conectar al backend, realizando en el mock".
  - Un rechazo del backend (`!ok`) sigue siendo definitivo y no cae al mock.
  - Límite de 8 fotos, bloqueo síncrono contra el doble envío, aviso de descripción vacía y pantalla de confirmación.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/types/incident.ts` | `CreateIncidentInput` con categoría y coordenadas obligatorias; `BackendCreateIncidentPayload`, `IncidentAuthor`, `UploadIncidentImagesResult`; `CreateIncidentResult` con estado de fotos |
| modificar | `src/services/incident.service.ts` | POST JSON con Bearer, token mock directo al mock, `uploadIncidentImages` (backend multipart / mock), fallos de fotos aislados de la creación |
| modificar | `src/utils/incident-validator.ts` | `IncidentFormValues`; errores de descripción, categoría y ubicación; solo aviso de descripción vacía |
| modificar | `src/hooks/use-create-incident.ts` | Recibe `token`; `uploadPendingImages` para reintentar |
| modificar | `src/hooks/use-incident-location-submit.ts` | Bloqueo sin ubicación con mensajes claros y reintento; fin de "Enviar sin ubicación"; reintento de fotos |
| modificar | `src/components/category-picker.tsx` | Elimina "Otros", su modal y `MAX_CUSTOM_CATEGORY_LENGTH` |
| modificar | `src/app/incidents/new.tsx` | Token de sesión, nuevos errores de validación, bloque "Reintentar subida de fotos" |
| modificar | `src/__tests__/services/incident.service.test.ts` | Contrato JSON + Bearer, 401, token mock/null, subida separada y sus fallos, fallback mock, `uploadIncidentImages` |
| modificar | `src/__tests__/hooks/use-create-incident.test.tsx` | Autor con token y `uploadPendingImages` |
| modificar | `src/__tests__/hooks/use-incident-location-submit.test.ts` | Reescrito: escenarios sin ubicación (no envía, reintenta), categoría, reintento de fotos, web |
| modificar | `src/__tests__/utils/incident-validator.test.ts` | Categoría y ubicación obligatorias, descripción mínima |
| modificar | `src/__tests__/components/category-picker.test.tsx` | Sin "Otros" |
| modificar | `src/__tests__/app/incidents/new-incident-screen.test.tsx` | Flujo con categoría del catálogo, bloqueos de ubicación, descripción corta, reintento de fotos |
| modificar | `docs/spec/bugs/todo.md` | Marca resuelto el punto de fotos descartadas (PR #158) |

## Verificación

- [x] Comportamiento previo registrado por los tests existentes: multipart con `civicId` y fotos, "Otros", "Enviar sin ubicación".
- [x] Aplicar el refactor.
- [x] Confirmar el nuevo comportamiento con tests: no hay envío sin ubicación ni sin categoría del catálogo, la incidencia se crea con JWT y las fotos se suben después sin duplicarla.
- [x] `pnpm expo lint`: 0 errores y 0 warnings.
- [x] `pnpm tsc --noEmit`: 0 errores.
- [x] `pnpm test`: 62 suites / 764 tests en verde.
- [ ] Prueba manual en dispositivo/Expo Go contra el backend de la PR #185 (`docker compose up --build` con esa rama), cuando la usuaria lo pida.

## Confirmación

- Estado final: Implementado con verificación pendiente.
- Fecha de revisión: 2026-11-18.
- Resultado entregado:
  - El móvil crea incidencias con JSON autenticado, categoría del catálogo y ubicación obligatorias.
  - Sube las fotos por separado a `POST /incidents/:id/images` y gestiona su fallo con un reintento que no duplica la incidencia.
  - El mock conserva una simulación equivalente.
- Decisiones y desviaciones:
  - Las cuatro decisiones de UX las confirmó la usuaria.
  - El token mock va directo al mock (ver "Decisiones").
  - El aviso de descripción corta pasa a error.
  - Desaparecen `locationNotice` (ya no se registra nada sin ubicación) y los diálogos "Enviar sin ubicación". Con ellos desaparece también el riesgo de doble envío que tenían, anotado y resuelto el 17-11-26.
  - Se resuelve de paso el punto 2 de `bugs/general/17-11-26-review-pr-158-token-y-fotos.md` (fotos descartadas sin aviso con el backend real). El punto 1 (respuesta antigua tras retirar el token) sigue pendiente.
- Limitaciones y pendientes:
  - La PR #185 sigue abierta. Si cambia el contrato antes del merge, hay que revisar este refactor.
  - Si el catálogo se cargó del mock (ids no UUID) y al enviar el backend sí responde, este rechaza el `categoryId` con 400. La UI muestra el motivo, pero conviene recargar categorías en ese caso. Queda anotado como posible mejora.
  - `db.json` tiene dos registros locales del 18-11-26 sin categoría ni ubicación, creados en pruebas manuales previas y sin commitear. No los ha tocado este refactor.
