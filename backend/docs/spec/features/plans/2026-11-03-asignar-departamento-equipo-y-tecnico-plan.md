# 2026-11-03 — Plan de implementación: asignar departamento, equipo y técnico

- Objetivo: permitir asignación conjunta, coherente y protegida de departamento, equipo y técnico en una incidencia validada.
- Arquitectura: ampliar los modelos y la migración PostgreSQL existentes; consultar el catálogo en Prisma; guardar la asignación mediante una transacción; proteger las dos rutas nuevas con JWT y comprobación del rol actual.
- Herramientas: NestJS 12, Prisma 7.10.1, TypeScript 6, Vitest 4 y npm con package-lock.json.
- Especificación: [Contrato y criterios](../specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md).
- Rama: feature/asignaciones-backend, basada en feat-imagenes-cloudinary.
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar valores y alcance de la especificación; no conectar frontends ni cambiar el flujo Cloudinary. PostgreSQL ya persiste incidencias en esta rama.
- Código y documentación en español; conservar nombres de contratos públicos.
- Usar tipos Prisma generados; crear migración versionada y ejecutar `npm exec -- prisma generate --config prisma7.config.ts` después de cambiar el modelo. No aplicar la migración en una base externa sin autorización de ejecución.
- Mantener TypeScript estricto, imports ESM `.js`, dependencias y package-lock.json actuales.
- Solo pruebas unitarias en `backend/test/incidents/`; no e2e salvo petición expresa.
- Reutilizar `JwtAuthGuard`; esta base no contiene `AccesoIncidenciasGuard`, así que crear una comprobación mínima de rol actual para los dos endpoints nuevos.
- PATCH admite un subconjunto no vacío de los tres campos; aplicar cambios en orden departamento, equipo, técnico y limpiar descendientes solo cuando cambia su superior.
- Esta publicación de rama y documentos está solicitada; futuros commits de implementación y conexiones frontend quedan fuera de este plan hasta la ejecución acordada.

## Focos de revisión

| Riesgo | Tarea y prueba unitaria |
| --- | --- |
| Cambiar departamento deja equipo/técnico anteriores | Tarea 2: `cambiarDepartamentoLimpiaDependencias` |
| Cambiar equipo deja técnico anterior o cambiar técnico borra superiores | Tarea 2: `cambiarEquipoLimpiaTecnico` y `cambiarTecnicoConservaSuperiores` |
| Asignar solo técnico sin cadena superior | Tarea 2: `rechazaTecnicoSinEquipoSinCambios` |
| Equipo o técnico de otra rama | Tarea 2: `rechazaJerarquiaCruzadaSinCambios` |
| UUID válido ausente del catálogo | Tarea 2: `rechazaIdDesconocidoSinCambios` |
| Cuerpo incompleto, extra o mal tipado | Tarea 3: `rechazaCuerpoDeAsignacionInvalido` |
| Dos PATCH concurrentes pisan la asignación anterior | Tarea 2: `rechazaCambioConcurrenteSinPerderDatos` |
| Error de PostgreSQL deja un cambio parcial | Tarea 2: `revierteAsignacionSiFallaLaTransaccion` |
| Rol de JWT desactualizado o usuario eliminado | Tarea 3: `consultaRolActualParaAsignar` |

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `backend/prisma/schema.prisma` | Modelos Department, Team, TeamMember, claves foráneas de Incident y enum `assigned`. |
| Crear | `backend/prisma/migrations/20261103000000_asignaciones/migration.sql` | Tablas y columnas, índices y claves foráneas; sin ejecutar despliegue en esta fase. |
| Modificar | `backend/src/incidents/incident.ts` | Tipo `AsignacionIncidencia` y respuesta pública. |
| Modificar | `backend/src/incidents/incidents.service.ts` | Consulta de catálogo, transacción y serialización de asignaciones. |
| Crear | `backend/src/incidents/asignar-incidencia.pipe.ts` | Validar parche no vacío, campos permitidos, tipos y UUID. |
| Crear | `backend/src/incidents/guards/acceso-asignaciones.guard.ts` | Comprobar usuario y rol actuales en PostgreSQL después del JWT. |
| Modificar | `backend/src/incidents/incidents.module.ts` | Importar AuthModule y registrar el guard nuevo. |
| Modificar | `backend/src/incidents/incidents.controller.ts` | GET opciones, PATCH y Swagger. |
| Crear | `backend/test/incidents/services/asignar-incidencia.service.spec.ts` | Reglas de jerarquía y atomicidad. |
| Crear | `backend/test/incidents/pipes/asignar-incidencia.pipe.spec.ts` | Forma exacta de entrada. |
| Crear | `backend/test/incidents/guards/acceso-asignaciones.guard.spec.ts` | Identidad y permisos actuales. |
| Modificar | `backend/test/incidents/controllers/incidents.controller.spec.ts` | Delegación, metadata de roles y respuesta. |
| Crear/actualizar al implementar | `backend/docs/spec/endpoint/get-incidents-assignment-options/README.md`, `backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md`, fichas POST/GET existentes | Contrato implementado, estado y referencias. |

## Preparación

- [x] Leer AGENTS.md, backend/AGENTS.md, las plantillas, el código afectado y el estado de Git para redactar este plan.
- [x] Listar `backend/docs/spec/endpoint/` y leer las fichas de GET detalle y PATCH estado.
- [x] Comprobar versiones en `backend/package.json`; consultar Context7 para NestJS y Prisma. Volver a consultar el concepto concreto antes de escribir código.
- [ ] Al iniciar implementación, registrar resultado inicial de `npm test`, `npm run build` y `npm run lint` desde `backend/`.

## Tarea 1: modelar la asignación y sus opciones

**Archivos:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261103000000_asignaciones/migration.sql`, `backend/src/incidents/incident.ts`, `backend/src/incidents/incidents.service.ts`, `backend/test/incidents/services/asignar-incidencia.service.spec.ts`.

**Interfaces:** `AsignacionIncidencia = {departmentId: string|null; teamId: string|null; technicianId: string|null}` representa el estado completo; `CambioAsignacionIncidencia = Partial<AsignacionIncidencia>` representa el PATCH no vacío validado; `OpcionesAsignacion = {departments: {id:string;name:string}[]; teams: {id:string;name:string;departmentId:string}[]; technicians: {id:string;name:string;teamId:string}[]}`; `Incident` público añade los tres campos. El catálogo procede de `Department`, `Team`, `TeamMember` y `users`.

**Criterios cubiertos:** 1, 3, 4.

- [ ] Escribir `creaIncidenciaSinAsignacion`: `create` y `findOne` devuelven los tres `null`; comprobar que el detalle conserva imágenes sin exponer `cloudinaryId`.
- [ ] Ejecutar `npm test -- asignar-incidencia.service.spec.ts` y registrar el fallo previo.
- [ ] Añadir Department, Team y TeamMember con relaciones hacia users e Incident; añadir tres FK anulables y `assigned`; crear migración SQL versionada, generar cliente y ampliar `serializar()`.
- [ ] Repetir la prueba focalizada y registrar resultado real.
- [ ] Revisar diff y mantener spec y fichas existentes de POST/GET alineadas al implementarlo.

## Tarea 2: validar y guardar la jerarquía como una operación

**Archivos:** `backend/src/incidents/incidents.service.ts`, `backend/test/incidents/services/asignar-incidencia.service.spec.ts`.

**Interfaces:** `IncidentsService.opcionesAsignacion(): Promise<OpcionesAsignacion>` lee los tres catálogos; `IncidentsService.asignar(idIncidencia: string, cambio: CambioAsignacionIncidencia): Promise<Incident>` devuelve la asignación persistida y completa.

**Criterios cubiertos:** 1, 2, 4.

- [ ] Escribir pruebas `cambiarDepartamentoLimpiaDependencias`, `cambiarEquipoLimpiaTecnico`, `cambiarTecnicoConservaSuperiores`, `rechazaTecnicoSinEquipoSinCambios`, `rechazaJerarquiaCruzadaSinCambios`, `rechazaIdDesconocidoSinCambios`, `rechazaCambioConcurrenteSinPerderDatos`, `revierteAsignacionSiFallaLaTransaccion`, asignación solo de departamento, sustitución completa en un PATCH, repetición idéntica y estados no editables; comparar el registro completo antes/después de cada rechazo.
- [ ] Ejecutar `npm test -- asignar-incidencia.service.spec.ts` y registrar el fallo previo.
- [ ] Consultar opciones desde Prisma; en `$transaction`, leer incidencia y relaciones, aplicar campos presentes en orden jerárquico y limpiar descendientes, validar resultado y actualizar por `updateMany` con comparación de estado y terna anteriores para evitar sobrescrituras concurrentes. Leer el agregado actualizado y serializar; conservar estado, prioridad, historiales e imágenes.
- [ ] Repetir prueba focalizada y registrar resultado real.
- [ ] Revisar diff y actualizar seguimiento en este plan.

## Tarea 3: exponer y proteger el contrato

**Archivos:** `backend/src/incidents/asignar-incidencia.pipe.ts`, `backend/src/incidents/guards/acceso-asignaciones.guard.ts`, `backend/src/incidents/incidents.module.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/test/incidents/pipes/asignar-incidencia.pipe.spec.ts`, `backend/test/incidents/guards/acceso-asignaciones.guard.spec.ts`, `backend/test/incidents/controllers/incidents.controller.spec.ts`, fichas nuevas de `backend/docs/spec/endpoint/`.

**Interfaces:** `GET /incidents/assignment-options`; `PATCH /incidents/:id/assignment` recibe `CambioAsignacionIncidencia` no vacío y devuelve `Incident` con `AsignacionIncidencia` completa. Ambos métodos usan `@UseGuards(JwtAuthGuard, AccesoAsignacionesGuard)`; el segundo consulta `users` para rol `admin` o `administrative` vigente.

**Criterios cubiertos:** 1, 2, 3, 5.

- [ ] Escribir `rechazaCuerpoDeAsignacionInvalido` para `{}`, extras, tipos y UUID; los null incompatibles se prueban en el servicio. Escribir `consultaRolActualParaAsignar` con DB simulada para rol actual, token antiguo y usuario eliminado; probar controller con guards y respuesta del servicio simulada.
- [ ] Ejecutar `npm test -- asignar-incidencia.pipe.spec.ts acceso-asignaciones.guard.spec.ts incidents.controller.spec.ts` y registrar el fallo previo.
- [ ] Añadir pipe, guard de rol actual, GET estático y PATCH con `ParseUUIDPipe`; importar `AuthModule` en `IncidentsModule`, registrar guard y actualizar Swagger. No proteger ni cambiar otras rutas en este task.
- [ ] Repetir pruebas focalizadas y registrar resultado real.
- [ ] Crear fichas de endpoints propuestos ya implementados; actualizar POST/GET; marcar estado real y enlaces a código/spec/plan.

## Comprobaciones finales

Al implementar código, ejecutar desde `backend/`. En esta publicación solo documental, no se ejecutan pruebas ni servicios.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | `npm test` | Pendiente de implementación |
| Compilación | `npm run build` | Pendiente de implementación |
| Lint | `npm run lint` | Pendiente de implementación |
| Diff, desde raíz | `git diff --check` | Correcto tras adaptar el plan a la nueva base |

- [ ] Mantener catálogo de endpoints y Swagger coherentes con contratos realmente implementados.
- [ ] Revisar evidencia de los cinco criterios y consistencia de nombres, firmas y tipos.
- [ ] Registrar decisiones, desviaciones y resultados en este plan.
- [ ] Confirmar que no se tocaron consumidores, credenciales ni servicios ajenos.

## Confirmación de implementación

- Estado final: pendiente.
- Fecha de revisión: 2026-11-03.
- Resultado entregado: especificación y plan; código aún no implementado.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1–5 del spec | Tareas y comprobaciones definidas arriba | Pendiente |

- Comprobaciones: enlaces locales y `git diff --check` correctos; pruebas de código no aplican aún.
- Decisiones y desviaciones: el 2026-11-03 se rebasó la rama sobre `feat-imagenes-cloudinary`. El plan usa PostgreSQL y npm, conserva la semántica parcial del PATCH y no presupone el guard de `feature-login`.
- Limitaciones y pendientes: provisionar catálogos municipales para uso real y sustituir mock web en una fase separada.
