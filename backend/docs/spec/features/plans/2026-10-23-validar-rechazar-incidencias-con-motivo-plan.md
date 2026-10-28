# 2026-10-23 — Plan para validar o rechazar incidencias con motivo

- Objetivo: transicionar una incidencia reported a validated o rejected con motivo obligatorio y registro de cambio de estado.
- Arquitectura propuesta: reutilizar el Map; añadir historial tipado por Prisma al agregado y publicar estado e historial con una única sustitución síncrona.
- Herramientas: NestJS 12, TypeScript ESM, Prisma 7.10.1, Swagger y Vitest existentes.
- Especificación: [Contrato y criterios de #47](../specs/2026-10-23-validar-rechazar-incidencias-con-motivo-spec.md).
- Rama: feature/registro-incidencia-backend.
- Estado: ejecución autorizada por el usuario; implementación, comprobaciones y revisión final completadas.

## Restricciones generales

- Mantener memoria del proceso e imágenes locales, sin activar base de datos ni migraciones.
- Mantener al propietario original: civicId del cuerpo identifica al actor declarado de la acción, no reemplaza al ciudadano propietario de la incidencia.
- Permitir únicamente reported -> validated o reported -> rejected. Motivo obligatorio, normalizado con trim y no vacío. Repeticiones o nuevas transiciones desde estados finales: 409 sin modificar estado ni historial.
- Reutilizar modelos existentes y generar el tipo CambioEstado mapeado a status_changes. No crear usuarios, permisos o claves foráneas de identidad ficticios.
- Programar y documentar en español, con contratos HTTP e imports .js compatibles con el proyecto.
- No ejecutar npm install, npm i ni pnpm install. Sin dependencias nuevas, e2e, integración, conexiones frontend, commits ni push.
- Registrar ejecución y confirmación únicamente en este mismo plan, sin informes ni archivos de tareas adicionales.

## Deuda técnica DEUDA-47-01: identidad y rol del actor

- Estado: aceptada temporalmente por el usuario el 2026-10-23; abierta y no resuelta.
- Solución provisional: recibir civicId en la acción y validar únicamente su formato UUID. Registrar ese valor como actorId de CambioEstado, mapeado a user_id de status_changes, sin afirmar que exista un usuario correspondiente ni que esté autenticado.
- Riesgo: cualquier solicitante puede declarar el civicId de otra persona y efectuar una validación o rechazo sin demostrar identidad ni rol de operador. La auditoría identifica al actor declarado por el cliente, no una autoría verificada.
- Regla de implementación: no comparar el civicId del actor con el del propietario para deducir permisos; no modificar al propietario; no simular autenticación ni controles 401/403 inexistentes.
- Trabajo pendiente para resolverla: incorporar identidad de sesión/token verificada en servidor, vincularla al usuario real, comprobar rol y permisos de operador y usar esa identidad al registrar el cambio. El cliente dejará de elegir el actor de auditoría.
- Criterios de cierre: sin sesión válida o sin permiso no cambia estado ni se añade historial; un civicId manipulado no permite suplantar al actor. Añadir unitarias de ausencia de credenciales, rol incorrecto y suplantación cuando exista esa infraestructura.
- Relación con DEUDA-27-01: compartir una futura solución de identidad no cierra automáticamente esta deuda de autorización de escritura.
- Límite adicional de esta fase: estado e historial se perderán al reiniciar. Al activar persistencia, guardar ambos dentro de una transacción real; generar modelos Prisma no proporciona auditoría duradera.

La implementación del prototipo no marca esta deuda como resuelta. Su estado debe permanecer visible en Swagger, ficha del endpoint y confirmación de este plan.

## Focos de revisión

| Riesgo | Comprobación prevista |
| --- | --- |
| Motivo vacío o actor inválido | Pipe rechaza omisión, null, tipos incorrectos, UUID inválido y espacios; no llama a la operación de cambio. |
| Confundir actor con propietario | Validar con civicId distinto al del propietario; conservar el propietario y registrar al actor declarado. |
| Cambio sin historial o duplicado | Verificar una única publicación de estado e historial, sin cambios ante error, conflicto o segundo intento. |
| Filtrar información de auditoría | Registro, consulta individual y listado #27 no devuelven historial, motivo ni actor interno. |
| Mutación externa | Las copias del historial no permiten modificar motivos, actores o fechas almacenados. |

## Mapa de archivos

Rutas desde la raíz del repositorio; implementación verificada en esta rama.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | backend/prisma/schema.prisma | Ampliar IncidentStatus y definir CambioEstado con relación a Incident y mapeo status_changes. |
| Regenerar | backend/src/generated/prisma/ | Tipos derivados mediante Prisma instalado, sin conexión DB. |
| Modificar | database/diagram.dbml | Alinear la obligatoriedad del motivo si se formaliza la referencia. |
| Modificar | backend/src/incidents/incident.ts | Tipos de entrada y estado actual; historial interno en StoredIncident. |
| Crear | backend/src/incidents/cambiar-estado-incidencia.pipe.ts | Validar status, cause y civicId; rechazar campos desconocidos. |
| Modificar | backend/src/incidents/incidents.service.ts | Comprobar transición y publicar el agregado; serializar sin historial. |
| Modificar | backend/src/incidents/incidents.controller.ts | PATCH /incidents/:id/status y Swagger; actualizar estados de lectura. |
| Crear | backend/test/incidents/services/cambiar-estado-incidencia.service.spec.ts | Transiciones, historial, actor, conflictos y publicación conjunta. |
| Crear | backend/test/incidents/pipes/cambiar-estado-incidencia.pipe.spec.ts | Validación del cuerpo sin HTTP. |
| Cubrir sin modificar | backend/test/incidents/services/listar-incidencias.service.spec.ts | La nueva suite de cambio de estado comprueba también el listado existente sin duplicar casos. |
| Crear | backend/docs/spec/endpoint/patch-incidents-id-status/README.md | Contrato, errores y deuda de autorización. |
| Actualizar | Especificación, este plan y catálogo de endpoints | Requisitos, resultados reales y confirmación sin documentos adicionales. |

## Preparación

- [x] Leer la plantilla y documentar la decisión del usuario sobre civicId y su deuda técnica.
- [x] Revisar el contrato propuesto con el usuario antes de implementar.
- [x] Comprobar estado de Git, catálogo y archivos afectados antes de ejecutar el plan.
- [x] Consultar Context7 para las APIs que se modifiquen y revisar las reglas PostgreSQL antes de cambiar modelos o DBML.
- [x] Registrar el resultado inicial de las comprobaciones pertinentes, sin heredar resultados de #27.

## Tarea 1: modelos, validación y cambio atómico en memoria

**Interfaces propuestas:** CambioEstado con incidenciaId, actorId, nuevoEstado, motivo y fechaCreacion; entrada con status, cause y civicId. cambiarEstado(idIncidencia, entrada): Incident y consultarCambiosEstado(idIncidencia): copias del historial para uso interno. No añadir una ruta HTTP de trazabilidad.

**Criterios cubiertos:** 1, 2, 3 y 4 de la especificación.

- [x] Escribir unitarias para ambas transiciones con motivo normalizado, actor distinto del propietario y un único registro con UUID/fecha de servidor.
- [x] Escribir casos de cuerpo inválido, actor inválido, estado no permitido, recurso ausente y estado final; comprobar que no hay publicaciones parciales ni registros duplicados.
- [x] Ejecutar las unitarias pertinentes antes del código y registrar los fallos observados.
- [x] Ampliar los tipos generados, añadir el pipe y construir el agregado nuevo antes de una única sustitución en el Map, sin await entre comprobación y publicación.
- [x] Verificar repetición, dos intentos sobre el mismo estado y copia defensiva del historial; confirmar que el propietario no cambia.

## Tarea 2: endpoint, compatibilidad y deuda visible

**Interfaces propuestas:** PATCH /incidents/:id/status recibe JSON; 200 con Incident sin historial, 400 para entrada inválida, 404 si no existe y 409 si ya no está reported.

**Criterios cubiertos:** 5 y 6 de la especificación.

- [x] Añadir la ruta y aplicar la validación, reutilizando el servicio existente.
- [x] Ajustar tipos y Swagger de registro/lectura/listado para los estados realmente implementados; POST sigue creando reported.
- [x] Comprobar con unitarias que consultar o listar muestra el nuevo estado sin exponer motivo, historial ni actor.
- [x] Documentar la ficha, actualizar el índice y mantener DEUDA-47-01 abierta, sin presentar al solicitante como operador autenticado.

## Comprobaciones finales

| Comprobación | Comando desde backend/ salvo indicación | Resultado real |
| --- | --- | --- |
| Unitarias | npm test | 9 suites y 95 pruebas correctas (58 iniciales y 37 nuevas) |
| Compilación | npm run build | Correcta |
| Lint | npm run lint | Correcto, con dos avisos previos en create-incident.pipe.ts:44 |
| Revisión documental, desde raíz | git diff --check y comprobación de enlaces | Correcta; enlaces locales de 7 documentos comprobados y git diff --check sin errores |

- [x] Revisar todos los criterios y la compatibilidad con #27.
- [x] Registrar decisiones y desviaciones aquí; no crear informes ni notas separadas.
- [x] Confirmar que no se alteraron consumidores, credenciales, dependencias o servicios fuera de alcance.

## Ejecución y decisiones

- Aprobación: el usuario solicitó ejecutar el plan el 2026-10-23. Se conserva el checkout feature/registro-incidencia-backend, basado en d14df19; sin cambios previos de producto.
- Context7: documentación oficial de NestJS sobre pipes y validación; Prisma 7 sobre relaciones y mapeo de campos/tablas. Revisadas las reglas PostgreSQL para UUID, texto y fecha con zona horaria.
- Base antes de implementar: npm test correcto, 7 suites y 58 pruebas.
- Rojo: 8 pruebas del servicio fallaron por operaciones aún inexistentes; el pipe inicialmente faltaba y, con la interfaz mínima, sus 28 pruebas fallaron por validación pendiente. Verde: ambas suites correctas tras implementar; se añadió además un caso de fallo de serialización, hasta 37 pruebas nuevas.
- Incidencia operativa: el primer comando npm test se lanzó por error desde la raíz, sin package.json; se corrigió ejecutándolo desde backend/. No se cambiaron dependencias.
- Estado e historial se construyen juntos, incluida la respuesta, antes de una única publicación sin await. Las pruebas comprueban motivo inválido, conflicto, fallo previo a publicar y dos intentos concurrentes en la misma instancia.
- Decisión: mantener archivos actuales de incidencias en su ubicación; las nuevas unitarias siguen la organización por rol. La compatibilidad del listado se prueba en la suite de cambio de estado, sin duplicar pruebas en otra suite.
- Generación: Prisma 7.10.1 generate y validate correctos, sin conexión ni migraciones. Normalización mecánica de espacios finales y comentario con símbolo introducido por el generador, conservando el formato ya versionado; sin cambios semánticos manuales del cliente generado.
- Avisos: Vite informa de la futura simplificación de vite-tsconfig-paths; lint señala dos avisos existentes de expansión de cadena Unicode en create-incident.pipe.ts. No se modifican herramientas ni validación del título en esta tarea.
- Revisión final de código: revisor independiente sin hallazgos materiales pendientes; revisados contrato, atomicidad en memoria, separación de actor/propietario, copias defensivas y exclusión del historial público.
- Precisión de revisión: JSON es el formato documentado de uso. La exclusividad exigida se refiere a los campos del cuerpo; no se añade un control de Content-Type ni un nuevo 415. Los objetos equivalentes que admita el parser existente siguen sujetos al mismo pipe. El revisor retiró la observación al contrastarla con el alcance aprobado.
- Comprobación documental final: enlaces locales de 7 documentos correctos y git diff --check correcto usando la configuración habitual del repositorio. Un intento con core.autocrlf=false interpretó CRLF existentes como cambios y se descartó esa configuración de comprobación.
- Confirmación de alcance: diff limitado al módulo de incidencias, modelos y tipos generados, motivo obligatorio en DBML, unitarias y documentación afectada. Sin cambios de dependencias, configuración de servicios o consumidores.

## Confirmación de implementación

- Estado final de la funcionalidad: implementada; 95 pruebas unitarias, compilación, lint y esquema Prisma correctos. Revisión final sin hallazgos pendientes.
- Fecha: 2026-10-23.
- Evidencia por criterios: 1 y 2, ambas transiciones y auditoría tipada; 3, ausencia de publicaciones parciales ante motivo inválido o fallo de serialización; 4, conflictos, repetición y dos intentos concurrentes; 5, propietario/datos conservados y respuestas sin historial; 6, deuda explícita en Swagger, especificación, ficha y este plan.
- DEUDA-47-01 sigue abierta: actor civicId declarado sin autenticación ni autorización; memoria perdida al reiniciar. La implementación del prototipo no resuelve esas limitaciones.
- No se han conectado frontend o base de datos, instalado dependencias, ejecutado e2e/integración, creado commits ni hecho push.
