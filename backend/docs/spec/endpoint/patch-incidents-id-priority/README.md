# 2026-10-23 - Asignar prioridad manual con motivo y actor

- Método y ruta: PATCH /incidents/:id/priority.
- Estado: implementado; verificado con pruebas unitarias, compilación y lint. Sin peticiones HTTP de integración.
- Última revisión: 2026-10-23.

## Acceso y deuda técnica

DEUDA-28-01 abierta: sin autenticación ni autorización efectiva. civicId es el actor declarado por el cliente; formato UUID no acredita identidad, existencia ni permisos. No es una autoría verificada y puede suplantarse. No cambia al ciudadano propietario.

Resolución pendiente: identidad verificada en servidor, usuario real y comprobación de rol y permisos; el cliente deja de elegir al actor. No existen respuestas 401/403 en este prototipo.

## Entrada y validación

id UUID en ruta, sin distinguir mayúsculas para localizar el recurso. Cuerpo JSON obligatorio con solo priority, cause y civicId:

~~~json
{
  "priority": "high",
  "cause": "Riesgo de caída en zona de paso.",
  "civicId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
}
~~~

| Etiqueta española | Valor de priority |
| --- | --- |
| Baja | low |
| Media | medium |
| Alta | high |

El contrato mantiene los valores técnicos; las etiquetas y descripciones de Swagger están en español. No admite Alta/Baja/Media como valores JSON alternativos.

cause debe ser cadena no vacía después de trim, sin máximo añadido. civicId UUID obligatorio se normaliza a minúsculas. No se admiten null, omisión de campos obligatorios, arrays, tipos incorrectos ni campos desconocidos. is_manual/esManual, UUID de auditoría y fecha los asigna el servidor.

Solo admite incidencias validated. Cada asignación aceptada crea una decisión manual, incluso con el mismo valor de prioridad; no se deduplican reintentos. No modifica el estado de la incidencia.

## Respuesta, cabeceras y errores

200 con Incident completo y priority actualizado; mismo contrato público de [registro](../post-incidents/README.md), sin cabeceras propias nuevas. Conserva todos los campos salvo priority: id, title, description, civicId del propietario, categoryId, category, urbanAssetId, location, images, status y createdAt. No incluye historial, motivo ni actor interno. GET individual refleja priority; listado #27 sigue limitado a id/title/status/createdAt.

- 400: UUID o cuerpo inválido, prioridad no admitida, motivo vacío o campos desconocidos.
- 404: UUID válido de incidencia ausente en esta instancia.
- 409: estado distinto de validated, incluidos reported y rejected.

## Almacenamiento y límites

CambioPrioridad es un objeto tipado desde Prisma y mapeado a priority_changes: id, esManual=true (is_manual), nuevaPrioridad, motivo normalizado, fechaCreacion de servidor, incidenciaId y actorId declarado. Actor escalar temporal sin relación de usuario inventada.

Prioridad e historial se publican juntos mediante una única sustitución síncrona, tras construir el agregado y la respuesta. Fallos previos no dejan cambios parciales. Dos peticiones en la misma instancia conservan las dos decisiones y dejan vigente la última prioridad.

Historial solo consultable por método interno del servicio, mediante copias defensivas, sin endpoint HTTP. Incidencias e historial están en memoria y se pierden al reiniciar; imágenes locales sin cambios. No hay DB activa ni auditoría duradera. La futura persistencia requiere una transacción.

POST sigue creando Baja (low) con historial vacío: es el valor del sistema, no una asignación manual ni de IA.

## Referencias

- [Especificación](../../features/specs/2026-10-23-asignar-prioridad-manual-con-motivo-y-actor-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-23-asignar-prioridad-manual-con-motivo-y-actor-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/cambiar-prioridad-incidencia.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Esquema Prisma](../../../../prisma/schema.prisma).
- [Unitarias del servicio](../../../../test/incidents/services/cambiar-prioridad-incidencia.service.spec.ts).
- [Unitarias del pipe](../../../../test/incidents/pipes/cambiar-prioridad-incidencia.pipe.spec.ts).
