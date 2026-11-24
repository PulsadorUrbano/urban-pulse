# 2026-11-20 — Especificación para adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA que creó la especificación.** GPT-6. Identificador exacto de la sesión no disponible.
- **Ramas de trabajo.** `fix/compatibilidad-incidencias-web` para la #201 y `feature/completar-asignaciones-web` para la segunda PR. La segunda rama parte provisionalmente de la #201.
- **Última actualización.** 2026-11-20.
- **Estado.** Implementada con pruebas automatizadas. Pendiente de verificación con el backend desplegado.
- **Plan.** [Plan de implementación](./plan.md).
- **Referencias.** [Backend #185](https://github.com/PulsadorUrbano/urban-pulse/pull/185), [tarea #192](https://github.com/PulsadorUrbano/urban-pulse/issues/192), [filtro #198](https://github.com/PulsadorUrbano/urban-pulse/pull/198) y [flujo web existente](../16-11-26-flujo-web-incidencias/spec.md).

## Objetivo y decisiones vigentes

El personal de administración puede seguir consultando incidencias y guardando asignaciones durante el cambio de contrato de la #185. El flujo final permite asignar o reasignar una incidencia con un departamento y un equipo válidos, un técnico opcional y comentarios opcionales.

- **Primera PR web.** Admite los estados nuevos en el listado y el detalle, aplica el acceso provisional al listado global y exige departamento y equipo para guardar. Puede entrar en `dev` con el backend actual.
- **Segunda PR web.** Entra después de la #185. Habilita la reasignación de incidencias reabiertas y «Comentarios adicionales». Completa la [#192](https://github.com/PulsadorUrbano/urban-pulse/issues/192).
- **Filtro de estado.** Cuando la #198 esté en la base de trabajo, su selector ofrecerá las mismas etiquetas y estados que el listado. La #198 aporta el componente y se revisa en su propia PR.
- **Alcance.** Panel web para administración, asignaciones y demo de desarrollo. El listado por departamento, las acciones del ciclo de vida de otros roles y la pantalla de historial quedan para el trabajo posterior de roles. Los cambios de backend y móvil se coordinan en sus propias PRs.

## Contexto verificado

- La web ya utiliza JWT para cargar el listado, el detalle y el catálogo, y para guardar asignaciones. Actualmente, su validador de respuestas conoce cuatro estados. Si el listado contiene una incidencia con un estado nuevo, la validación rechaza la página completa.
- El formulario permite guardar selecciones parciales y editar incidencias en `validated` o `assigned`. La #185 exige una asignación final con departamento y equipo, y también admite `reopened`.
- La web permite iniciar sesión a los perfiles municipales. La #185 reserva el listado global a `admin` y `administrative`.
- El stack existente es React 19, TypeScript 5, Vite 8, Tailwind CSS 3 y Vitest 5. El flujo se adapta con las dependencias actuales.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `GET /incidents` | JWT de administración. Cursor opcional en la consulta | `200` con array de `{ id, title, status, createdAt }` y cabecera `X-Next-Cursor` cuando quedan más resultados | [Listado](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/get-incidents/README.md) |
| `GET /incidents/:id` | ID de la incidencia y JWT | `200` con el detalle, incluida la asignación actual | [Detalle](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/get-incidents-id/README.md) |
| `GET /incidents/assignment-options` | JWT de administración en el flujo web de esta fase | `200` con las listas de departamentos, equipos y técnicos asignables | [Catálogo](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/get-incidents-assignment-options/README.md) |
| `PATCH /incidents/:id/assignment` | JWT y JSON con al menos un identificador de asignación. Con la segunda PR, el cuerpo puede incluir `cause` cuando hay comentarios | `200` con el detalle confirmado. Con la #185, el registro queda en `assigned` | [Asignación](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md) |

- Antes de la #185, la web envía únicamente los identificadores que corresponden al cambio. Con la #185 integrada, añade `cause` solo si se ha escrito algo y envía `teamId` al reasignar una reabierta al mismo equipo cuando no hay otros identificadores modificados.
- Una asignación guardada tiene departamento y equipo. Se puede guardar sin técnico y quitar un técnico que ya estaba asignado mediante `technicianId: null`. La omisión de un identificador mantiene el valor actual, con la limpieza de los niveles dependientes que define el contrato.
- El backend autoriza la operación y determina el estado final. El JWT se deriva de la sesión existente. La justificación para validar, descartar o cambiar la prioridad sigue perteneciendo a sus [peticiones de estado](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/patch-incidents-id-status/README.md) y [prioridad](https://github.com/PulsadorUrbano/urban-pulse/blob/bde532645b27e83baa5b7efc18725772fd874533/backend/docs/spec/endpoint/patch-incidents-id-priority/README.md).
- Si la carga o el guardado fallan, se muestra el error de la operación real y se ofrece reintentar o recargar según corresponda. Solo una respuesta correcta confirma un cambio real.

### Mock (`src/mocks/`)

El modo demo existente se ofrece de forma explícita en desarrollo y conserva su incidencia y catálogo en memoria.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `departmentId` | UUID | Sí en el resultado | El departamento figura en el catálogo | Si se omite en el PATCH, se conserva el valor actual |
| `teamId` | UUID | Sí en el resultado | Pertenece al departamento elegido | Si se cambia el departamento, se debe elegir su equipo |
| `technicianId` | UUID o `null` | Opcional | Si tiene valor, pertenece al equipo elegido | `null` indica «Sin asignar» |
| `cause` | Texto | Opcional en la segunda PR | Se recortan los espacios de los extremos | El campo se omite si queda vacío |

- **Recurso simulado.** Reutiliza `IncidentDetail`, `AssignmentOptions` y el catálogo con UUID existentes. En la primera PR, conserva el comportamiento del estado de `dev` y aplica la selección completa. En la segunda, devuelve `assigned` al guardar una asignación válida con el contrato nuevo.
- **Errores simulados.** Una selección incompleta, un equipo o técnico ajenos a la cadena elegida o un estado sin edición disponible muestran el error de guardado correspondiente.

## Contrato de UI y navegación

- **Listado.** Las sesiones reales `admin` y `administrative` cargan el listado global. Los demás perfiles municipales ven «El listado de incidencias está disponible para administración» en el dashboard. La carga sigue siendo paginada. Al abrir un detalle, el backend comprueba su ámbito.
- **Detalle.** Los estados nuevos aparecen como «En progreso», «Resuelta», «Reabierta» y «Cerrada». Las incidencias tramitadas muestran su prioridad guardada. Las acciones de validación, descarte y prioridad se muestran a los perfiles y estados autorizados.
- **Formulario.** Departamento y equipo comienzan con una indicación de selección cuando están vacíos. Cambiar de departamento limpia equipo y técnico. Cambiar de equipo limpia el técnico. El técnico conserva la opción «Sin asignar». «Guardar asignación» se habilita cuando la selección final es válida y hay un cambio que guardar o una incidencia reabierta que reasignar, según la fase.
- **Comentarios adicionales.** En la segunda PR aparece el campo opcional debajo de los desplegables. Al guardar se usa la respuesta real para actualizar los datos confirmados y se limpia el campo. Si falla el guardado, el formulario conserva el borrador mientras siga abierto. Un error 403 informa del permiso y un conflicto 409 ofrece recargar la incidencia.
- **Carga y guardado.** La acción se deshabilita mientras hay un guardado en curso para evitar peticiones duplicadas. La indicación de éxito aparece después de recibir la respuesta correcta.

## Tipos y datos mock

| Tipo en `src/types/` | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentStatus` | Los cuatro valores existentes más `in_progress`, `resolved`, `reopened` y `closed` | El listado, el detalle, las respuestas de guardado y las etiquetas usan el mismo conjunto |
| `IncidentSummary` e `IncidentDetail` | Resumen y detalle existentes con `status: IncidentStatus` | El detalle conserva los IDs anulables para mostrar incidencias aún sin asignación |
| `AssignmentSelection` | IDs de departamento, equipo y técnico de la edición | La selección en curso puede estar incompleta. El resultado guardable exige departamento y equipo |
| `AssignmentPatch` | Identificadores modificados y `cause?: string` desde la segunda PR | El borrador vacío se omite. El cuerpo debe incluir al menos un identificador de asignación |

- **Almacenamiento.** El backend conserva la asignación real. El modo demo usa el recurso en memoria existente.
- **Ciclo de vida.** La selección y el texto en curso pertenecen al formulario activo. Las asignaciones confirmadas proceden de la respuesta del PATCH.

## Diseño mínimo

`App.tsx` y la vista del listado aplican el acceso provisional. El servicio de incidencias valida los estados y las etiquetas compartidas los muestran en listado y detalle. El hook de asignación controla la selección jerárquica, el borrador y el guardado. El servicio de asignaciones conserva la autenticación y la gestión de errores. El detalle se actualiza a partir de la incidencia devuelta por el servicio.

## Criterios de aceptación

1. **Primera PR.** Una página con incidencias en los cuatro estados nuevos se carga y cada incidencia abre su detalle con la etiqueta correspondiente. Las incidencias tramitadas muestran su prioridad guardada.
2. **Primera PR.** Para `admin` y `administrative`, la web pide el listado con JWT. Otro perfil municipal ve el aviso y la web evita solicitar el listado global.
3. **Primera PR.** La web y la demo impiden guardar si falta departamento o equipo, o si la selección incumple la jerarquía. Permiten guardar con departamento y equipo válidos y técnico vacío. El PATCH sigue siendo compatible con el backend actual.
4. **Segunda PR.** Una incidencia `reopened` se puede reasignar, incluso a su equipo actual. La petición contiene un identificador de asignación y el detalle pasa a mostrar `assigned` cuando el backend confirma el cambio.
5. **Segunda PR.** Se puede guardar una asignación válida con comentarios o con el campo vacío. El texto se envía recortado como `cause` y se omite cuando queda vacío.
6. **Ambas PRs.** Un error 400, 403 o 409 muestra un mensaje y la asignación de la pantalla sigue siendo la última confirmada. En la segunda PR el borrador permanece disponible tras un fallo mientras el formulario siga abierto.

## Estrategia de verificación

- Actualizar las pruebas unitarias del servicio de incidencias para cubrir los estados nuevos en el listado y el detalle.
- Cubrir las reglas de acceso y los casos de asignación con pruebas unitarias de la selección y de los cuerpos PATCH. Verificar errores, reasignación al mismo equipo, comentarios omitidos o enviados y confirmación tras respuesta correcta.
- Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en cada PR, y `git diff --check` desde la raíz. Comprobar el flujo manual previsto en el plan con el backend que corresponda a cada PR.
- Registrar los resultados en [Confirmación de implementación](./plan.md#confirmación-de-implementación).
