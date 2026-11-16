# 2026-11-16 - Especificación: flujo web de incidencias y asignaciones

- Desarrolladora responsable: Artina.
- Asistente de IA: Codex.
- Modelo de IA: GPT-6 (identificador exacto de versión no disponible).
- Rama propuesta: `feature/flujo-web-incidencias`, desde `dev`.
- Última actualización: 2026-11-16.
- Estado: implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md).
- Referencia: [Especificación del formulario de asignaciones existente](../12-11-26-asignar-incidencias/spec.md).

## Objetivo y decisiones vigentes

El personal municipal con sesión real de rol `admin` o `administrative` puede abrir una incidencia desde el listado tras iniciar sesión, revisar el detalle, validarla o rechazarla y gestionar su asignación en el mismo detalle una vez validada.

- Alcance: listado paginado, navegación al detalle, validación y rechazo, prioridad y asignación de departamento, equipo y técnico.
- Decisión de interfaz: la sección «Asignación» recibe la incidencia seleccionada. El operador elige una fila del listado para abrir el detalle.
- Pendiente de acuerdo con backend: protección del listado global y transición automática a `assigned` al completar los tres niveles. La web muestra el estado que devuelve la API.
- Fuera de alcance: filtros, cambios en la API o aplicación móvil y gestión del catálogo.

## Contexto verificado

En `dev`, el detalle de validación recibe el ID de la URL y la pantalla de asignación independiente permite introducirlo manualmente. El backend ya ofrece el listado, el detalle y las operaciones de validación y asignación. La web debe adaptar al contrato vigente las peticiones de detalle, estado y prioridad, que actualmente salen sin JWT.

## Contrato de datos

### Backend real

| Método y ruta | Entrada | Respuesta correcta |
| --- | --- | --- |
| `GET /incidents` | Consulta global con JWT de la sesión municipal y `cursor` opcional | Array de resúmenes y cabecera `X-Next-Cursor` si hay más resultados |
| `GET /incidents/:id` | UUID y Bearer | Detalle, incluidas las asignaciones actuales |
| `PATCH /incidents/:id/status` | Bearer y JSON con `status` (`validated` o `rejected`) y `cause` | Detalle actualizado |
| `PATCH /incidents/:id/priority` | Bearer y JSON con `priority` y `cause` | Detalle actualizado |
| `GET /incidents/assignment-options` | Bearer | Listas de departamentos, equipos y técnicos |
| `PATCH /incidents/:id/assignment` | Bearer y uno o varios campos de asignación con UUID o `null` | Detalle con la asignación confirmada |

Los PATCH de estado y prioridad obtienen el autor del JWT. Las peticiones se ajustan al [contrato del backend](../../../../../backend/docs/spec/endpoint/README.md). Si el backend falla, la web muestra el error y permite reintentar la operación cuando proceda.

### Mock

Se conserva el mock existente de asignación para una demostración explícita en desarrollo si se habilita desde la interfaz. La sesión simulada no habilita operaciones municipales reales. El resultado de demostración se mantiene en memoria y se identifica en pantalla.

## Contrato de UI y navegación

- Tras iniciar sesión, se muestra el listado con título, estado y fecha. «Cargar más» aparece si la API devuelve un cursor. Hay estados de carga, lista vacía y error.
- Al seleccionar una fila se abre el detalle existente con descripción, categoría, fotos y acciones de validación. Al volver, el listado refleja los cambios confirmados.
- La edición de la asignación requiere estado `validated` o `assigned`. Si el cambio de estado se confirma y falla la prioridad, el detalle muestra el estado confirmado y permite reintentar solo la prioridad.
- El formulario muestra la asignación actual. Al cambiar el departamento se limpian equipo y técnico. Al cambiar el equipo se limpia el técnico. Se muestran únicamente opciones vinculadas al nivel superior.
- Durante el envío se deshabilita el guardado duplicado. Los errores de guardado se muestran en el formulario. Ante un conflicto, se permite recargar la incidencia antes de reintentar.

## Tipos y diseño

- El resumen del listado contiene `id`, `title`, `status` y `createdAt`. El cursor de la siguiente página se obtiene de la cabecera.
- Se reutilizan `IncidentDetail`, `AssignmentOptions` y `AssignmentPatch`. Los IDs de asignación admiten `null`. El parche omite campos sin cambios y envía `null` para vaciar un campo.
- El detalle mantiene la incidencia actual y la comparte con la sección de asignación. Los hooks gestionan carga y operaciones, los servicios validan las respuestas y los componentes presentan los datos. Se reutilizan los helpers HTTP y las reglas de selección existentes.

## Criterios de aceptación

1. Una sesión municipal real abre un listado paginado. Cada fila abre su detalle sin introducir el UUID.
2. Desde el detalle se puede validar o rechazar una incidencia con las peticiones autenticadas. Si falla solo la prioridad, se conserva el estado confirmado y se puede reintentar.
3. Las incidencias `reported` y `rejected` no permiten editar la asignación. Para una incidencia editable, los tres desplegables respetan su jerarquía.
4. Tras guardar y volver a abrir el detalle se muestran los valores persistidos. Un fallo de guardado se muestra como error y no altera la asignación confirmada.
5. Una sesión simulada no realiza escrituras reales. La lista vacía y los fallos de carga se muestran en la vista correspondiente.

## Estrategia de verificación

Actualizar las pruebas unitarias con Vitest en `frontend-web/src/__tests__/`. Cubrir paginación, autenticación, cuerpos PATCH, selección encadenada y errores. Verificar manualmente el recorrido con datos de prueba y registrar los resultados en [el plan](./plan.md#confirmación-de-implementación).
