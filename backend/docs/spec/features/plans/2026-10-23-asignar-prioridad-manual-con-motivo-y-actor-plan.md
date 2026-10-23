# 2026-10-23 - Plan de implementación: asignar prioridad manual con motivo y actor

- Objetivo: resolver #28, #49, #50 y #51 con asignación manual sobre incidencias validated e historial de prioridad.
- Arquitectura: reutilizar controlador, servicio y Map; historial Prisma CambioPrioridad en el agregado, publicado junto a priority con una única sustitución síncrona.
- Herramientas: NestJS 12, TypeScript ESM, Prisma 7.10.1, Swagger y Vitest existentes.
- Especificación: [Contrato y criterios](../specs/2026-10-23-asignar-prioridad-manual-con-motivo-y-actor-spec.md).
- Rama: feature/registro-incidencia-backend; base observada 49410b1.
- Estado: ejecución autorizada por el usuario; implementación, comprobaciones y revisión final completadas.
- Ejecución prevista: en esta sesión, siguiendo tareas y registrando evidencia aquí; sin commits ni push.

## Restricciones generales

- Mantener solo backend, almacenamiento en memoria e imágenes locales. Sin conexión DB, migraciones, IA, frontend ni dependencias nuevas.
- Solo status=validated; priority low, medium o high. cause obligatorio y no vacío después de trim; civicId UUID del actor declarado. esManual=true lo fija el servidor.
- Cada asignación aceptada genera un registro incluso con la misma prioridad. No aplicar a esta operación la regla de transición única de #47.
- Conservar propietario, status, datos originales y cambios de estado; no exponer el historial en respuestas existentes.
- Programar y documentar en español, con imports .js y contratos existentes. No ejecutar npm install, npm i ni pnpm install.
- Solo unitarias bajo test/incidents/<rol>/; sin e2e/integración. Mantener el mismo plan como seguimiento y confirmación, sin informes adicionales.

## Focos de revisión

| Riesgo | Evidencia prevista |
| --- | --- |
| Confundir low inicial con IA o decisión humana | Registro inicial low con historial vacío; primera asignación low genera un registro manual con actor. |
| Confundir autor con dueño | Actor distinto del propietario; conservar civicId original y registrar el actor declarado. |
| Prioridad sin historial o historial perdido | Fallo previo a publicar sin cambios; dos decisiones conservadas en orden y última prioridad vigente. |
| Filtrar o permitir mutar auditoría | Respuestas completas/listado sin historial; copias del historial y fechas independientes. |
| Regresión en #47 | Cambiar prioridad no cambia status ni historial de estado; una transición de estado conserva prioridad e historial existentes. |

## Mapa de archivos

Rutas desde la raíz del repositorio. Archivos de la implementación realizada.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | backend/prisma/schema.prisma | Ampliar IncidentPriority; CambioPrioridad, relación y mapeos. |
| Regenerar | backend/src/generated/prisma/ | Tipos derivados del esquema con CLI instalada. |
| Modificar | database/diagram.dbml | Clave primaria, motivo obligatorio e índice de priority_changes. |
| Modificar | backend/src/incidents/incident.ts | Entrada CambiarPrioridadIncidenciaInput, prioridad derivada e historial interno. |
| Crear | backend/src/incidents/cambiar-prioridad-incidencia.pipe.ts | Validación completa y normalización del cuerpo. |
| Modificar | backend/src/incidents/incidents.service.ts | Asignar y consultar historial interno; inicialización y serialización segura. |
| Modificar | backend/src/incidents/incidents.controller.ts | PATCH /incidents/:id/priority y Swagger de prioridades. |
| Crear | backend/test/incidents/pipes/cambiar-prioridad-incidencia.pipe.spec.ts | Entradas válidas, inválidas y campos de servidor. |
| Crear | backend/test/incidents/services/cambiar-prioridad-incidencia.service.spec.ts | Asignaciones, historial, fallos, copias y compatibilidad. |
| Crear al implementar | backend/docs/spec/endpoint/patch-incidents-id-priority/README.md | Contrato efectivo y deuda. |
| Actualizar al implementar | backend/docs/spec/endpoint/README.md y fichas post-incidents, get-incidents-id, patch-incidents-id-status | Descubrimiento y valores de prioridad actuales. |
| Actualizar | Esta especificación y este plan | Requisitos, ejecución y confirmación reales. |

## Preparación

- [x] Leer instrucciones y plantillas; comprobar rama y checkout limpio al iniciar esta fase.
- [x] Consultar las cuatro issues y comentarios; contrastar con DBML, SQL y módulo actual.
- [x] Listar catálogo y revisar contratos existentes; confirmar historial y estado validated con el usuario.
- [x] Revisar la propuesta detallada con el usuario antes de implementar.
- [x] Consultar Context7 para Prisma/Nest y reglas PostgreSQL antes de modificar modelos o APIs; confirmar versiones instaladas.
- [x] Ejecutar npm test desde backend/ como base de esta fase y registrar aquí el resultado; no heredar las 95 pruebas de #47 como verificación actual.

## Tarea 1: entrada, modelos y asignación con historial

**Interfaces:** CambiarPrioridadIncidenciaInput { priority: Incident['priority']; cause: string; civicId: string }; CambiarPrioridadIncidenciaPipe.transform(entrada: unknown): Promise<CambiarPrioridadIncidenciaInput>; IncidentsService.cambiarPrioridad(idIncidencia: string, entrada: CambiarPrioridadIncidenciaInput): Incident; consultarCambiosPrioridad(idIncidencia: string): CambioPrioridadModel[].

**Criterios cubiertos:** 1, 2, 3, 4 y 6.

- [x] Escribir las unitarias del pipe para low/medium/high, trim y UUID en mayúsculas; rechazar omisión/null, arrays, tipos incorrectos, valores ajenos, motivo vacío y campos de servidor.
- [x] Escribir unitarias del servicio preparando una incidencia mediante create y cambiarEstado a validated: asignar cada prioridad con actor distinto del dueño; comprobar un registro Prisma con uuid/fecha, esManual=true y motivo normalizado.
- [x] Añadir casos reported/rejected con 409, recurso ausente con 404, primera asignación low, decisiones posteriores del mismo valor, copias y fechas independientes, fallo al construir la respuesta y dos intentos secuenciales/concurrentes sin perder registros.
- [x] Ejecutar npm test -- test/incidents/pipes/cambiar-prioridad-incidencia.pipe.spec.ts test/incidents/services/cambiar-prioridad-incidencia.service.spec.ts y registrar los fallos por comportamiento ausente antes del código.
- [x] Ampliar enum y modelo CambioPrioridad con los campos exactos de la especificación; actualizar DBML solo en priority_changes. Generar tipos con node node_modules/prisma/build/index.js generate --config prisma7.config.ts y validar con node node_modules/prisma/build/index.js validate --config prisma7.config.ts.
- [x] Inicializar cambiosPrioridad=[] en create y reutilizar obtenerIncidencia para UUID sin distinguir mayúsculas. Construir cambio, agregado y respuesta antes de publicar; no await entre comprobación y sustitución.
- [x] Implementar el pipe y las copias internas sin agregar rutas de historial ni modelos de usuario.
- [x] Repetir las dos suites y comprobar que pasan; registrar evidencia aquí.

## Tarea 2: endpoint y compatibilidad con consultas y estados

**Interfaces:** PATCH /incidents/:id/priority mediante cambiarPrioridad del controlador; ParseUUIDPipe en ruta y pipe de la tarea 1 en cuerpo. 200 Incident, 400 inválido, 404 ausente, 409 estado distinto de validated.

**Criterios cubiertos:** 5 y 7; integración de interfaces de la tarea 1 mediante unitarias y lectura del controlador, sin pruebas HTTP.

- [x] Añadir a la suite del servicio la conservación del historial de #47, propietario, datos originales y campos de respuesta; comprobar findOne con nueva prioridad y listado con exactamente id/title/status/createdAt.
- [x] Ejecutar los nuevos casos antes de ajustar los consumidores internos y registrar el resultado; si ya pasan por la serialización existente, documentarlo sin modificarla innecesariamente.
- [x] Añadir Patch y Swagger: cuerpo exclusivo priority/cause/civicId, enum low/medium/high en respuestas completas, límites reales y deuda visible. POST sigue generando low.
- [x] Crear ficha de prioridad y actualizar catálogo y fichas afectadas con enlaces a especificación/plan/código; no activar propuestas todavía pendientes.
- [x] Revisar tipos e imports, errores y coexistencia de ambos historiales. Ejecutar npm test completo y registrar resultados.

## Deuda técnica DEUDA-28-01: identidad y permisos

- Estado: abierta; continuidad de civicId declarado del prototipo, sin identidad o permisos verificados.
- Riesgo: suplantación del actor y asignación de prioridad por un solicitante sin acreditar rol de operador/técnico/responsable. user_id es un mapeo declarativo del actor, no una vinculación real a un usuario.
- No modificar ni comparar el dueño para deducir permisos; no simular respuestas 401/403.
- Resolución: obtener identidad de sesión/token verificada, comprobar usuario, rol y autorización y registrar actor derivado en servidor. Pruebas de sesión ausente, rol incorrecto y suplantación cuando exista esa infraestructura.
- Cierre: peticiones sin identidad y permiso no modifican prioridad ni historial; el cliente no puede elegir al actor de auditoría.
- Persistencia pendiente: prioridad e historial se pierden al reiniciar. Una futura DB requiere transacción real; Prisma genera tipos y no aporta persistencia.
- Esta deuda permanece abierta aunque se implemente el prototipo y aunque se resuelva por separado la de #47. Mantenerla visible en Swagger y ficha del endpoint.

## Comprobaciones finales

Comandos desde backend/, salvo git diff --check desde raíz. Resultados de esta fase, sin reutilizar comprobaciones históricas.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tipos y esquema | Prisma generate y validate con prisma7.config.ts | Correctos: Prisma 7.10.1, sin conexión ni migraciones |
| Unitarias | npm test | 11 suites y 142 pruebas correctas |
| Compilación | npm run build | Correcta |
| Lint | npm run lint | Correcto, con dos avisos previos en create-incident.pipe.ts:44 |
| Documentación | Enlaces locales, marcadores y git diff --check | Correcta: enlaces locales de 7 documentos y git diff --check sin errores |

- [x] Cerrar revisión de código final y comprobación documental.
- [x] Confirmar catálogo coherente con la implementación real y deuda abierta.
- [x] Confirmar que no se alteran consumidores, dependencias, credenciales o servicios fuera del alcance.

## Ejecución y decisiones

- Usuario autorizó ejecutar el plan y pidió etiquetas de prioridad en español. Interpretación aplicada: Baja/Media/Alta en Swagger, mensajes y documentación; conservar low/medium/high como valores públicos y Prisma para compatibilidad. No modificar frontend ni añadir campos de respuesta ajenos al contrato.
- Base actual verificada: npm test, 9 suites y 95 pruebas correctas.
- Context7: consultadas relaciones/mapeos Prisma y validación por pipes y Swagger NestJS. Revisadas reglas de tipos PostgreSQL: UUID, Boolean, texto y Timestamptz(3).
- Rojo observado antes de implementar: 34 casos del pipe fallaron por validación pendiente y 13 del servicio por métodos ausentes.
- Verde: 47 nuevas pruebas correctas; suite completa 142 pruebas en 11 archivos. Compilación correcta y lint sin errores; dos avisos previos de no-misused-spread sobre el título en create-incident.pipe.ts:44. Vite conserva su aviso previo sobre vite-tsconfig-paths.
- Prisma generate y validate correctos con dependencias instaladas, sin DB ni migraciones. Formato del cliente generado normalizado mecánicamente para eliminar espacios finales y el símbolo del comentario que introduce Prisma, manteniendo el estilo versionado; sin cambios semánticos manuales.
- Compatibilidad: reutilizar la serialización explícita existente evita filtrar ambos historiales; las unitarias nuevas verifican conservación del historial de estado, propietario, imágenes, ubicación y createdAt, y los cuatro campos exactos del listado.
- Deuda DEUDA-28-01 permanece abierta, igual que la persistencia en memoria; visible en Swagger y ficha.
- Revisión final independiente: sin hallazgos funcionales accionables. Corregida la tabla de comprobaciones del plan para reflejar las ejecuciones reales. Enlaces locales de 7 documentos comprobados, sin destinos ausentes; git diff --check correcto.

## Confirmación de implementación

- Estado final: implementado y verificado; revisión final sin hallazgos pendientes.
- Fecha: 2026-10-23.
- Resultado: PATCH de prioridad manual solo en validated; historial tipado con motivo, actor declarado y esManual=true; etiquetas españolas.

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| 1: prioridades y estado | Tres prioridades, bloqueo reported/rejected | Cumplido |
| 2: historial | Registro exacto, UUID/fecha servidor, motivo y actor | Cumplido |
| 3: errores y atomicidad | Pipe, 404/409, motivo vacío y fallo de serialización | Cumplido |
| 4: reevaluación | Mismo valor admitido y dos peticiones sin perder registros | Cumplido |
| 5: compatibilidad | Datos y #47 conservados; consulta individual y listado #27 | Cumplido |
| 6: aislamiento y valores iniciales | Copias y fechas independientes; low inicial sin historial | Cumplido |
| 7: modelos/documentación | Prisma, DBML, Swagger y fichas; enlaces comprobados y revisión final | Cumplido |

- Sin npm install, cambios de dependencias, frontend, DB, migraciones, e2e/integración, commits ni push.
- Limitaciones: actor sin autenticar y sin rol verificado; almacenamiento en memoria, no auditoría duradera. No se implementó IA ni se atribuye low inicial a ella.
