# 23-10-26 — Bug: subida de imágenes al backend cae al mock (`Unsupported FormDataPart implementation`)

- Feature afectada: registro-incidencia.
- Rama: feature/registro-incidencia.
- Última actualización: 2026-10-23.
- Estado: Corregido y verificado.
- Origen: reporte del usuario, probando desde Expo Go en un dispositivo físico.

## Síntoma observado

Al registrar una incidencia desde `src/app/incidents/new.tsx` adjuntando al menos una foto, el registro no llegaba al backend real: la app caía al mock y mostraba el aviso "No se ha podido conectar al backend, realizando en el mock", aun con el backend accesible y respondiendo `{"status":"ok"}` en `GET /health` desde el propio móvil. El mismo registro **sin** fotos sí llegaba al backend real.

## Diagnóstico

- Archivo y línea donde estaba la causa real: `src/services/incident.service.ts`, función `buildImagePart` (antes de la corrección, construía `{ uri, name, type }` y lo forzaba a `Blob` con un cast).
- Causa: Expo SDK 58 (`package.json`: `"expo": "^58.0.17"`) sustituye el `fetch` de React Native por un runtime propio ("winter fetch"). Su conversor de `FormData` a multipart (`node_modules/expo/src/winter/fetch/convertFormData.ts`) solo admite partes que sean instancias de `Blob` o que implementen `.bytes()`; ya no admite el objeto propio de React Native `{ uri, name, type }`. Al añadir una imagen al `FormData`, la conversión lanzaba `Error: Unsupported FormDataPart implementation`. Ese error se capturaba en el `catch` genérico de conexión de `createIncident` y se trataba como "sin conexión con el backend", cayendo al mock sin mostrar el motivo real.
- Confirmado añadiendo un `console.warn` de depuración (condicionado a `__DEV__`) en ese `catch`, que expuso el error exacto en la terminal de Metro — no fue una suposición.
- Alcance del fallo: aislado al envío de imágenes al backend real desde `createIncident`. El registro sin fotos, el camino de fallback al mock y el resto de peticiones (`category.service.ts`, `auth.service.ts`, `token.service.ts`, `image.service.ts`) no se veían afectados porque ninguno envía ficheros en un `FormData`.
- No es un fallo de backend: el error ocurría enteramente en el cliente, durante la serialización del `FormData`, antes de que la petición llegara a la red.

## Corrección aplicada

Sustituir el objeto `{ uri, name, type }` por una instancia real de `File` de `expo-file-system` (implementa `.bytes()`, por lo que el nuevo conversor de `FormData` sí la admite). `expo-file-system` se añadió como dependencia explícita del proyecto con `npx expo install expo-file-system` (antes solo estaba disponible de forma transitiva).

De forma colateral, al investigar este bug se detectó que los errores de conexión y de rechazo del backend se descartaban sin dejar rastro visible; se añadieron logs de depuración (`__DEV__`) y, cuando el backend rechaza la incidencia (`!response.ok`), el mensaje mostrado en la UI ahora incluye el motivo real que da el backend en vez de un texto genérico pelado.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `buildImagePart` construye `new File(uri)` en vez de `{ uri, name, type }`; logs de depuración (`__DEV__`) en el fallo de conexión y en el rechazo del backend; `buildBackendRejectionMessage`/`extractBackendErrorMessage` incluyen el `message` real del backend en el error mostrado en la UI |
| modificar | `package.json` / `package-lock.json` | añaden `expo-file-system` (`~58.0.10`) como dependencia explícita |
| modificar | `src/__tests__/services/incident.service.test.ts` | actualiza los tests de "camino backend: imágenes" al nuevo formato (`File` en vez de `{ uri, name, type }` con nombre/mimetype inferidos a mano); añade test que verifica que el mensaje de error incluye el motivo real del backend |

## Verificación

- [x] Reproducir el fallo antes del cambio: registrar incidencia con foto desde Expo Go en dispositivo físico → caía al mock con el aviso de fallback; el log de depuración mostró `Error: Unsupported FormDataPart implementation`.
- [x] Aplicar la corrección.
- [x] Confirmar que el síntoma ya no ocurre: mismo registro con foto desde Expo Go → se registra contra el backend real sin caer al mock (confirmado por la usuaria: "ahora va todo, tanto registrar con foto como sin foto").
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores.
- [x] Tests en `src/__tests__/services/incident.service.test.ts` actualizados y ampliados.

## Confirmación

- Estado final: Corregido y verificado.
- Fecha de revisión: 2026-10-23.
- Evidencia de que no reaparece: prueba manual de la usuaria desde Expo Go (con foto y sin foto); `npx jest` → 292/292 tests, 20/20 suites; `npx tsc --noEmit` y `npx expo lint` sin errores.
- Limitaciones y pendientes: durante la misma sesión se observó, tras un merge que trajo cambios de validación del backend, que el registro **sin** foto empezó a fallar también con un rechazo genérico. Se añadió el log de depuración para capturar la causa real, pero el fallo se dejó de reproducir antes de poder registrar ese log — no se confirmó su causa exacta. Queda como limitación conocida, no como bug abierto, ya que no se ha vuelto a reproducir.
