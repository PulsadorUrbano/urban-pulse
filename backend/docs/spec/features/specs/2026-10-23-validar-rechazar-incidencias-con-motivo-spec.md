# 2026-10-23 — Especificación: validar o rechazar incidencias con motivo

## Actualización de identidad y permisos — 2026-10-27

**DEUDA-47-01 cerrada en la implementación de identidad/permisos.** Solo admin/administrative actuales cambian estado; auditoría registra al operador del servidor. El cliente deja de elegir civicId. Véanse [contrato vigente](../specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md) y [plan con evidencia](../plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).

Los apartados posteriores conservan el registro histórico del prototipo. Sus referencias a identidad declarada, ausencia de autenticación y civicId como entrada quedan sustituidas por el contrato vigente. La persistencia permanece pendiente; el acceso de imágenes se ha protegido posteriormente según la [especificación de uploads](../specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md). Evidencia unitaria: guard de roles actuales, controlador con identidad servidor, rechazo de identidad externa y regresiones de servicios.

## Registro histórico de la funcionalidad


- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Rama: feature/registro-incidencia-backend.
- Última actualización: 2026-10-23.
- Estado: contrato aprobado mediante la petición de ejecución; implementado y verificado con unitarias, compilación y lint. DEUDA-47-01 abierta.
- Plan: [Implementación, deuda y confirmación](../plans/2026-10-23-validar-rechazar-incidencias-con-motivo-plan.md).
- Referencias: [Issue #47 — Validar o rechazar incidencia con motivo](https://github.com/PulsadorUrbano/urban-pulse/issues/47), [modelos actuales](../../../../prisma/schema.prisma) y [diagrama del dominio](../../../../../database/diagram.dbml).

## Objetivo y decisiones vigentes

Permitir que una incidencia reported transicione una única vez a validated o rejected, obligando a registrar el motivo y la identidad declarada de quien realiza la acción en un objeto de historial equivalente a status_changes.

- Alcance confirmado: backend de #47 sobre la #27 publicada en d14df19. Mantener incidencias y metadatos en memoria e imágenes locales, sin activar base de datos.
- Decisión del usuario: identificar provisionalmente al actor mediante civicId y documentar la deuda de autenticación y autorización.
- Alternativas consideradas: identidad de sesión verificada, aplazada porque no existe infraestructura de autenticación; o civicId explícito, elegido por el usuario para continuar el prototipo.
- Contrato aprobado: PATCH /incidents/:id/status con status, cause y civicId; respuesta 200 con el recurso actualizado.
- Fuera de alcance: frontend, autenticación, verificación de roles, identidad real, persistencia duradera, nuevas transiciones, lectura HTTP del historial, notificaciones, nuevas dependencias, e2e/integración, commits y push.

### Deuda técnica DEUDA-47-01: actor y rol sin verificar

- Estado: aceptada temporalmente por el usuario el 2026-10-23; no resuelta.
- Causa: el civicId de la acción llega desde el cliente. Validar su formato UUID no verifica quién realiza la petición ni si tiene permisos de operador.
- Riesgo: un solicitante puede declarar el civicId de otra persona y validar o rechazar una incidencia sin acreditar el rol de operador. El actor registrado es una identidad declarada, no una autoría autenticada.
- Distinción obligatoria: el civicId del cuerpo identifica al actor de esta acción. No sustituye ni modifica el civicId de la incidencia, que sigue identificando al ciudadano que la registró. No se exige igualdad entre ambos ni se deduce un rol por coincidir.
- Representación temporal: registrar el UUID declarado como actorId del objeto CambioEstado, mapeado a user_id de status_changes. Esto no demuestra que el ciudadano exista en users ni habilita una relación de usuario todavía no implementada.
- Resolución pendiente: obtener al actor desde una sesión/token verificado por el servidor, comprobar el rol y permiso de operador y registrar el identificador de usuario correspondiente. No permitir al cliente elegir el actor de auditoría ni inferir user_id directamente de civicId sin una vinculación real.
- Criterio de cierre: una petición sin identidad válida o sin permiso no cambia estado ni crea historial; manipular civicId no permite suplantar al actor. Añadir unitarias de acceso cruzado, ausencia de credenciales y rol no autorizado al implementar esa infraestructura.
- Relación con DEUDA-27-01: ambas dependen de identidad confiable, pero aquí existe además una operación de escritura privilegiada y atribución de auditoría. Cerrar la deuda de consulta no acredita que esta esté resuelta.

## Contexto inicial verificado (antes de implementar)

- [IncidentsService](../../../../src/incidents/incidents.service.ts) conserva StoredIncident en un Map privado; crear fija status=reported. No existe operación de cambio de estado ni historial de estado.
- [Tipos actuales](../../../../src/incidents/incident.ts) y el enum Prisma solo contemplan reported. GET /incidents ofrece una proyección sin trazabilidad; debe seguir sin exponer historial.
- El DBML contempla status_changes con id, incident_id, user_id, new_status, cause y created_at. La issue exige motivo obligatorio aunque el diagrama de referencia todavía lo permita nulo.
- NestJS 12, Prisma 7.10.1, Swagger y Vitest ya están instalados. Prisma aporta tipos; AppModule no activa PrismaModule ni una conexión a base de datos.
- Esta tarea no modifica la identidad del ciudadano que creó la incidencia ni vuelve a implementar #27.

## Contrato HTTP

Contrato implementado en la rama indicada.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| PATCH /incidents/:id/status | id UUID y cuerpo JSON con status, cause y civicId | 200 con el recurso actualizado, sin historial | Sin autenticación; actor declarado por civicId, con DEUDA-47-01 abierta |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| id en ruta | UUID | Sí | Validar formato y comparar el identificador sin distinguir mayúsculas | Ruta inválida: 400 |
| status en cuerpo | Cadena | Sí | Solo validated o rejected, respetando minúsculas | Ausente, null o cualquier otro estado: 400 |
| cause en cuerpo | Cadena | Sí | Aplicar trim y exigir al menos un carácter; sin coerción | Ausente, null o solo espacios: 400 |
| civicId en cuerpo | Cadena UUID | Sí | Validar formato y normalizar mayúsculas para la identidad declarada del actor | Ausente, null, array u objeto: 400 |

- Rechazar cuerpos no objeto, arrays, tipos incorrectos y campos desconocidos. El cliente no asigna ID de historial, fecha, estado anterior ni identificador interno del actor.
- 400: entrada inválida. 404: UUID válido de incidencia inexistente. 409: incidencia existente cuyo estado ya no sea reported, incluida la repetición de la misma transición.
- Recurso de respuesta: contrato público de Incident ya existente, con status actualizado y el resto de datos sin modificar. No exponer cambiosEstado ni otros objetos internos del historial.
- Identidad y permisos: sin verificación efectiva en este prototipo; no prometer validación de rol ni respuestas 401/403 todavía inexistentes.
- Compatibilidad: registro sigue creando reported. Consulta individual y listado #27 reflejan el estado actual; sus tipos y Swagger deben admitir reported, validated y rejected sin añadir trazabilidad.

Ejemplo ilustrativo:

~~~json
{
  "status": "validated",
  "cause": "Se confirma la incidencia tras revisar el reporte.",
  "civicId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
}
~~~

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| Incident, reutilizado | Enum IncidentStatus: reported, validated y rejected | Mantener reported por defecto; relación de cambios de estado sin modificar propietario ni datos de creación |
| CambioEstado, nuevo y mapeado a status_changes | id UUID, incidenciaId UUID, actorId UUID, nuevoEstado IncidentStatus, motivo String, fechaCreacion DateTime | Relación con Incident; campos no nulos; UUID y fecha generados por servidor. Mapear a incident_id, user_id, new_status, cause y created_at |

Generar los tipos Prisma con las dependencias existentes. actorId será un escalar temporal, sin inventar una entidad User o una clave foránea de identidad que no se puede verificar. Mantener IncidentLocation e IncidentImage sin cambios. El DBML exige ahora cause no nulo en status_changes. fechaCreacion usa Timestamptz(3); se conservan los índices por incidencia y fecha del diagrama.

- Almacenamiento de esta fase: historial tipado en el agregado en memoria de cada incidencia; no son filas reales de una base de datos.
- Ciclo de vida: estado e historial se pierden al reiniciar y no se comparten entre procesos. El motivo y los datos de actor no deben filtrarse en las respuestas existentes.
- Relaciones: comprobar que la incidencia exista; el actor se valida solo por formato, según la deuda aceptada.
- Base de datos y migraciones: no activar PostgreSQL ni ejecutar db push o migraciones. Al introducir persistencia, usar una transacción que guarde estado e historial atómicamente; hasta entonces no existe auditoría duradera.

## Diseño mínimo

Añadir una operación al controlador y un pipe que valide el cuerpo completo. El servicio comprueba que la incidencia existe y está reported, construye el cambio de estado tipado y publica una única sustitución del agregado que incluye el nuevo estado y su historial. No realizar await ni efectos externos entre la comprobación y la sustitución: dos transiciones concurrentes sobre la misma instancia no deben aceptarse desde el mismo estado inicial.

Validación y construcción ocurren antes de publicar el cambio. Un fallo no debe dejar estado cambiado sin registro, ni historial añadido sin cambio de estado. Rechazar una transición posterior con 409 sin añadir otro registro.

Ajustar la serialización explícitamente para omitir el historial interno tanto al registrar como al consultar o responder a la transición. Reutilizar controladores, servicios y dependencias; no crear un motor de estados ni repositorios especulativos. El acceso de servicio al historial para uso interno debe devolver copias independientes, sin añadir una ruta HTTP de trazabilidad.

## Criterios de aceptación

1. reported puede pasar a validated o rejected; ambas operaciones requieren cause no vacío y civicId del actor declarado.
2. Cada transición correcta guarda exactamente un CambioEstado con incidencia, actor declarado, nuevo estado, motivo normalizado, UUID y fecha del servidor.
3. Estado e historial se publican juntos. Entrada inválida, recurso ausente, conflicto o fallo previo a publicar dejan ambos sin cambios.
4. Repetir o cambiar una incidencia ya validada/rechazada devuelve 409 y no crea otro registro; dos intentos concurrentes no generan dos transiciones válidas en la misma instancia.
5. No cambia el ciudadano propietario ni los datos de creación, ubicación o imágenes. Consultas existentes reflejan el nuevo estado sin historial ni motivos.
6. La documentación mantiene explícita DEUDA-47-01 y la falta de persistencia de auditoría. No se presenta el actor como autenticado.

## Documentación de endpoints

Ficha: [PATCH /incidents/:id/status](../../endpoint/patch-incidents-id-status/README.md). Catálogo y Swagger actualizados con los estados y respuestas implementados; frontend sin conectar.

## Estrategia de verificación

Solo unitarias bajo backend/test/incidents/ por responsabilidad. Cubrir ambas transiciones, motivo omitido/vacío/espacios, tipos y campos desconocidos, UUID inválidos, propietario diferente del actor, ausencia de incidencia, estado incorrecto y repetición, normalización y copias del historial, publicación conjunta y dos intentos de transición sobre el mismo estado. Cubrir también que GET individual y listado #27 no filtran historial y muestran el nuevo estado.

Al implementar, ejecutar build, lint y las unitarias autorizadas con las dependencias existentes, sin npm install ni e2e/integración. Resultados, limitaciones y confirmación registrados en el mismo plan, sin informes o archivos de tareas adicionales.
