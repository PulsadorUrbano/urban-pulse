# 2026-10-23 — Especificación: consultar incidencias por ciudadano

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Rama: feature/registro-incidencia-backend.
- Última actualización: 2026-10-23.
- Estado: implementado; resultados y confirmación registrados en el plan. La deuda DEUDA-27-01 continúa abierta.
- Plan: [Implementación y confirmación](../plans/2026-10-23-consultar-incidencias-por-ciudadano-plan.md).
- Referencias: [Issue #27 — Consulta de tus incidencias](https://github.com/PulsadorUrbano/urban-pulse/issues/27) y decisión del usuario de continuar con memoria y civicId explícito.

## Objetivo y decisiones vigentes

Permitir consultar un listado de incidencias filtrado por ciudadano con su estado actual, sin trazabilidad ni historial de auditoría.

- Alcance confirmado: backend de la issue #27, reutilizando las incidencias ya registradas en memoria.
- Decisiones confirmadas: el usuario elige el filtro civicId proporcionado por el cliente y solicita documentar la deuda de identidad y autorización.
- Almacenamiento confirmado el 2026-10-23: mantener el Map privado del proceso para incidencias y metadatos, y los archivos de imágenes en el almacenamiento local existente. No sustituirlos por acceso a base de datos en esta tarea.
- Contrato aprobado: GET /incidents?civicId=<UUID>, respuesta resumida, orden descendente por creación y desempate por id.
- Fuera de alcance: frontend, base de datos activa, migraciones, autenticación, cambios de estado, historial, paginación, nuevas dependencias, commits y push.

Se consideraron dos enfoques: continuar el prototipo en memoria con civicId explícito, elegido por el usuario por encajar con la fase actual; u obtener la identidad de una sesión autenticada, que exige una infraestructura todavía inexistente y se aplaza. Un UUID no simula una sesión.

### Deuda técnica DEUDA-27-01: identidad y autorización pendientes

- Estado: aceptada temporalmente para el prototipo por el usuario el 2026-10-23; no resuelta.
- Causa: civicId procede del cliente tanto en el registro como en la consulta; no existe una identidad de sesión validada por el servidor.
- Riesgo: un solicitante puede indicar el civicId de otra persona y consultar su listado. Validar el formato UUID y filtrar por él no acredita identidad, propiedad ni autorización.
- Límite de la decisión: desarrollar el listado en memoria, sin presentarlo como una consulta privada ni garantizar que las incidencias pertenezcan al solicitante.
- Resolución pendiente: obtener la identidad desde una sesión o token verificado por el servidor, vincularla al civicId y aplicar autorización sin confiar en identificadores arbitrarios de consulta. Revisar también el registro para impedir asignar incidencias a terceros manipulando civicId.
- Criterio de cierre: la identidad y la propiedad se verifican en servidor; modificar un civicId externo no permite leer o crear incidencias en nombre de otra persona. Cubrir acceso cruzado y ausencia de credenciales con pruebas unitarias cuando se implemente esa infraestructura.
- Persistencia aplazada: al activar la base de datos, aplicar la consulta directa por civic_id y el índice (civic_id, created_at DESC) acordados en la issue. No reconstruir el estado mediante JOIN con status_changes. El índice no se aplica al Map y no se crea en esta tarea.

## Contexto verificado

- Implementación actual: [IncidentsService](../../../../src/incidents/incidents.service.ts) guarda StoredIncident en un Map privado. [IncidentsController](../../../../src/incidents/incidents.controller.ts) ya ofrece POST /incidents y GET /incidents/:id, pero no el listado propuesto.
- Contratos y referencias del dominio: [tipos de incidencias](../../../../src/incidents/incident.ts), [esquema Prisma](../../../../prisma/schema.prisma), issue #27 y su decisión sobre consulta por civic_id sin historial.
- Configuración y dependencias: NestJS 12, Prisma 7.10.1 y Vitest existentes en package.json. AppModule no activa PrismaModule; no hay conexión de base de datos requerida en este flujo.
- Diferencia propuesta: añadir una operación de lectura que filtre los registros actuales y produzca resúmenes independientes, manteniendo registro y consulta individual.

La rama incorpora origin/feature/registro-incidencia por fast-forward hasta b7b74be. Esta inspección estática no implica haber ejecutado pruebas o comprobado conectividad.

## Contrato HTTP

Contrato implementado.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| GET /incidents | Consulta civicId=<UUID>; sin cuerpo | 200 con array de resúmenes; [] sin coincidencias | Sin autenticación; filtro explícito del cliente, con deuda DEUDA-27-01 |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| civicId en consulta | Cadena UUID | Sí | Rechazar vacío, formato inválido o valores repetidos; comparar UUID sin distinguir mayúsculas/minúsculas | Ausente o null: 400; nunca listar todas las incidencias por omitir el filtro |

- Campos desconocidos y campos controlados por servidor: admitir únicamente civicId en esta consulta; otros parámetros devuelven 400. La lectura no permite modificar id, title, status ni createdAt.
- Recurso de respuesta: objetos planos con id UUID, title, status y createdAt ISO. No incluir historial, motivos de cambios, imágenes, ubicación o referencias mutables.
- Errores: 400 para consulta inválida. Un UUID válido sin registros devuelve 200 y [], no 404.
- Identidad y permisos: no se verifica identidad ni propiedad; no se simulan respuestas 401/403 ni controles inexistentes. Ver DEUDA-27-01.
- Compatibilidad: operación nueva; no cambia POST /incidents ni GET /incidents/:id. Sin paginación en esta fase. Orden por createdAt descendente y, en empate, id ascendente.

Ejemplo de consulta:

~~~text
GET /incidents?civicId=20ac442e-0f00-4fe4-bad3-61c8e8e0bff5
~~~

Ejemplo ilustrativo de respuesta; los valores no representan datos semilla:

~~~json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "title": "Farola apagada",
    "status": "reported",
    "createdAt": "2026-10-23T10:00:00.000Z"
  }
]
~~~

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| Incident, reutilizado | id UUID, civicId UUID, title String, status IncidentStatus, createdAt DateTime | Sin cambios de nulabilidad o valores; listar no crea registros |
| IncidentLocation e IncidentImage, conservados | Modelos existentes relacionados con Incident | La proyección del listado no expone estas relaciones ni las modifica |

Reutilizar los tipos Prisma existentes mediante StoredIncident. Definir el resumen como una proyección tipada de la respuesta pública; no crear un modelo duplicado para la lectura. Internamente createdAt es Date; en el listado se serializa a ISO.

- Almacenamiento de esta fase: Map privado de IncidentsService para incidencias y metadatos. UploadStorageService conserva las imágenes en UPLOADS_DIRECTORY o, si no se define, en uploads/ relativo al directorio de ejecución. Se mantiene la publicación existente bajo /uploads/. Los tipos Prisma no implican una conexión activa.
- Ciclo de vida: los registros y metadatos en memoria se pierden al reiniciar y no se comparten entre procesos. Los archivos locales tienen un ciclo de vida independiente; su permanencia no recupera los registros perdidos del Map. Los resúmenes devueltos no deben alterar el almacenamiento.
- Relaciones: civicId solo se valida por formato; no se comprueba identidad ni existencia del ciudadano.
- Base de datos y migraciones: aplazadas; no activar PrismaModule, conectar PostgreSQL, regenerar modelos sin necesidad ni ejecutar migraciones o db push.

## Diseño mínimo

Añadir el listado al controlador y una operación al servicio existente. El controlador valida la consulta y delega. El servicio recorre el Map, filtra por civicId, ordena las coincidencias y construye objetos nuevos con los cuatro campos del contrato. La operación no modifica datos ni escribe archivos.

Documentar la respuesta en Swagger junto a la limitación de identidad. Reutilizar módulos y dependencias instaladas; no introducir repositorios, caché, consultas de auditoría o nuevas capas. El recorrido y la ordenación en memoria son una limitación temporal; paginación y consulta indexada se abordarán al activar persistencia si el volumen lo requiere.

## Criterios de aceptación

1. Una consulta válida devuelve únicamente coincidencias del civicId solicitado con id, title, status y createdAt, sin trazabilidad.
2. Sin coincidencias: 200 y array vacío. Falta de filtro o consulta inválida: 400, sin devolver un listado global.
3. El orden es descendente por fecha y estable por id en empates; cambiar mayúsculas en el UUID no cambia las coincidencias.
4. El array y sus elementos no permiten modificar los registros almacenados; una instancia nueva no hereda datos de otra.
5. Se mantienen las operaciones existentes de registro y consulta individual y no se introduce persistencia.
6. Swagger y la ficha del endpoint explican el contrato y DEUDA-27-01, sin afirmar privacidad o autorización inexistentes.

## Documentación de endpoints

- Ficha del listado: [GET /incidents](../../endpoint/get-incidents/README.md).
- Mantener método, ruta, consulta, respuesta, errores y enlaces al código sincronizados con esta especificación y el catálogo existente.
- Documentar sin solicitudes HTTP en vivo ni conexión de consumidores fuera del alcance pedido.

## Estrategia de verificación

Solo pruebas unitarias por defecto, bajo backend/test/incidents/services/, controllers/ o pipes/ según la responsabilidad. Cubrir varios ciudadanos, cero coincidencias, ausencia/formato/repetición del filtro, campos desconocidos, proyección sin trazabilidad, orden y empates, casing del UUID y aislamiento de respuestas. No crear ni ejecutar e2e o integración salvo petición explícita.

Al implementar, ejecutar las comprobaciones pertinentes de build, lint y unitarias con las dependencias existentes, sin npm install. Para esta actualización documental, comprobar estructura frente a la plantilla, enlaces, rutas y git diff --check, sin ejecutar la aplicación.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](../plans/2026-10-23-consultar-incidencias-por-ciudadano-plan.md#confirmación-de-implementación). No crear informes ni archivos separados de tareas o cierre; no heredar verificaciones de trabajos anteriores.
