# 2026-10-23 — Plan para consultar incidencias por ciudadano

## Actualización de identidad y permisos — 2026-10-27

**DEUDA-27-01 cerrada en la implementación de identidad/permisos.** Creación/listado derivados del ciudadano actual y lectura propia con 404 ante acceso cruzado. El cliente deja de elegir civicId. Véanse [contrato vigente](../specs/2026-10-27-autenticar-incidencias-y-verificar-permisos-spec.md) y [plan con evidencia](../plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).

Los apartados posteriores conservan el registro histórico del prototipo. Sus referencias a identidad declarada, ausencia de autenticación y civicId como entrada quedan sustituidas por el contrato vigente. La persistencia permanece pendiente; el acceso de imágenes se ha protegido posteriormente según la [especificación de uploads](../specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md). Evidencia unitaria: guard de roles actuales, controlador con identidad servidor, rechazo de identidad externa y regresiones de servicios.

## Registro histórico de la funcionalidad


- Objetivo: listar incidencias filtradas por civicId, sin trazabilidad.
- Arquitectura: reutilizar el Map y los tipos Prisma existentes; validar toda la consulta en un pipe y devolver resúmenes nuevos desde el servicio.
- Herramientas: NestJS 12, TypeScript ESM, Vitest y Swagger instalados.
- Especificación: [Contrato aprobado](../specs/2026-10-23-consultar-incidencias-por-ciudadano-spec.md).
- Rama: feature/registro-incidencia-backend.
- Estado: implementado y verificado; diseño aprobado por el usuario el 2026-10-23.

## Restricciones generales

Almacenamiento en memoria e imágenes locales; sin base de datos, migraciones, frontend, autenticación o historial. civicId es solo un filtro, con deuda DEUDA-27-01 abierta. Sin npm install, npm i, pnpm install, dependencias nuevas, e2e, integración, commits ni push. Toda verificación y confirmación se registra en este mismo plan.

## Focos de revisión

- Rechazar falta de filtro, valores repetidos, tipos inválidos y parámetros desconocidos antes de llamar al servicio.
- No incluir incidencias de otro civicId ni filtrar como si el UUID acreditase identidad.
- Ordenar fechas descendentes, resolver empates por id y comparar UUID sin distinguir mayúsculas.
- No exponer imágenes, ubicación, historial ni referencias mutables.
- Mantener registro, consulta individual y almacenamiento actuales.

## Mapa de archivos e interfaces

| Archivo | Cambio |
| --- | --- |
| backend/src/incidents/incident.ts | ResumenIncidencia = Pick<Incident, 'id' | 'title' | 'status' | 'createdAt'>. |
| backend/src/incidents/incidents.service.ts | listarPorCiudadano(idCiudadano: string): ResumenIncidencia[]. |
| backend/src/incidents/listar-incidencias.pipe.ts | ListarIncidenciasPipe.transform(consulta: unknown): Promise<string>; validar el objeto completo y UUID con ParseUUIDPipe. |
| backend/src/incidents/incidents.controller.ts | listar(idCiudadano: string): ResumenIncidencia[] en GET /incidents; @Query con el pipe y Swagger explícito. |
| backend/test/incidents/services/listar-incidencias.service.spec.ts | Filtrado, proyección, orden, casing y aislamiento del Map con subida simulada. |
| backend/test/incidents/pipes/listar-incidencias.pipe.spec.ts | Validación sin HTTP ni servicios externos. |
| backend/docs/spec/endpoint/get-incidents/README.md | Contrato y limitación de identidad del nuevo endpoint. |

## Preparación

- [x] Leer especificación, guía, catálogo e implementación; comprobar la rama.
- [x] Consultar Context7 y las firmas de NestJS instaladas. La consulta a docs de la versión 12.0.1 no devolvió resultados; se usó la documentación oficial de pipes y se contrastó ParseUUIDPipe localmente.
- Referencia inicial de pruebas: la petición de ejecutar la suite completa antes del cambio fue rechazada; no se ha ejecutado ni se considera correcta.

## Tarea 1: listado del servicio y validación

- [x] Escribir unitarias de listado: filtrar dos ciudadanos, lista vacía, UUID en mayúsculas, orden descendente, empates por id, cuatro campos exactos y respuestas independientes.
- [x] Escribir unitarias del pipe: consulta válida y rechazo de ausencia, vacío, UUID inválido, arrays repetidos, tipos incorrectos y parámetros extra.
- [x] Ejecutar solo las dos suites nuevas y registrar el fallo esperado antes de implementar.
- [x] Añadir ResumenIncidencia, listarPorCiudadano y ListarIncidenciasPipe usando las interfaces anteriores.
- [x] Repetir las suites nuevas y registrar el resultado.

## Tarea 2: ruta y documentación

- [x] Añadir @Get() antes de @Get(':id'), aplicar el pipe al objeto @Query() y documentar consulta y array de resúmenes en Swagger. No modificar las otras rutas.
- [x] Crear la ficha get-incidents y actualizar su índice; declarar DEUDA-27-01 sin garantías ficticias de propiedad.
- [x] Revisar tipos, enlaces, formato, build y lint; ejecutar las unitarias autorizadas sin e2e/integración. Registrar cualquier rechazo o bloqueo real.
- [x] Completar criterios y confirmación en este archivo.

## Confirmación de implementación

- Fecha: 2026-10-23.
- Estado final: implementado y verificado dentro del alcance de prototipo aprobado.
- Resultado: GET /incidents?civicId=<UUID> ofrece resúmenes de cuatro campos, validación estricta, orden estable y copias independientes. El Map y los archivos locales no cambian.

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| Filtrado y resumen sin historial | Unitarias del servicio: dos ciudadanos y comparación exacta de cuatro campos. | Cumplido |
| Consulta inválida y lista vacía | 14 casos del pipe y caso del servicio sin coincidencias. | Cumplido |
| Orden, empates y casing | Casos específicos del servicio y normalización del pipe. | Cumplido |
| Aislamiento de respuestas e instancias | Mutar un resumen no altera el registro; otra instancia no hereda datos. | Cumplido |
| Operaciones y almacenamiento existentes | Suite completa conserva las unitarias existentes; sin cambios en subida, Prisma o composición. | Cumplido |
| Documentación y deuda de autorización | Swagger, ficha GET /incidents, índice y especificación mantienen DEUDA-27-01 abierta. | Cumplido |

### Comprobaciones ejecutadas

- Suites nuevas antes de implementar: fallo esperado por método y archivo ausentes. Tras implementar: 2 suites, 19 pruebas correctas.
- npm test final: 7 suites, 58 pruebas unitarias correctas. La referencia inicial completa fue rechazada; la ejecución final de regresiones sí fue autorizada.
- npm run build: correcto.
- npm run lint: correcto, con dos avisos ya existentes en create-incident.pipe.ts:44 por conteo de puntos de código Unicode. No se modifica ese comportamiento.
- No se ejecutan e2e, integración, peticiones HTTP en vivo, instalaciones, migraciones, conexiones frontend, commits ni push.

### Limitaciones

DEUDA-27-01 permanece abierta de forma explícita y aceptada: el filtro no acredita identidad ni propiedad. La memoria y las imágenes locales mantienen sus límites de ciclo de vida. Las verificaciones son unitarias y de compilación/lint, sin afirmar una prueba HTTP de integración.

## Registro de ejecución

La ejecución inicial de toda la suite fue rechazada. Después se autorizaron únicamente las suites nuevas: las cinco pruebas del servicio fallaron por ausencia de listarPorCiudadano y la suite del pipe no pudo importar el archivo todavía inexistente. Se implementan estas ausencias sin cambiar la infraestructura de almacenamiento.

### Revisión final

- Revisión independiente de solo lectura del servicio, pipe, controlador, tipos y unitarias: sin hallazgos de corrección o contrato.
- Prettier correcto en los seis archivos de código y pruebas modificados. Se corrigieron la entrada del catálogo y el formato del controlador durante la revisión; sin cambios adicionales de lógica.
- Enlaces de la especificación, plan, ficha, índice y README verificados. git diff --check correcto.
