# 2026-11-03 — Especificación: asignar departamento, equipo y técnico

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex, con Ponytail y TokenX.
- Modelo de IA que creó la especificación: GPT-6; identificador de compilación exacto no expuesto.

- Rama: feature/asignaciones-backend, hija de feature-login.
- Última actualización: 2026-11-03.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](../plans/2026-11-03-asignar-departamento-equipo-y-tecnico-plan.md).
- Referencias: [issue 31](https://github.com/PulsadorUrbano/urban-pulse/issues/31), [issue 32](https://github.com/PulsadorUrbano/urban-pulse/issues/32), [issue 33](https://github.com/PulsadorUrbano/urban-pulse/issues/33).

## Objetivo y decisiones vigentes

Permitir que personal municipal asigne a una incidencia validada un departamento, un equipo de ese departamento y un técnico de ese equipo, mediante una actualización conjunta que nunca deje una jerarquía incoherente.

- Alcance confirmado: diseñar la implementación backend de las tres asignaciones y preparar especificación y plan en esta rama. Se podrá enviar solo el campo que se quiere cambiar; también se admitirán varios en una petición.
- Decisiones confirmadas por el prototipo web: cambiar o quitar departamento limpia equipo y técnico; cambiar o quitar equipo limpia técnico; se puede guardar una asignación intermedia; el estado se conserva.
- Suposiciones por validar: el catálogo y las incidencias seguirán en memoria durante esta fase; `assigned` será un estado editable pero el PATCH no lo establecerá automáticamente. Estas decisiones afectan la durabilidad y el ciclo de vida.
- Fuera de alcance: editar o conectar frontend-web y frontend-mobile, migrar incidencias a PostgreSQL, CRUD de catálogos, auditoría de asignaciones y transiciones automáticas de estado.

## Contexto verificado

- Implementación actual: [IncidentsService](../../../../src/incidents/incidents.service.ts) guarda incidencias en un `Map`; [Incident](../../../../src/incidents/incident.ts) no tiene los tres IDs; [schema.prisma](../../../../prisma/schema.prisma) tampoco. El [diagrama](../../../../../database/diagram.dbml) describe departments, teams y team_members, pero no están implementados en Prisma.
- Contratos y referencias del dominio: [POST /incidents](../../endpoint/post-incidents/README.md), [GET /incidents/:id](../../endpoint/get-incidents-id/README.md), [PATCH de estado](../../endpoint/patch-incidents-id-status/README.md) y [permisos actuales](2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md). El guard existente comprueba el rol actual en PostgreSQL, además del JWT.
- Configuración y dependencias disponibles: NestJS 12, Prisma 7.10.1, TypeScript 6, Vitest 4 y pnpm 10.34.8; `AuthModule` y `AccesoIncidenciasGuard` ya están en `IncidentsModule`.
- Diferencia entre estado actual y propuesto: tres campos de asignación, validación de catálogo/jerarquía y un PATCH protegido. El prototipo web de `feature/asignar-tecnico-flow` usa mocks con IDs como `dep-roads` e `INC-0032`, incompatibles con los UUID reales. Móvil declara IDs en su tipo, pero no tiene flujo de asignación.

## Contrato HTTP

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| GET /incidents/assignment-options | Sin cuerpo ni consulta | 200: `{departments, teams, technicians}`; arrays de `{id,name}`, `{id,name,departmentId}` y `{id,name,teamId}` | Bearer; rol actual `admin` o `administrative` |
| PATCH /incidents/:id/assignment | `id` UUID; JSON no vacío con uno, dos o tres de `departmentId`, `teamId`, `technicianId` | 200: recurso `Incident` completo con los tres IDs resultantes | Bearer; rol actual `admin` o `administrative` |
| POST /incidents y GET /incidents/:id | Contratos existentes | Añaden `departmentId`, `teamId`, `technicianId`, inicialmente `null` | Permisos existentes sin cambios |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `:id` en ruta | UUID | Sí | `ParseUUIDPipe`; comparación sin distinguir mayúsculas | Omisión: ruta inexistente; null no aplica |
| `departmentId` en JSON | UUID o null | No | UUID del catálogo, normalizado a minúsculas | Omisión: conservar departamento; null: quitar departamento, equipo y técnico |
| `teamId` en JSON | UUID o null | No | Existe y pertenece al departamento resultante | Omisión: conservar equipo salvo cambio de departamento; null: quitar equipo y técnico |
| `technicianId` en JSON | UUID o null | No | Existe y pertenece al equipo resultante | Omisión: conservar técnico salvo cambio de departamento o equipo; null: quitar solo técnico |

- Campos desconocidos y controlados por servidor: se rechazan con 400; también se rechaza `{}`. No se acepta `civicId`, actor, estado, prioridad ni fecha en el PATCH.
- Recurso de respuesta: conserva todos los campos públicos actuales y añade los tres IDs, siempre presentes y anulables. Fechas siguen en ISO. El cuerpo `{"departmentId":null}` quita las tres asignaciones; `{"technicianId":null}` quita solo el técnico.
- Semántica del PATCH: partir de la asignación guardada y aplicar los campos presentes en orden departamento, equipo y técnico. Si cambia el departamento, limpiar equipo y técnico antes de aplicar los campos restantes de la misma petición. Si cambia el equipo, limpiar técnico antes de aplicar `technicianId` si se envió. Enviar el mismo ID no limpia descendientes. Validar la cadena resultante completa antes de guardar; un campo explícito incompatible produce 409, sin guardado parcial.
- Errores: 400 para cuerpo/UUID mal formado o ID de catálogo inexistente; 401 sin identidad vigente; 403 rol actual insuficiente; 404 incidencia ausente; 409 estado no editable o relación departamento/equipo/técnico incompatible. Todo rechazo deja intacta la incidencia.
- Identidad y permisos: reutilizar `JwtAuthGuard` y `AccesoIncidenciasGuard`, con metadata `rolesIncidencias` para `admin`/`administrative`; no decidir permisos por el rol firmado antiguo ni por IDs enviados.
- Compatibilidad: el cliente web deberá reemplazar su mock y sus IDs al integrarse. El listado reducido de incidencias conserva sus cuatro campos.

### Ejemplos de asignación y desasignación

En esta tabla `D`, `E` y `T` representan UUID del catálogo; `D2`, `E2` y `T2` representan otros UUID válidos con la pertenencia indicada. Las ternas muestran departamento, equipo y técnico.

| Asignación anterior | Cuerpo PATCH | Asignación resultante |
| --- | --- | --- |
| `(null, null, null)` | `{departmentId: D}` | `(D, null, null)`: solo departamento, permitido |
| `(D, null, null)` | `{teamId: E}` | `(D, E, null)`: equipo con su departamento, permitido |
| `(D, E, null)` | `{technicianId: T}` | `(D, E, T)`: solo se cambia el técnico, permitido |
| `(null, null, null)` | `{technicianId: T}` | 409: falta equipo y departamento; sin cambios |
| `(D, E, T)` | `{departmentId: D2}` | `(D2, null, null)`: se deshacen equipo y técnico |
| `(D, E, T)` | `{teamId: E2}` | `(D, E2, null)`: se deshace el técnico; `E2` debe pertenecer a `D` |
| `(D, E, T)` | `{technicianId: T2}` | `(D, E, T2)`: departamento y equipo se conservan; `T2` debe pertenecer a `E` |
| `(D, E, T)` | `{departmentId: D2, teamId: E2, technicianId: T2}` | `(D2, E2, T2)`: sustitución completa y atómica si la nueva cadena es válida |
| `(D, E, T)` | `{teamId: null}` | `(D, null, null)` |
| `(D, E, T)` | `{technicianId: null}` | `(D, E, null)` |

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `Incident` | `departmentId String? @db.Uuid`, `teamId String? @db.Uuid`, `technicianId String? @db.Uuid` | Los tres comienzan en null; en esta fase la jerarquía se valida en servicio contra catálogo en memoria. |
| `IncidentStatus` | Añadir `assigned` | Permite editar incidencias ya asignadas; esta operación no cambia estado. |

El agregado interno reutiliza los tipos generados de Prisma; la respuesta pública serializa fechas y no expone referencias mutables. El catálogo fijo contiene UUID estables de prueba y las relaciones departamento-equipo-técnico. El técnico de prueba no representa todavía una fila `team_members` ni una identidad autenticable.

- Almacenamiento de esta fase: incidencias, asignaciones y catálogo en memoria/proceso.
- Ciclo de vida: las asignaciones se pierden al reiniciar; instancias distintas no comparten cambios. Las respuestas son copias.
- Relaciones: validar formato, existencia en catálogo y pertenencia; no afirmar integridad referencial SQL.
- Base de datos y migraciones: generar tipos Prisma; no activar migraciones, `db push` ni persistencia de incidencias.

## Diseño mínimo

Ampliar `Incident`, `StoredIncident`, creación y serialización; añadir un catálogo fijo con UUID coherentes. Un pipe valida que el cuerpo contenga al menos un campo permitido y comprueba los tipos y UUID. `IncidentsService.asignar` obtiene la incidencia, comprueba que está `validated` o `assigned`, aplica el parche de arriba abajo con limpieza de descendientes y valida los tres IDs resultantes antes de publicar una sola copia actualizada. Enviar IDs incompatibles produce 409. Repetir un parche que no cambia ningún ID es idempotente. Construir la respuesta antes de publicar evita cambios parciales si falla la serialización.

El controlador reutiliza los dos guards existentes y Swagger. GET de opciones debe declararse antes de GET `:id`. No se añade una segunda política de roles ni una capa de repositorio.

## Criterios de aceptación

1. Un operador autorizado guarda una cadena completa o intermedia y la lee en GET de detalle; puede enviar solo departamento o solo técnico si ya existe su cadena superior.
2. Cambiar departamento limpia equipo y técnico; cambiar equipo limpia técnico; cambiar técnico conserva los superiores. Las desasignaciones siguen la misma jerarquía. IDs cruzados o ausentes y estado no editable no alteran el registro.
3. POST inicia los tres IDs en null; PATCH exige al menos un campo de asignación y rechaza cuerpo vacío o campos extraños.
4. Un fallo no cambia estado, prioridad, historiales ni asignación; el almacenamiento y su límite de memoria están documentados.
5. Roles actuales, Swagger y fichas de endpoints reflejan el contrato; listado ciudadano y contratos existentes conservan su comportamiento.

## Documentación de endpoints

- Al implementar: crear fichas para `get-incidents-assignment-options/` y `patch-incidents-id-assignment/` bajo [endpoint](../../endpoint/); actualizar las fichas de POST y GET de detalle. Estas rutas son propuestas, no activas todavía.

## Estrategia de verificación

Pruebas unitarias de catálogo, pipe, servicio, controlador y permisos observables, bajo `backend/test/incidents/`. Desde `backend/`, ejecutar `pnpm test`, `pnpm run build` y `pnpm run lint` tras cambios de código. No crear ni ejecutar e2e sin petición expresa. Para esta entrega documental, comprobar enlaces, coherencia de la rama y `git diff --check`.

Los resultados reales y la confirmación se registrarán en [el mismo plan](../plans/2026-11-03-asignar-departamento-equipo-y-tecnico-plan.md#confirmación-de-implementación).
