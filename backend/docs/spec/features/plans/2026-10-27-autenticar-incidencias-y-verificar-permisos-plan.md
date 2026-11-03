# 2026-10-27 - Plan para autenticar incidencias y verificar permisos

> Actualización posterior del 2026-10-27: el límite de /uploads público descrito como fuera de alcance en esta fase ya fue abordado por la [protección de imágenes](../specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md). Se conserva aquí la historia de identidad; las imágenes ahora requieren JWT y permiso. La persistencia en memoria sigue pendiente.


- Objetivo: cerrar DEUDA-27-01, DEUDA-47-01 y DEUDA-28-01 de identidad/permisos conservando memoria.
- Especificación: [Contrato y criterios](../specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md).
- Rama: feature-login; preservar el trabajo local ya implementado del login.
- Herramientas: NestJS/JWT/Prisma/Vitest existentes; Context7 consultado sobre guardas, lifecycle y metadata.
- Estado: implementado y verificado; revisión final completada.

## Restricciones generales

- Solo backend. Sin nueva rama salvo petición, sin frontend, instalación de dependencias, esquema/migración, DB/servidor, e2e/integración, commit o push.
- No npm install, npm i o pnpm install. Español y contratos públicos con nombres existentes.
- Incidencias e historiales permanecen en memoria. Cambios de identidad del contrato son deliberados: civicId queda fuera de entradas públicas.
- Solo admin/administrative operan; rol actual leído de DB. Civic crea/lista lo suyo y lee detalle propio; operadores leen detalle. Otros roles denegados.
- Seguimiento y cierre únicamente en este mismo plan. No declarar resuelta la persistencia o privacidad de archivos /uploads.

## Focos de revisión

| Riesgo | Verificación |
| --- | --- |
| Rol antiguo del JWT | DB cambió de admin a civic; PATCH devuelve 403 sin modificación. |
| Suplantar dueño/actor | civicId/actorId externos rechazados; id interno proviene del usuario actual. |
| Confundir ciudadano con user genérico | Civic sin citizens devuelve 403; dueño viene de citizen.user_id. |
| Abrir ruta por metadata omitida | Guard deniega sin roles explícitos; no confiar en rol del token. |
| Escritura antes de autorizar | Guardas anteriores a interceptor; sin archivos, cambios o historial ante fallo. |

## Mapa de archivos

| Acción | Ruta desde raíz | Responsabilidad |
| --- | --- | --- |
| Crear | backend/src/incidents/types/usuario-incidencias.ts | Identidad actual validada para la petición |
| Crear | backend/src/incidents/guards/acceso-incidencias.guard.ts | Consulta identidad/rol actuales y autoriza con metadata |
| Crear | backend/src/incidents/decorators/usuario-incidencias-actual.decorator.ts | Extraer contexto autenticado del servidor |
| Modificar | backend/src/incidents/incidents.module.ts | Importar AuthModule y registrar guard |
| Modificar | backend/src/incidents/incidents.controller.ts | Guardas, roles, contexto de identidad y Swagger |
| Modificar | backend/src/incidents/incident.ts y create-incident.dto.ts | Separar cuerpo externo y entrada interna, quitar identidad pública de PATCH |
| Modificar | backend/src/incidents/create-incident.pipe.ts y listar-incidencias.pipe.ts | Cuerpo sin civicId y consulta vacía |
| Modificar | backend/src/incidents/cambiar-estado-incidencia.pipe.ts y cambiar-prioridad-incidencia.pipe.ts | Rechazar identidad elegida en cuerpos |
| Modificar | backend/src/incidents/incidents.service.ts | Lectura por propietario y actor separado en cambios |
| Crear | backend/test/incidents/guards/acceso-incidencias.guard.spec.ts | JWT previo, usuario actual, roles y vinculación |
| Crear | backend/test/incidents/controllers/incidents.controller.spec.ts | Identidad del servidor en cada llamada y metadata de rutas |
| Actualizar | backend/test/incidents/pipes/ y backend/test/incidents/services/ | Entradas, acceso cruzado, actor auténtico y regresiones |
| Actualizar al implementar | backend/docs/spec/endpoint/ y specs/planes originales de las tres deudas | Nuevo contrato y cierre con evidencia |

## Preparación

- [x] Revisar código, deuda original, catálogo y guía.
- [x] Confirmar memoria y roles admin/administrative con el usuario.
- [x] Consultar Context7: guardas antes de interceptores/pipes y metadata mediante Reflector.
- [x] Revisar propuesta detallada antes de implementar.
- [x] Capturar Git y resultado base npm test; no confundir cambios ya presentes de login con los de esta tarea. No repetir ni descartar ese trabajo.

## Tarea 1: identidad actual y permiso por ruta

**Interfaces:** UsuarioIncidencias {id: string; role: profile_role; ciudadanoId: string|null}; AccesoIncidenciasGuard.canActivate(context: ExecutionContext): Promise<boolean>; UsuarioIncidenciasActual extrae request.usuarioIncidencias. Metadata rolesIncidencias: readonly profile_role[].

- [x] Escribir unitarias del guard usando contexto simulado y Prisma doblado: sin identidad verificada -> 401; usuario eliminado -> 401; error DB se propaga sin identidad; rol actual permitido y denegado; civic sin relación -> 403; metadata ausente -> 403. No adjuntar contexto al fallar.
- [x] Probar cambio de rol DB frente a claims antiguas. Seleccionar solo users.id/role y citizen.user_id, sin contraseñas.
- [x] Ejecutar npm test -- test/incidents/guards/acceso-incidencias.guard.spec.ts y observar fallos antes de implementar.
- [x] Crear tipos, guard y decorador; importar AuthModule en IncidentsModule. Ejecutar JwtAuthGuard antes del nuevo guard. No introducir guard global que cambie login/categorías.
- [x] Probar metadata real del controlador para civic en crear/listar, civic/admin/administrative en detalle y admin/administrative en PATCH. Guardas deben preceder a subida.

## Tarea 2: propietario auténtico y consultas propias

**Interfaces:** CrearIncidenciaBody = Omit<CreateIncidentInput,'civicId'>; CreateIncidentDto sin civicId. create interno conserva CreateIncidentInput, construido por controlador con ciudadanoId. listarPorCiudadano recibe id del servidor. ListarIncidenciasPipe.transform(consulta: unknown): void admite objeto vacío y rechaza cualquier parámetro. findOne(id: string, usuario: UsuarioIncidencias): Incident requiere contexto; dueño comparado case-insensitive para civic.

**Criterios:** 1, 2, 5 y 6.

- [x] Escribir unitarias de pipes: POST válido sin civicId, campo civicId/userId/actorId rechazado; GET solo consulta vacía, rechazo de civicId/repetidos/anidados y campos extra. Conservar título/archivos/ubicación y errores existentes.
- [x] Controlador recibe contexto servidor y construye entrada de creación con ciudadanoId. No aceptar ciudadano sin relación, ya denegado por el guard. Listado se filtra por ciudadano actual y mantiene sus cuatro campos exactos.
- [x] Servicio: ciudadano A no consulta detalle B (404); operador permitido consulta ambos; UUID en mayúsculas funciona; propietario/listado no cambian por entradas manipuladas. Actualizar llamadas unitarias existentes de findOne con actor explícito.
- [x] Ejecutar unitarias antes del cambio, implementar lo mínimo y repetirlas. No reestructurar otros roles/funcionalidades ni migrar Map.

## Tarea 3: actor real en estado y prioridad

**Interfaces:** CambiarEstadoIncidenciaInput {status,cause}; CambiarPrioridadIncidenciaInput {priority,cause}; cambiarEstado(id,entrada,idActor: string): Incident y cambiarPrioridad(id,entrada,idActor: string): Incident. idActor proviene de UsuarioIncidencias.id, no del cuerpo. El historial conserva su estructura y tipos Prisma.

**Criterios:** 3, 4, 5 y 6.

- [x] Pipes rechazan civicId/actorId/esManual/userId y conservan validaciones de motivo, estado y prioridad.
- [x] Controlador pasa el actor del servidor como argumento independiente. Comprobar ambos PATCH con actor distinto al dueño; el propietario se conserva y el historial registra exactamente al operador actual.
- [x] Casos admin/administrative permitidos y civic/department/team/technician/analyst denegados; rol degradado falla aunque token antiguo diga admin. Sin token/usuario eliminado, 401. No escribir nada en estos errores.
- [x] Ejecutar suites de pipes, guard/controlador y servicios antes de implementar; conservar reglas de reported y validated, repetición/conflicto de estado, reevaluación de prioridad, copias y publicación conjunta.
- [x] Ajustar llamadas unitarias existentes a la nueva firma y verificar ambas auditorías sin añadir endpoints de historial.

## Tarea 4: contratos y cierre verificable de deuda

- [x] Actualizar Swagger y cinco fichas: Bearer, roles, entradas sin civicId, 401/403/404 y compatibilidad rota deliberadamente. Categorías y estáticos no cambian.
- [x] Añadir al spec/plan original de cada deuda una nota con fecha, enlace a esta especificación y evidencia de cierre. Preservar historia, pero indicar claramente qué contrato la sustituye. No cerrar antes de que los tests del criterio pasen.
- [x] Ejecutar npm test, npm run build y npm run lint; revisión final y git diff --check -- backend. Solo unitarias, con DB/red/archivos sustituidos.
- [x] Confirmar que no hubo conexión DB, frontend, esquema, migraciones, dependencias, commit o push.

## Comprobaciones finales

| Comprobación | Resultado real |
| --- | --- |
| Unitarias | 21 archivos y 273 pruebas correctas |
| Compilación | Correcta |
| Lint | Sin errores; cuatro avisos heredados |
| Enlaces y diff documental | 14 documentos revisados, enlaces locales existentes y git diff --check -- backend correcto |

## Ejecución y decisiones

- Aprobación del usuario el 2026-10-27. Se mantuvieron todos los cambios locales previos de login; base antes de esta tarea: 19 archivos y 252 pruebas correctas.
- Context7: orden de guardas anterior a interceptores/pipes, SetMetadata y Reflector para permisos por ruta. Solo usuarios/roles actuales se leen de DB; no se cambia Prisma.
- Rojo: cuerpos sin civicId fallaban, el listado aceptaba identidad externa y no existía autorización por rol/contexto. La primera ejecución también detectó expectativas síncronas sobre el pipe asíncrono antiguo; se corrigieron las pruebas para capturar ambos estilos. Con interfaz mínima se observaron 24 fallos de comportamiento en guard/controlador/listado antes de implementar.
- Verde: guard de usuario actual y metadata, identidad en controller y protección de propiedad correctos. Suites existentes de estado/prioridad adaptadas mediante sus nuevas firmas; no se redujeron las reglas de negocio.
- Primer build detectó dos referencias restantes al tipo interno antiguo del pipe de creación; se sustituyeron por CrearIncidenciaBody. Tipos externos e internos quedan separados sin cambiar el recurso público.
- Cuerpo de creación se tipa como interfaz validada por el pipe, conservando DTO documental. Esto evita spread de una instancia de clase sin añadir lógica ni dependencias. Se eliminaron dos avisos nuevos de lint; quedan solo cuatro heredados.
- Verificación: 21 archivos y 273 pruebas correctas; build correcto y lint sin errores. No se iniciaron servicios ni DB y no se ejecutaron e2e/integración.
- Cierre individual documentado en los tres specs/planes originales con nota de sustitución y evidencia. Persistencia y /uploads permanecen fuera de alcance.
- Revisión estática independiente: sin hallazgos accionables en autorización, propiedad, actor, módulos y documentación. Acceso Git limitado en el sandbox del revisor; estado/diff verificados por el agente principal.
- Documentación final: 14 documentos con enlaces locales correctos y git diff --check -- backend sin errores. No hay cambios frontend o de esquema/dependencias.

## Confirmación de implementación

- Estado final: implementado y verificado; las tres deudas de identidad/permisos están cerradas en esta implementación.
- Fecha: 2026-10-27.
- DEUDA-27-01: identidad servidor en creación/listado y propiedad en detalle; acceso cruzado 404 y civicId externo rechazado.
- DEUDA-47-01: rol actual admin/administrative y actor auténtico en auditoría de estado.
- DEUDA-28-01: rol actual admin/administrative y actor auténtico en auditoría de prioridad.
- Evidencia: guard con todos los roles, usuario eliminado, relación ciudadana ausente y fallo DB; metadata de cinco rutas; controlador con creación/listado propios y ambos actores; pipes de identidad externa y servicios de regresión.
- Límites: memoria y archivos públicos /uploads pendientes; no afirmar privacidad integral. No frontend, esquema/migraciones, instalación de dependencias, commit ni push.

| Criterio de aceptación | Evidencia | Resultado |
| --- | --- | --- |
| 1: propietario/listado | POST sin civicId, listado del usuario real y pipes de suplantación | Cumplido |
| 2: lectura | Propietario, UUID case-insensitive, acceso ajeno404 y operador permitido | Cumplido |
| 3: estado | Roles actuales y actor del servidor en CambioEstado | Cumplido |
| 4: prioridad | Roles actuales y actor del servidor en CambioPrioridad | Cumplido |
| 5: sesión/roles | Usuario eliminado, ausencia JWT, rol cambiado y citizens ausente | Cumplido |
| 6: efectos y compatibilidad | Guardas antes de subida; pipes y regresiones de servicios/historiales | Cumplido |
| 7: documentación | Swagger, cinco fichas, catálogo y notas históricas de cierre revisadas | Cumplido |
