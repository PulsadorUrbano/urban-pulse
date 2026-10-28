# 2026-10-23 - Especificación: asignar prioridad manual con motivo y actor

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Rama: feature/registro-incidencia-backend.
- Última actualización: 2026-10-23.
- Estado: ejecución autorizada por el usuario; implementado con pruebas unitarias, compilación y lint correctos. Revisión final sin hallazgos pendientes.
- Plan: [Plan de implementación](../plans/2026-10-23-asignar-prioridad-manual-con-motivo-y-actor-plan.md).
- Referencias: [#28 Prioridad manual](https://github.com/PulsadorUrbano/urban-pulse/issues/28), [#49 Indicador manual](https://github.com/PulsadorUrbano/urban-pulse/issues/49), [#50 Justificación](https://github.com/PulsadorUrbano/urban-pulse/issues/50), [#51 Autor](https://github.com/PulsadorUrbano/urban-pulse/issues/51).

## Objetivo y decisiones vigentes

Permitir asignar manualmente low, medium o high a una incidencia validated y conservar cada decisión con motivo, indicador manual y actor declarado.

- Alcance confirmado: backend de las cuatro issues; historial priority_changes con is_manual, motivo y actor. Solo se permite asignar prioridad cuando status=validated.
- Decisión del usuario del 2026-10-23: conservar el historial del diagrama. Esta decisión prevalece para esta implementación sobre el comentario ADR-001 de #28, que proponía únicamente priority_source y priority_justification en incidents.
- Alternativas consideradas: campos de la última asignación en Incident, más simples pero pierden decisiones previas; historial priority_changes, elegido por el usuario para conservarlas. No mantener ambos como fuentes independientes.
- Decisión de diseño: reutilizar la identidad provisional mediante civicId y las limitaciones de memoria de #47; mantener abierta la deuda de autorización que se describe aquí y en el plan.
- Decisiones de detalle: cada petición válida es una asignación manual y crea un registro, aunque el valor coincida con la prioridad anterior. Así se puede confirmar manualmente low, que también es el valor inicial del sistema. Las asignaciones posteriores también conservan su propio motivo y actor.
- Fuera de alcance: IA, prioridad automática, reentrenamiento, autenticación o roles nuevos, frontend, nuevas dependencias, DB activa, migraciones, lectura HTTP del historial, commits y push.

## Contexto inicial verificado (antes de implementar)

- Base de trabajo: 49410b1, con la #47 ya registrada en Git; checkout limpio al iniciar esta fase.
- [Esquema Prisma](../../../../prisma/schema.prisma): IncidentPriority solo contiene low; Incident conserva priority y el historial CambioEstado. No existe modelo de cambios de prioridad.
- [Diagrama](../../../../../database/diagram.dbml): incident_priority incluye low, medium y high; priority_changes contiene id, is_manual, new_priority, cause, created_at, incident_id y user_id. Su motivo todavía admite null y su id no tiene clave primaria declarada.
- [SQL de referencia](../../../migrations/001_base_diagram.sql) reproduce esa estructura; no se ejecutará ni reescribirá una migración histórica como parte de esta fase.
- [Servicio](../../../../src/incidents/incidents.service.ts): Map privado con agregados tipados Prisma, publicación síncrona en #47 y serialización pública explícita. El registro fija low; la consulta individual lo muestra y el listado de #27 solo proyecta id, title, status y createdAt.
- NestJS 12, Prisma 7.10.1, Swagger y Vitest existentes. No activar PrismaModule ni PostgreSQL.

## Contrato HTTP

Contrato implementado. Etiquetas en español: Baja (low), Media (medium) y Alta (high). Se conservan los valores técnicos del contrato para compatibilidad; no se añade un campo público ni se modifica frontend.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| PATCH /incidents/:id/priority | id UUID; cuerpo JSON con priority, cause y civicId | 200 con Incident completo y prioridad actualizada; sin historial | Sin autenticación efectiva en el prototipo; actor declarado por civicId |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| id, ruta | UUID | Sí | Validar formato; búsqueda sin distinguir mayúsculas | 400 si es inválido |
| priority, cuerpo | Cadena | Sí | Solo low, medium o high, en minúsculas | 400 |
| cause, cuerpo | Cadena | Sí | trim; exigir contenido; sin coerción ni máximo añadido | 400 |
| civicId, cuerpo | UUID | Sí | Formato válido; normalizar a minúsculas | 400 |

- Rechazar cuerpos no objeto, arrays, tipos incorrectos y campos desconocidos. isManual, is_manual, actorId, id, status y fechas los controla el servidor y no son campos de entrada.
- 400 para entradas inválidas; 404 para UUID válido de incidencia ausente; 409 si su estado no es validated, incluido reported o rejected. Ningún error modifica prioridad ni historial.
- 200 con la estructura pública existente de Incident: id, title, description, civicId del propietario, categoryId, category, urbanAssetId, location, images, status, priority y createdAt. No cabeceras adicionales propias.
- PATCH modifica priority; conserva status=validated, propietario, fechas de creación, imágenes, ubicación y cambios de estado de #47. No expone cambiosPrioridad, isManual, motivos ni actor de auditoría en las respuestas existentes.
- POST sigue creando low sin un cambio manual ni un actor ficticio. GET individual refleja la prioridad actual; GET listado mantiene sus cuatro campos sin añadir priority ni trazabilidad. Swagger de las respuestas completas admite low, medium y high.

Ejemplo de petición:

~~~json
{
  "priority": "high",
  "cause": "Riesgo de caída en una zona de paso frecuente.",
  "civicId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
}
~~~

El recurso de respuesta conserva su estructura y refleja priority=high. Cada petición aceptada conserva su propia decisión, incluso si se repite el valor; no se promete idempotencia ni deduplicación de reintentos.

## Modelos y objetos Prisma

| Modelo | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| Incident, reutilizado | priority: IncidentPriority ampliado a low, medium, high | Mantener low por defecto; relación cambiosPrioridad CambioPrioridad[]; no duplicar origen o motivo en Incident |
| CambioPrioridad, nuevo; tabla priority_changes | id UUID; esManual Boolean @map(is_manual); nuevaPrioridad IncidentPriority @map(new_priority); motivo String @map(cause); fechaCreacion DateTime @map(created_at); incidenciaId UUID @map(incident_id); actorId UUID @map(user_id) | id clave primaria generado en servidor; campos no nulos; esManual=true; fecha de servidor Timestamptz(3); relación con Incident; actor escalar provisional sin relación de usuario inventada; índice incidenciaId |

La propiedad interna esManual representa el is_manual del diagrama y de #49. Este endpoint siempre genera true: el cliente no puede elegir IA o false. No inferir que un actor nulo significa IA; low inicial procede del sistema, no de una IA. No implementar fuentes de IA inexistentes.

Generar los tipos con Prisma instalado; StoredIncident incorpora cambiosPrioridad: CambioPrioridadModel[]. Derivar el tipo público priority de IncidentModel['priority']. Mantener CambioEstado, IncidentLocation e IncidentImage.

- Almacenamiento: agregado en el Map del proceso; imágenes locales sin modificaciones. El registro inicializa cambiosPrioridad=[] y no genera una decisión manual ficticia.
- Ciclo de vida: registros e historiales desaparecen al reiniciar y no se comparten entre procesos. La lectura interna del historial devuelve copias, incluidas fechas.
- Relaciones: comprobar existencia de la incidencia; formato del UUID del actor, sin verificar su existencia ni vinculación a users.
- Referencia DBML: formalizar id como clave primaria, cause obligatorio y el índice de incidencia en priority_changes; no alterar otras tablas ajenas. Documentar la divergencia temporal del actor frente a la FK users del diagrama.
- Sin conexión ni migraciones. La futura persistencia deberá guardar prioridad e historial en una transacción real.

## Diseño mínimo

Reutilizar IncidentsController e IncidentsService; añadir CambiarPrioridadIncidenciaPipe y CambiarPrioridadIncidenciaInput. El servicio cambiarPrioridad(idIncidencia, entrada): Incident comprueba existencia y estado validated, construye CambioPrioridad tipado, un agregado con el historial añadido y la respuesta serializada antes de una única sustitución en el Map. Sin await ni efectos externos entre comprobar y publicar.

Dos peticiones válidas en la misma instancia se aplican de forma secuencial, conservan ambos registros y dejan vigente la última prioridad. Esto difiere deliberadamente de #47: la prioridad se puede reevaluar mientras siga validated. No introducir control de versiones o un motor de reglas.

consultarCambiosPrioridad(idIncidencia): CambioPrioridadModel[] permite consultar copias para uso interno; no crear una ruta HTTP para ello. No mezclar historial de prioridad con cambios de estado.

### Deuda técnica DEUDA-28-01: identidad y permisos del actor

- Estado: abierta; continuidad del prototipo de #47.
- civicId procede del cliente. Su formato UUID no acredita identidad, existencia ni rol. Se almacena en actorId/user_id como identidad declarada.
- Riesgo: el solicitante puede suplantar un actor y cambiar la prioridad sin acreditar permisos de operador, técnico o responsable. No presentar #51 como autoría autenticada.
- Conservar civicId del propietario; no compararlo con el actor para inferir permisos. No prometer 401/403 inexistentes.
- Resolución: identidad verificada en servidor, vinculación real al usuario y autorización del rol y recurso; el cliente deja de elegir al actor registrado. Añadir unitarias de sesión ausente, rol incorrecto y suplantación al implementar esa infraestructura.
- Cierre: sin identidad y permiso válidos no se modifica prioridad ni historial; manipular civicId no permite cambiar al autor de auditoría.
- Deuda adicional de almacenamiento: historial en memoria, sin auditoría duradera. Al conectar DB, transacción de prioridad e historial. Cerrar DEUDA-47-01 no cierra automáticamente esta operación de escritura.

## Criterios de aceptación

1. Una incidencia validated admite asignar low, medium o high manualmente; reported y rejected devuelven 409 sin modificaciones.
2. Cada asignación aceptada conserva exactamente un CambioPrioridad con id y fecha de servidor, esManual=true, prioridad elegida, motivo normalizado e incidencia y actor declarados.
3. Cuerpo y UUID inválidos devuelven 400; recurso ausente, 404; errores y fallos previos a publicar no dejan modificaciones parciales.
4. Se permiten nuevas asignaciones mientras siga validated, incluso del mismo valor; dos intentos válidos conservan sus decisiones y la última prioridad vigente.
5. Se preservan propietario, estado, datos originales e historial de #47. Lectura individual muestra la prioridad actual sin auditoría; listado #27 conserva exactamente sus cuatro campos.
6. Las copias del historial no permiten modificar el almacenamiento, incluidas fechas. El registro inicial sigue low con historial vacío y sin atribución a IA.
7. Modelos y tipos Prisma, DBML, Swagger y catálogo reflejan lo implementado; deuda de identidad y memoria explícita en especificación, plan y ficha.

## Documentación de endpoints

Ficha implementada: [Asignar prioridad manual](../../endpoint/patch-incidents-id-priority/README.md). Catálogo y fichas de registro, consulta individual y cambio de estado actualizados para las tres prioridades y sus etiquetas españolas. El listado conserva su forma.

## Estrategia de verificación

Solo unitarias en backend/test/incidents/ por rol: las tres prioridades, actor distinto del propietario, motivo obligatorio, tipos y campos extra, UUID, estados no permitidos, ausencia, reevaluación y repetición, orden e integridad de dos decisiones, copias defensivas y fallo previo a publicar. Comprobar compatibilidad con #27 y #47 sin red ni disco.

Antes de modificar APIs o modelos, consultar Context7 y reglas PostgreSQL. Al implementar: Prisma generate y validate, npm test, npm run build, npm run lint y git diff --check, sin npm install ni e2e/integración. Registrar resultados y confirmación únicamente en el mismo plan.
