# 2026-11-20 — Plan de implementación para adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA.** GPT-6. Identificador exacto de la sesión no disponible.
- **Objetivo.** Preparar el listado, el detalle y las asignaciones para la #185 en una primera PR web. Completar la #192 en una segunda PR con las funciones que usan el contrato nuevo.
- **Arquitectura.** Reutilizar los tipos, servicios, hooks, vistas y modo demo del flujo existente. El detalle conserva como fuente de verdad la incidencia devuelta por el backend al guardar.
- **Herramientas.** React 19, Vite 8, TypeScript 5, Tailwind CSS 3 y Vitest 5.
- **Especificación.** [Contrato y criterios de aceptación](./spec.md).
- **Ramas propuestas.** `fix/compatibilidad-incidencias-web` para la primera PR y `feature/completar-asignaciones-web` para la segunda. Crear cada rama desde el `origin/dev` vigente cuando empiece su fase. Borrador preparado en la copia local de `dev`.
- **Estado.** Primera PR en curso. Los estados nuevos y el acceso provisional al listado están implementados y comprobados con pruebas unitarias.

## Restricciones generales

- Confinar los cambios a `frontend-web/` y usar el contrato de la [PR #185](https://github.com/PulsadorUrbano/urban-pulse/pull/185) y la [issue #192](https://github.com/PulsadorUrbano/urban-pulse/issues/192). Mantener TypeScript estricto, Tailwind, validación de JSON y autenticación con los servicios existentes.
- El backend real autoriza y persiste los cambios. El modo demo se mantiene como opción de desarrollo y debe respetar las mismas reglas de selección y estado.
- El dashboard global queda disponible para `admin` y `administrative`. El listado por departamento, las acciones de otros roles y la pantalla de historial se retoman cuando se amplíe el panel.
- Las dos PRs web apuntan a `dev`. La primera tiene que funcionar con el backend actual y con la #185. Los cambios de móvil y la revisión de la #185 se coordinan con sus responsables.
- Artina hará cada commit. Al terminar cada bloque, revisar su diff y sus pruebas, indicar qué archivos incluye y avisar con el mensaje propuesto. Continuar con el siguiente bloque tras confirmar el commit.

## Orden de integración

1. **PR web de compatibilidad.** Integrar la lectura de los estados nuevos, el acceso provisional al listado y la selección obligatoria de departamento y equipo. La petición de guardado conserva el cuerpo que admite `dev`. Referenciar la #192 como trabajo en curso.
2. **PR #185.** Integrar el backend cuando estén cubiertas las adaptaciones necesarias de ambos clientes. Una vez en `dev`, comprobar que la primera PR web carga y asigna incidencias con el backend actualizado.
3. **PR web para completar las asignaciones.** Partir del `dev` que ya incluye la #185, habilitar la reasignación de reabiertas y añadir «Comentarios adicionales». Cerrar la #192 con esta PR cuando sus criterios estén verificados.

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

- [ ] Reutilizar la selección jerárquica. Mostrar indicaciones de selección en departamento y equipo, y conservar la opción «Sin asignar» para el técnico.
- [ ] Deshabilitar el guardado hasta que departamento y equipo formen una selección válida. Si hay técnico, comprobar que pertenece al equipo elegido.
- [ ] Ajustar la demo a la misma regla de selección. Comprobar selección inicial incompleta, cambio de departamento sin equipo, equipo ajeno, cambio de equipo y retirada del técnico. Conservar la respuesta de guardado del contrato actual durante esta fase.

## Tarea 4. Reasignar una incidencia reabierta (segunda PR)

- [ ] Permitir guardar en `validated`, `assigned` y `reopened`. Si una reabierta se devuelve al mismo equipo sin cambios de identificadores, enviar su `teamId` para que el backend ejecute la transición.
- [ ] Actualizar el detalle con la respuesta del PATCH y reflejar en la demo el estado `assigned`. Comprobar la reasignación al mismo equipo, el estado devuelto y los errores de permisos o conflicto antes de mostrar un guardado correcto.

## Tarea 5. Añadir «Comentarios adicionales» (segunda PR)

- [ ] Añadir el campo opcional debajo de los desplegables y dar soporte a `cause?: string` en `AssignmentPatch`.
- [ ] Enviar el texto recortado junto con la asignación. Omitir `cause` si está vacío o solo contiene espacios. Mantener el requisito de al menos un identificador de asignación en el PATCH.
- [ ] Verificar el cuerpo con y sin comentario, la conservación del borrador ante un error 400, 403 o 409 y su limpieza tras guardar. Mantener la justificación obligatoria del cambio de estado y de prioridad en sus propias peticiones.

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
| Pruebas unitarias | `npm run test` | Pendiente |
| Tipos | `npm run typecheck` | Pendiente |
| Lint | `npm run lint` | Pendiente |
| Compilación | `npm run build` | Pendiente |
| Diff | `git diff --check` desde la raíz | Pendiente |
| Primera PR con el backend de `dev` | Cargar el listado, abrir el detalle, guardar una asignación con departamento y equipo y comprobar el aviso al resto de perfiles | Pendiente |
| Primera PR con el backend de la #185 | Cargar y abrir incidencias en los estados nuevos, comprobar la prioridad y guardar una asignación con el cuerpo vigente | Pendiente |
| Segunda PR con la #185 integrada | Reasignar una reabierta al mismo equipo y guardar con y sin comentario | Pendiente |

- [ ] Registrar la verificación de cada criterio del spec y confirmar que el diff web contiene los cambios acordados.
- [ ] Si la #198 está presente, comprobar que se puede filtrar por un estado nuevo sin romper la paginación existente.

## Confirmación de implementación

- **Estado final.** Implementación parcial.
- **Fecha de revisión.** Pendiente.
- **Resultado entregado.** Plan y especificación, lectura de los cuatro estados nuevos, prioridad visible y acceso provisional al listado.
- **Evidencia y comprobaciones.** Los bloques de estados y acceso pasaron las pruebas unitarias, el typecheck, el lint y la compilación. El detalle de esas comprobaciones figura en las tareas 1 y 2.
- **Decisiones y desviaciones.** La compatibilidad web entra antes de la #185 y las funciones del contrato nuevo entran después, con commits individuales a cargo de Artina. Se han respetado los nombres de rama indicados por Artina.
- **Limitaciones y pendientes.** Commit del bloque de acceso, tareas 3 a 5 y prueba del flujo con el backend.
