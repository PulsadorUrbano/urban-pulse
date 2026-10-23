# 2026-10-23 - Validar o rechazar una incidencia con motivo

- Método y ruta: PATCH /incidents/:id/status.
- Última revisión: 2026-10-23.
- Estado: implementado; verificado con unitarias, compilación y lint. Sin peticiones HTTP de integración.

## Acceso y deuda técnica

DEUDA-47-01 abierta: no hay autenticación ni autorización de operador. civicId identifica al actor declarado por el cliente y solo se valida su formato UUID. Puede suplantarse; no acredita identidad, existencia ni permisos. El actor puede ser distinto del ciudadano propietario y no lo reemplaza.

La resolución requiere sesión/token verificado en servidor, vinculación real al usuario y comprobación del rol y permisos de operador. No existen respuestas 401/403 en este prototipo.

## Entrada y validaciones

id en ruta: UUID; se compara sin distinguir mayúsculas. Cuerpo JSON obligatorio, solo con status, cause y civicId:

~~~json
{
  "status": "validated",
  "cause": "Se confirma la incidencia tras revisar el reporte.",
  "civicId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
}
~~~

- status: únicamente validated o rejected, en minúsculas.
- cause: cadena obligatoria, no vacía después de trim; sin coerción ni máximo adicional.
- civicId: UUID obligatorio del actor declarado; se normaliza a minúsculas.
- Rechaza cuerpos no objeto, arrays, campos desconocidos, valores omitidos, null y tipos incorrectos. El cliente no asigna identificador ni fecha del historial.

Solo se admite reported -> validated o reported -> rejected. Las repeticiones, incluso del mismo estado, no crean otro registro.

## Respuesta, cabeceras y errores

200 con el recurso completo y la misma estructura pública de POST/GET individual: id, title, description, civicId del propietario, categoryId, category, urbanAssetId, location, images, status, priority y createdAt ISO. status refleja la transición; el resto permanece igual. No incluye cambiosEstado, motivo ni actor de auditoría. Sin cabeceras propias adicionales.

Ejemplo parcial ilustrativo del campo modificado: status=validated. Consultar el [contrato de registro](../post-incidents/README.md) para todos los campos del recurso.

- 400: UUID o cuerpo inválido, estado no permitido, motivo vacío o campos desconocidos.
- 404: UUID válido de incidencia no almacenada en esta instancia.
- 409: incidencia cuyo estado ya no es reported, sin cambios ni nueva auditoría.

## Almacenamiento y límites

Estado e historial se publican juntos mediante una única sustitución síncrona del agregado en el Map, después de construir y serializar el resultado. Dos intentos en la misma instancia solo aceptan una transición. No constituye una transacción de base de datos ni coordinación entre procesos.

Cada cambio es un CambioEstado tipado desde Prisma y mapeado a status_changes: id y fecha de servidor, incidenciaId, actorId declarado, nuevoEstado y motivo normalizado. actorId es escalar, sin relación de usuario ficticia. El servicio permite consultar copias del historial para uso interno; no se expone ruta HTTP de historial.

Incidencias e historial se pierden al reiniciar. Las imágenes permanecen en archivos locales y no se modifican en esta operación. Sin base de datos, migraciones ni auditoría duradera; al activar persistencia será necesaria una transacción para estado e historial.

## Referencias

- [Especificación y deuda](../../features/specs/2026-10-23-validar-rechazar-incidencias-con-motivo-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-23-validar-rechazar-incidencias-con-motivo-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Validación](../../../../src/incidents/cambiar-estado-incidencia.pipe.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
- [Modelos Prisma](../../../../prisma/schema.prisma).
- [Unitarias del servicio](../../../../test/incidents/services/cambiar-estado-incidencia.service.spec.ts).
- [Unitarias del pipe](../../../../test/incidents/pipes/cambiar-estado-incidencia.pipe.spec.ts).
