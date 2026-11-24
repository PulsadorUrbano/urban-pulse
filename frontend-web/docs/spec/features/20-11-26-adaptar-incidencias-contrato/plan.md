# 2026-11-20 — Plan de implementación para adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA.** GPT-6. Identificador exacto de la sesión no disponible.
- **Objetivo.** Preparar el listado, el detalle y las asignaciones para la #185 en una primera PR web. Completar la #192 en una segunda PR con las funciones que usan el contrato nuevo.
- **Arquitectura.** Reutilizar los tipos, servicios, hooks, vistas y modo demo del flujo existente. El detalle conserva como fuente de verdad la incidencia devuelta por el backend al guardar.
- **Herramientas.** React 19, Vite 8, TypeScript 5, Tailwind CSS 3 y Vitest 5.
- **Especificación.** [Contrato y criterios de aceptación](./spec.md).
- **Ramas de trabajo.** `fix/compatibilidad-incidencias-web` para la primera PR y `feature/completar-asignaciones-web` para la segunda. El trabajo local de la segunda parte provisionalmente de la #201 (`3792cc2`). Antes de publicar, trasladar sus commits al `origin/dev` que incluya la #185.
- **Estado.** Primera PR abierta como #201. Reasignación de reabiertas y comentarios opcionales implementados en la segunda rama. Queda pendiente la prueba del flujo con el backend.

## Restricciones generales

- Confinar los cambios a `frontend-web/` y usar el contrato de la [PR #185](https://github.com/PulsadorUrbano/urban-pulse/pull/185) y la [issue #192](https://github.com/PulsadorUrbano/urban-pulse/issues/192). Mantener TypeScript estricto, Tailwind, validación de JSON y autenticación con los servicios existentes.
- El backend real autoriza y persiste los cambios. El modo demo se mantiene como opción de desarrollo y debe respetar las mismas reglas de selección y estado.
- El dashboard global queda disponible para `admin` y `administrative`. El listado por departamento, las acciones de otros roles y la pantalla de historial se retoman cuando se amplíe el panel.
- Las dos PRs web apuntan a `dev`. La primera tiene que funcionar con el backend actual y con la #185. Los cambios de móvil y la revisión de la #185 se coordinan con sus responsables.
- Artina hará cada commit. Al terminar cada bloque, revisar su diff y sus pruebas, indicar qué archivos incluye y avisar con el mensaje propuesto. Continuar con el siguiente bloque tras confirmar el commit.

## Orden de integración

1. **PR web de compatibilidad.** Integrar la lectura de los estados nuevos, el acceso provisional al listado y la selección obligatoria de departamento y equipo. La petición de guardado conserva el cuerpo que admite `dev`. Referenciar la #192 como trabajo en curso.
2. **PR #185.** Integrar el backend cuando estén cubiertas las adaptaciones necesarias de ambos clientes. Una vez en `dev`, comprobar que la primera PR web carga y asigna incidencias con el backend actualizado.
3. **PR web para completar las asignaciones.** Abrirla sobre el `dev` que ya incluye la #185 con la reasignación de reabiertas y «Comentarios adicionales». Cerrar la #192 con esta PR cuando sus criterios estén verificados.

## Focos de revisión

- Una página que incluye `in_progress`, `resolved`, `reopened` o `closed` se puede cargar y abrir. El detalle muestra la prioridad guardada para incidencias que ya han pasado por validación.
- El departamento y el equipo son obligatorios en la selección final. El técnico puede quedar sin asignar. Los cambios de departamento o equipo limpian los desplegables dependientes.
- Una incidencia reabierta puede volver al equipo actual. El PATCH incluye al menos un identificador de asignación y el detalle refleja el estado que devuelve el servidor.
- Los comentarios se envían como `cause` solo cuando contienen texto. Tras un error se conserva el texto para corregir o reintentar. Tras guardar correctamente, se limpia el campo.
- El listado global se solicita con el JWT de una sesión administrativa. Un perfil municipal que queda fuera de ese acceso ve un aviso en su lugar.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `frontend-web/src/types/incident.ts`, `frontend-web/src/services/incident.service.ts`, `frontend-web/src/constants/incident-labels.ts` | Estados admitidos en listado, detalle y respuestas de guardado, con etiquetas en español |
| Modificar | `frontend-web/src/App.tsx`, `frontend-web/src/components/incident-list-view.tsx`, `frontend-web/src/components/incident-validation-view.tsx` | Acceso provisional al listado, prioridad visible y acciones permitidas en el detalle |
| Modificar | `frontend-web/src/types/user.ts` | Criterio compartido para los roles de administración |
| Modificar | `frontend-web/src/hooks/use-incident-assignment.ts`, `frontend-web/src/components/incident-assignment-view.tsx`, `frontend-web/src/types/assignment.ts` | Selección completa, reasignación de reabiertas y comentarios opcionales |
| Adaptar | `frontend-web/src/mocks/assignment-mock.ts` | Mismas reglas de selección y asignación en la demostración |
| Reutilizar | `frontend-web/src/services/assignment.service.ts` | Catálogo, PATCH con JWT, validación de la respuesta y gestión de errores |
| Actualizar | `frontend-web/src/__tests__/services/incident.service.test.ts`, `frontend-web/src/__tests__/services/assignment.service.test.ts`, `frontend-web/src/__tests__/hooks/use-incident-assignment.test.ts` | Cubrir cambios de contrato y reglas de selección |
| Crear o actualizar | `frontend-web/src/__tests__/components/incident-list-view.test.tsx`, `frontend-web/src/__tests__/components/incident-validation-view.test.tsx` | Cubrir la carga del listado según el rol y las acciones visibles en el detalle |
| Crear | `frontend-web/src/__tests__/components/incident-assignment-view.test.tsx`, `frontend-web/src/__tests__/mocks/assignment-mock.test.ts` | Comprobar las opciones del formulario, el rechazo de asignaciones incompletas y la retirada del técnico en la demo |
| Actualizar | Esta carpeta y la nota de sesión | Contrato, ejecución y resultados de la verificación |

## Preparación

- [x] Revisar la estructura de documentación del frontend web, los planes existentes, la #192 y los contratos de listado, detalle y asignaciones de la #185.
- [x] Confirmar el plan y redactar `spec.md`.
- [x] Revisar los criterios de aceptación de la especificación antes de cambiar código.
- [x] Comprobar la rama `fix/compatibilidad-incidencias-web` y su base `1f21263` en `dev`. La #198 seguía abierta y su selector no estaba en la base.
- [x] Registrar la línea de partida. Pasaron `npm run typecheck`, `npm run lint`, `npm run test` (60 pruebas) y `npm run build`.

## Tarea 1. Aceptar los estados nuevos en el panel (primera PR)

- [x] Extender `IncidentStatus` y la validación de las respuestas para incluir `in_progress`, `resolved`, `reopened` y `closed`.
- [x] Añadir «En progreso», «Resuelta», «Reabierta» y «Cerrada». Mostrar la prioridad de una incidencia tramitada según su estado y respuesta, con independencia de si la asignación es editable.
- [x] Verificar con pruebas unitarias una página con estados anteriores y nuevos, la carga del detalle para los cuatro estados nuevos y el estado y la prioridad visibles de una incidencia resuelta.
- [ ] Coordinar con Alejandro los estados del selector al integrar la #198. El selector sigue en esa rama.

**Verificación del bloque.** Las seis pruebas nuevas reprodujeron los fallos antes del cambio. Después pasaron las 66 pruebas, el typecheck, el lint, la compilación y `git diff --check`. La comprobación se hizo con respuestas simuladas y renderizado del detalle. La prueba manual del flujo completo permanece pendiente.

## Tarea 2. Aplicar el acceso provisional (primera PR)

- [x] Cargar el listado global solo para `admin` y `administrative`. Mostrar «El listado de incidencias está disponible para administración» al resto de perfiles municipales.
- [x] Comprobar que el cargador recibe el JWT de administración y que el resto de perfiles ve el aviso sin iniciar la petición global, mostrar datos ni ofrecer paginación. Limitar el formulario de validación, descarte y prioridad a sesiones administrativas y mantener el JWT de los demás perfiles al consultar su detalle permitido.

**Verificación del bloque.** Cinco de los siete casos nuevos fallaron antes del cambio. Después pasaron las 73 pruebas, el typecheck, el lint, la compilación y `git diff --check`. Las pruebas de componentes usan renderizado estático y sustituyen los hooks. Sigue pendiente el recorrido con el backend de la #185.

## Tarea 3. Exigir departamento y equipo al guardar (primera PR)

- [x] Reutilizar la selección jerárquica. Mostrar «Selecciona departamento» y «Selecciona equipo», y conservar la opción «Sin asignar» para el técnico.
- [x] Deshabilitar el guardado hasta que departamento y equipo formen una selección válida. Si hay técnico, comprobar que pertenece al equipo elegido.
- [x] Ajustar la demo a la misma regla de selección. Comprobar selección inicial incompleta, cambio de departamento sin equipo, equipo ajeno, limpieza del técnico al cambiar de equipo y retirada del técnico. La demo conserva el estado del contrato vigente en `dev`.

**Verificación del bloque.** Las tres pruebas nuevas reprodujeron los fallos de selección, demo y formulario antes del cambio. Después pasaron las 76 pruebas, el typecheck, el lint, la compilación y `git diff --check`. Queda pendiente probar el guardado con las dos versiones del backend previstas en el plan.

## Tarea 4. Reasignar una incidencia reabierta (segunda PR)

- [x] Permitir guardar en `validated`, `assigned` y `reopened`. Si una reabierta se devuelve al mismo equipo sin cambios de identificadores, enviar su `teamId` para que el backend ejecute la transición.
- [x] Conservar la respuesta del PATCH como origen del detalle y reflejar en la demo el estado `assigned`. Comprobar el guardado en el mismo equipo, la respuesta del servicio y el tratamiento de los errores de permisos y conflicto con respuestas simuladas.

**Verificación del bloque.** Cinco casos fallaron antes de implementar el cambio. Después pasaron las 81 pruebas en 9 archivos, el typecheck, el lint, la compilación y `git diff --check`. Se comprobó el formulario de una reabierta, el acceso por rol, el cuerpo con `teamId`, la respuesta `assigned` y los errores 403 y 409. Docker estaba inactivo, por lo que la prueba del flujo con el backend de la #185 sigue pendiente.

## Tarea 5. Añadir «Comentarios adicionales» (segunda PR)

- [x] Añadir el campo opcional debajo de los desplegables y dar soporte a `cause?: string` en `AssignmentPatch`.
- [x] Enviar el texto recortado junto con la asignación. Omitir `cause` si está vacío o solo contiene espacios. Mantener el requisito de al menos un identificador de asignación en el PATCH.
- [x] Mantener el borrador ante un rechazo del guardado y limpiarlo tras guardar correctamente. Conservar la justificación obligatoria del cambio de estado y de prioridad en sus propias peticiones.

**Verificación del bloque.** Cuatro comprobaciones fallaron antes del cambio. Después pasaron las 86 pruebas en 9 archivos, el typecheck, el lint y la compilación. Las pruebas cubren el campo opcional, el cuerpo con y sin `cause` y el rechazo de un parche con solo comentarios en la web y la demo. Una comprobación del hook con respuestas simuladas confirmó que conserva el texto ante 400, 403 y 409 y lo limpia cuando el guardado se confirma. La prueba con el backend de la #185 sigue pendiente.

## Puntos de commit

Cada bloque incluye sus pruebas pertinentes y se verifica antes de avisar. La primera PR comparte el plan y la especificación con la segunda.

| PR | Punto | Mensaje propuesto |
| --- | --- | --- |
| Primera | Plan y spec revisados | `docs: definir la adaptación web al contrato de incidencias` |
| Primera | Tarea 1 | `fix: admitir los estados del ciclo de incidencias en la web` |
| Primera | Tarea 2 | `fix: limitar el acceso al listado global de incidencias` |
| Primera | Tarea 3 | `fix: exigir departamento y equipo al guardar asignaciones` |
| Primera | Verificación de compatibilidad | `docs: registrar la verificación de compatibilidad web` |
| Segunda | Tarea 4 | `feat: permitir reasignar incidencias reabiertas` |
| Segunda | Tarea 5 | `feat: añadir comentarios opcionales a las asignaciones` |
| Segunda | Verificación final | `docs: registrar la verificación de las asignaciones web` |

## Comprobaciones finales

Ejecutar en cada PR desde `frontend-web/` salvo la comprobación de Git.

| Comprobación | Comando o recorrido | Resultado real |
| --- | --- | --- |
| Pruebas unitarias | `npm run test` | 76 en la #201 y 86 en la segunda rama, en 9 archivos |
| Tipos | `npm run typecheck` | Correcto en ambas ramas |
| Lint | `npm run lint` | Correcto en ambas ramas |
| Compilación | `npm run build` | Correcta en ambas ramas |
| Diff desde la base de cada rama | `git diff --check origin/dev...HEAD` en la #201 y `git diff --check 3792cc2...HEAD` en la segunda rama | Correcto. El diff de la segunda rama contiene solo cambios de `frontend-web/` |
| Cuerpo de asignación de la #201 | Ejecutar los validadores de `dev` y la #185 con un doble del validador UUID | Ambos aceptan los cuerpos para la asignación inicial sin técnico, la retirada del técnico y el cambio de departamento y equipo |
| Reasignación y comentarios de la segunda rama | Ejecutar el validador y el servicio de asignación de la #185 (`bde5326`) con dobles de NestJS y Prisma | La asignación inicial y la reasignación al mismo equipo pasan a `assigned`. El historial recibe el comentario recortado o `null`. El validador rechaza un cuerpo que solo contiene `cause` |
| Primera PR con el backend de `dev` | Cargar el listado, abrir el detalle, guardar una asignación con departamento y equipo y comprobar el aviso al resto de perfiles | Pendiente. El motor de Docker y el backend local estaban inactivos |
| Primera PR con el backend de la #185 | Cargar y abrir incidencias en los estados nuevos, comprobar la prioridad y guardar una asignación con el cuerpo vigente | Pendiente. La #185 sigue abierta y falta probar el flujo en un entorno con su backend |
| Segunda PR con la #185 integrada | Reasignar una reabierta al mismo equipo y guardar con y sin comentario | Pendiente. Docker y el backend local estaban inactivos |

- [x] Revisar el diff de la primera PR y registrar las comprobaciones de sus criterios en el plan. Los cambios están confinados a `frontend-web/`.
- [x] Revisar los commits de la segunda rama y contrastar sus peticiones con el contrato de la #185.
- [ ] Trasladar los commits de la segunda rama al `dev` actualizado y repetir las comprobaciones antes de publicarla.
- [ ] Si la #198 está presente, comprobar que se puede filtrar por un estado nuevo sin romper la paginación existente.

## Confirmación de implementación

- **Estado final.** Ambas fases implementadas con prueba real pendiente. La segunda sigue en su rama local.
- **Fecha de revisión.** 2026-11-20.
- **Resultado entregado.** La #201 adapta la lectura de los estados, la prioridad, el acceso al listado y la selección de asignación. La segunda rama habilita la reasignación de reabiertas y el campo «Comentarios adicionales».
- **Evidencia y comprobaciones.** Las dos ramas pasaron las pruebas del frontend y se contrastaron con el contrato. La segunda también se comprobó ejecutando la lógica de asignación e historial de la #185 con dobles, y verificando el borrador ante rechazos simulados.
- **Decisiones y desviaciones.** La compatibilidad web entra antes de la #185 y las funciones del contrato nuevo entran después, con commits individuales a cargo de Artina. Se han respetado los nombres de rama indicados por Artina.
- **Limitaciones y pendientes.** Traslado de la segunda rama al `dev` que incluya la #185 y prueba del flujo con el backend. El selector de estados se coordinará al integrar la #198.
