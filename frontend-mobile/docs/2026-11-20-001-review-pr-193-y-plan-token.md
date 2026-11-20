# Sesión — 2026-11-20 · Review de la PR #193, issue #200 y plan para integrar el token de la PR #158

## Contexto

En la PR #193 (`refactor/191-adaptar-frontend-mobile-contrato-incidencias`), artina09 propuso dos formas de integrar el arreglo del token de la PR #158 y preguntó si el caso de fotos duplicadas al reintentar se corregía en la #193 o en una issue aparte. El caso lo había señalado antes CodeJose21.

## Alcance

- Revisión del código de la #193 y del backend de la PR #185 (solo lectura) para responder a la pregunta de artina09.
- Redacción de la issue #200 y revisión de la issue y del comentario publicados por la usuaria.
- Plan para la opción 2: traer a la #193 los cambios del token de la #158.
- No se ha modificado código en esta sesión.

## Hallazgos

- **Fotos duplicadas al reintentar: no cubierto.** `uploadIncidentImagesToBackend` envía todas las fotos en una petición; si hay timeout o fallo de red, todas quedan pendientes y «Reintentar» las reenvía. El backend de la #185 no tiene idempotencia, solo el límite de 8 fotos por incidencia, así que los duplicados entran hasta ese límite y, superado, el reintento devuelve un error aunque las fotos ya estén guardadas.
- **Relación con la #158.** Una comprobación previa con `GET /incidents/:id` no depende de la #158, porque el servicio de subida ya tiene el token. La recomendación de la opción 2 se debe a poder probar el flujo completo en una sola PR.
- **Qué falta de la #158 en la #193.** Solo el token en el listado y el detalle. La bandera `isActive` por ejecución ya llegó con la #184 y la subida de fotos ya está en la #193.
- **`dev` no tiene cambios en `frontend-mobile/`** que falten en la #193.

## Decisiones

Confirmadas con la usuaria:

- Las fotos duplicadas se corrigen en la issue #200 (idempotencia en el backend y adaptación del móvil) y la #193 se mergea con el fallo conocido.
- Se sigue la opción 2 de artina09: integrar solo la #193 y cerrar después la #158.
- El listado y el detalle reciben `AuthToken | null` en lugar del texto del token como en la #158, para que una sesión mock no envíe su token al backend.

## Publicado por la usuaria en GitHub

- Issue #200 «Fix: Evitar fotos duplicadas al reintentar la subida de imágenes de una incidencia», asignada a Soviji13.
- Comentario en la #193 respondiendo a artina09: opción 2 y fallo registrado en la #200.

Sugerencias de la revisión de la #200 (pendientes de aplicar por la usuaria): corregir «Backend debe generar una cabecera de idempotencia» (la clave la genera el cliente y el backend la acepta), `POST /incidents/:id/images`, añadir pasos para reproducir y criterios de aceptación, y añadir etiquetas.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `docs/spec/bugs/mis-incidencias/20-11-26-token-listado-y-detalle-en-pr-193.md` | Nuevo: plan para integrar el token de la #158 en la #193 |
| `docs/2026-11-20-001-review-pr-193-y-plan-token.md` | Nuevo: esta nota de sesión |

## Checklist de la sesión

- [x] Revisar el comentario de artina09 y comprobar el caso de fotos duplicadas.
- [x] Redactar la issue de fotos duplicadas.
- [x] Revisar la issue #200 y el comentario de la usuaria en la #193.
- [x] Redactar el plan de la opción 2.
- [x] Implementar el plan (ver `2026-11-20-002-token-listado-y-detalle.md`).
- [ ] Añadir el enlace a la #200 en la descripción de la #193.
- [x] Prueba manual del flujo completo contra el backend de la #185 (fotos sin probar por falta de S3).
- [ ] Cerrar la #158 indicando dónde quedó el arreglo, una vez mergeada la #193.

## Estado / Verificación

No se ha ejecutado lint, typecheck ni tests porque no se ha modificado código.
