# 2026-11-03 — Plan de implementación: asignar departamento, equipo y técnico

- Objetivo: permitir asignación conjunta, coherente y protegida de departamento, equipo y técnico en una incidencia validada.
- Arquitectura: ampliar el agregado en memoria; catálogo fijo; pipe de entrada; servicio atómico; reutilizar los guards actuales.
- Herramientas: NestJS 12, Prisma 7.10.1, TypeScript 6, Vitest 4, pnpm 10.34.8.
- Especificación: [Contrato y criterios](../specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md).
- Rama: feature/asignaciones-backend, hija de feature-login.
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar valores y alcance de la especificación; no conectar frontends ni activar PostgreSQL para incidencias.
- Código y documentación en español; conservar nombres de contratos públicos.
- Usar tipos Prisma generados; `pnpm exec prisma generate --config prisma7.config.ts` después de cambiar el modelo.
- Mantener TypeScript estricto, imports ESM `.js`, dependencias y pnpm-lock.yaml actuales.
- Solo pruebas unitarias en `backend/test/incidents/`; no e2e salvo petición expresa.
- Reutilizar `JwtAuthGuard`, `AccesoIncidenciasGuard` y la comprobación de rol actual en DB.
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
| Rol de JWT desactualizado o usuario eliminado | Tarea 3: `usaPermisosActualesDeAccesoIncidenciasGuard` |

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `backend/prisma/schema.prisma` | Campos opcionales y enum `assigned`. |
| Crear | `backend/src/incidents/assignment-catalog.ts` | Opciones UUID de prueba y relaciones. |
| Modificar | `backend/src/incidents/incident.ts` | Tipo `AsignacionIncidencia` y respuesta pública. |
| Modificar | `backend/src/incidents/incidents.service.ts` | Creación, copia y guardado atómico. |
| Crear | `backend/src/incidents/asignar-incidencia.pipe.ts` | Validar parche no vacío, campos permitidos, tipos y UUID. |
| Modificar | `backend/src/incidents/incidents.controller.ts` | GET opciones, PATCH y Swagger. |
| Crear | `backend/test/incidents/services/asignar-incidencia.service.spec.ts` | Reglas de jerarquía y atomicidad. |
| Crear | `backend/test/incidents/pipes/asignar-incidencia.pipe.spec.ts` | Forma exacta de entrada. |
| Modificar | `backend/test/incidents/controllers/incidents.controller.spec.ts` | Delegación, metadata de roles y respuesta. |
| Crear/actualizar al implementar | `backend/docs/spec/endpoint/get-incidents-assignment-options/README.md`, `backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md`, fichas POST/GET existentes | Contrato implementado, estado y referencias. |

## Preparación

- [x] Leer AGENTS.md, backend/AGENTS.md, las plantillas, el código afectado y el estado de Git para redactar este plan.
- [x] Listar `backend/docs/spec/endpoint/` y leer las fichas de GET detalle y PATCH estado.
- [x] Comprobar versiones en `backend/package.json`; consultar Context7 para NestJS y Prisma. Volver a consultar el concepto concreto antes de escribir código.
- [ ] Al iniciar implementación, registrar resultado inicial de `pnpm test`, `pnpm run build` y `pnpm run lint` desde `backend/`.

## Tarea 1: modelar la asignación y sus opciones

**Archivos:** `backend/prisma/schema.prisma`, `backend/src/incidents/incident.ts`, `backend/src/incidents/assignment-catalog.ts`, `backend/src/incidents/incidents.service.ts`, `backend/test/incidents/services/asignar-incidencia.service.spec.ts`.

**Interfaces:** `AsignacionIncidencia = {departmentId: string|null; teamId: string|null; technicianId: string|null}` representa el estado completo; `CambioAsignacionIncidencia = Partial<AsignacionIncidencia>` representa el PATCH no vacío validado; catálogo `{departments,teams,technicians}` con IDs UUID y relaciones; `Incident` público añade los tres campos.

**Criterios cubiertos:** 1, 3, 4.

- [ ] Escribir `creaIncidenciaSinAsignacion`: `create` y `findOne` devuelven los tres `null`; verificar UUID únicos y relaciones válidas del catálogo.
- [ ] Ejecutar `pnpm test -- asignar-incidencia.service.spec.ts` y registrar el fallo previo.
- [ ] Añadir tres `String? @db.Uuid` y `assigned` al enum; generar cliente; inicializar y copiar los campos sin referencias mutables.
- [ ] Repetir la prueba focalizada y registrar resultado real.
- [ ] Revisar diff y mantener spec y fichas existentes de POST/GET alineadas al implementarlo.

## Tarea 2: validar y guardar la jerarquía como una operación

**Archivos:** `backend/src/incidents/incidents.service.ts`, `backend/test/incidents/services/asignar-incidencia.service.spec.ts`.

**Interfaces:** `IncidentsService.asignar(idIncidencia: string, cambio: CambioAsignacionIncidencia): Incident` usa el catálogo de tarea 1 y devuelve la asignación completa en `Incident`.

**Criterios cubiertos:** 1, 2, 4.

- [ ] Escribir pruebas `cambiarDepartamentoLimpiaDependencias`, `cambiarEquipoLimpiaTecnico`, `cambiarTecnicoConservaSuperiores`, `rechazaTecnicoSinEquipoSinCambios`, `rechazaJerarquiaCruzadaSinCambios`, `rechazaIdDesconocidoSinCambios`, asignación solo de departamento, sustitución completa en un PATCH, repetición idéntica y estados no editables; comparar el registro completo antes/después de cada rechazo.
- [ ] Ejecutar `pnpm test -- asignar-incidencia.service.spec.ts` y registrar el fallo previo.
- [ ] Implementar validación de estado, aplicación de los campos presentes en orden jerárquico y limpieza de descendientes cuando cambie su superior; validar la cadena resultante completa y construir respuesta antes de publicar una sola copia en el `Map`; conservar estado, prioridad e historiales.
- [ ] Repetir prueba focalizada y registrar resultado real.
- [ ] Revisar diff y actualizar seguimiento en este plan.

## Tarea 3: exponer y proteger el contrato

**Archivos:** `backend/src/incidents/asignar-incidencia.pipe.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/test/incidents/pipes/asignar-incidencia.pipe.spec.ts`, `backend/test/incidents/controllers/incidents.controller.spec.ts`, fichas nuevas de `backend/docs/spec/endpoint/`.

**Interfaces:** `GET /incidents/assignment-options`; `PATCH /incidents/:id/assignment` recibe `CambioAsignacionIncidencia` no vacío y devuelve `Incident` con `AsignacionIncidencia` completa. Metadata `rolesIncidencias` de ambos métodos: `['admin','administrative']`.

**Criterios cubiertos:** 1, 2, 3, 5.

- [ ] Escribir `rechazaCuerpoDeAsignacionInvalido` para `{}`, extras, tipos y UUID; los null incompatibles se prueban en el servicio. Probar controller con guards/metadata existentes y DB simulada para rol actual, incluidos token antiguo y usuario eliminado.
- [ ] Ejecutar `pnpm test -- asignar-incidencia.pipe.spec.ts incidents.controller.spec.ts` y registrar el fallo previo.
- [ ] Añadir pipe, GET estático y PATCH con `ParseUUIDPipe`; reutilizar guards de clase, metadata de método y Swagger; no añadir guard nuevo.
- [ ] Repetir pruebas focalizadas y registrar resultado real.
- [ ] Crear fichas de endpoints propuestos ya implementados; actualizar POST/GET; marcar estado real y enlaces a código/spec/plan.

## Comprobaciones finales

Al implementar código, ejecutar desde `backend/`. En esta publicación solo documental, no se ejecutan pruebas ni servicios.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | `pnpm test` | Pendiente de implementación |
| Compilación | `pnpm run build` | Pendiente de implementación |
| Lint | `pnpm run lint` | Pendiente de implementación |
| Diff, desde raíz | `git diff --cached --check` | Correcto en la publicación documental |

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

- Comprobaciones: enlaces locales verificados y `git diff --cached --check` correcto; pruebas de código no aplican aún.
- Decisiones y desviaciones: el plan inicial se adaptó a `feature-login`, a las plantillas del repositorio, a pnpm y a pruebas unitarias. El 2026-11-03 se precisó que PATCH acepta uno o más campos y limpia solo las asignaciones descendientes del campo modificado.
- Limitaciones y pendientes: validar las dos suposiciones del spec antes de implementar; sustituir mock web en una fase separada.
