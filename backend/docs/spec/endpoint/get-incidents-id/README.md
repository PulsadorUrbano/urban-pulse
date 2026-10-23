# 2026-10-23 — Consultar una incidencia

- Método y ruta: GET /incidents/:id.
- Estado: contrato comprobado por lectura del código; conectividad no probada en esta adaptación documental.
- Última revisión: 2026-10-23.

## Entrada, respuesta y errores

Sin cuerpo. id debe tener formato UUID. Ejemplo: GET /incidents/20ac442e-0f00-4fe4-bad3-61c8e8e0bff5.

Respuesta 200 con la misma estructura pública del registro: identidad del recurso, datos enviados, ubicación e imágenes, status actual (reported, validated o rejected), priority=low y fechas ISO. No se devuelven referencias mutables del almacenamiento.

Errores: 400 para UUID mal formado; 404 para un UUID válido no almacenado en esta instancia. No requiere autenticación ni comprueba propiedad del recurso.

## Almacenamiento y límites

Incidencias y metadatos en un Map local tipado por modelos Prisma; se pierden al reiniciar y no se comparten entre procesos. Las imágenes son archivos locales; su existencia no conserva el registro de la incidencia tras un reinicio. No hay base de datos activa ni garantía de persistencia duradera.

El estado actual puede ser reported, validated o rejected; no devuelve historial, motivos ni actor de auditoría. Los cambios se describen en [validar o rechazar incidencias](../patch-incidents-id-status/README.md).

## Referencias

- [Especificación vigente](../../features/specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).
- [Controlador](../../../../src/incidents/incidents.controller.ts).
- [Servicio](../../../../src/incidents/incidents.service.ts).
