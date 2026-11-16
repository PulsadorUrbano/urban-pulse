# 2026-11-16 - Plan de implementación: flujo web de incidencias y asignaciones

- Objetivo: entrar con una cuenta municipal, elegir una incidencia del listado, revisar su detalle, validarla o rechazarla y, una vez validada, asignar departamento, equipo y técnico.
- Arquitectura: listado nuevo en `components/`, navegación desde `App.tsx`, detalle de validación existente y formulario de asignación integrado como sección del detalle. Las llamadas HTTP viven en los servicios y el estado de carga y guardado en los hooks.
- Herramientas: React 19, Vite 8, TypeScript 5.7, Tailwind CSS 3 y Vitest 5.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: `feature/flujo-web-incidencias`, con base en `dev`.
- Estado: implementación parcial. Se adelantó la autenticación del detalle y la validación porque el listado abrirá ese detalle.

## Restricciones generales

- Limitar la implementación a `frontend-web/`. Usar las rutas existentes del backend y coordinar con el equipo cualquier cambio de contrato.
- Mantener TypeScript estricto, estilos con Tailwind y validación de respuestas con `readJson` y type guards.
- Escribir o actualizar las pruebas unitarias necesarias en `frontend-web/src/__tests__/`, siguiendo la estructura de `src/`.
- Mostrar datos reales en el flujo municipal. La demostración local, si se conserva, queda como opción explícita de desarrollo. Un fallo al guardar debe mostrarse como error.
- Mantener los filtros del listado fuera de este alcance. La paginación permite acceder a incidencias de todos los estados sin pedirlas todas de golpe.

## Focos de revisión

- Autenticación: usar el JWT del login real en detalle, validación, prioridad, catálogo y guardado. Enviar el JWT también en el listado municipal para poder usarlo cuando el backend proteja el acceso global.
- Contrato: retirar `civicId` de los cuerpos de los PATCH de validación y prioridad. El backend identifica al autor mediante la sesión.
- Guardado parcial: si el cambio de estado se guarda y el de prioridad falla, mostrar el estado confirmado y permitir reintentar la prioridad.
- Asignación: conservar la jerarquía departamento → equipo → técnico y la diferencia entre omitir un campo y desasignarlo con `null`. Mostrar el estado devuelto por el backend. El paso automático a `assigned` queda pendiente de acuerdo con backend.

## Modularidad y reutilización

- `App.tsx` coordina la sesión y la navegación. La vista del listado renderiza las páginas y su hook controla la carga, el cursor y los reintentos.
- El detalle tiene una sola fuente de datos para la incidencia abierta. El formulario recibe esa incidencia y comunica al detalle el resultado del guardado, de forma que ambas secciones muestran los mismos datos confirmados.
- Los servicios reutilizan los helpers existentes de URL, Bearer, timeout y validación de JSON. El servicio de incidencias gestiona listado, detalle, estado y prioridad. El de asignaciones gestiona catálogo y guardado.
- Mantener las reglas de selección y la construcción del parche en funciones comprobables por separado, reutilizando las que ya existen. Mantener la UI de cada sección en su componente y extraer piezas compartidas cuando tengan un uso concreto.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `frontend-web/src/App.tsx` | Abrir el listado tras el login, seleccionar una incidencia y volver al listado |
| Crear | `frontend-web/src/components/incident-list-view.tsx`, `frontend-web/src/hooks/use-incident-list.ts` | Mostrar el listado y cargar páginas |
| Modificar | `frontend-web/src/services/incident.service.ts`, `frontend-web/src/types/incident.ts` | Añadir el contrato de listado y actualizar las peticiones de detalle, estado y prioridad |
| Modificar | `frontend-web/src/components/incident-validation-view.tsx`, `frontend-web/src/hooks/use-incident-validation.ts` | Reutilizar el detalle, conectar la validación y compartir la incidencia actual con el formulario |
| Adaptar | `frontend-web/src/components/incident-assignment-view.tsx`, `frontend-web/src/hooks/use-incident-assignment.ts`, `frontend-web/src/services/assignment.service.ts` | Integrar el formulario y reutilizar catálogo, selección y guardado |
| Actualizar | `frontend-web/src/__tests__/services/incident.service.test.ts`, `frontend-web/src/__tests__/services/assignment.service.test.ts`, `frontend-web/src/__tests__/hooks/use-incident-assignment.test.ts` | Cubrir los cambios en el contrato HTTP y las reglas existentes de selección |

## Preparación

- [ ] Revisar los contratos actuales en `dev`, el estado de Git y las guías de código y diseño web.
- [ ] Preparar un entorno local con la migración aplicada, catálogo de asignación, una cuenta municipal real y una incidencia en estado `reported`.

## Tarea 1. Mostrar el listado municipal tras el login

- [ ] Consumir `GET /incidents` y mostrar título, estado y fecha. Usar el ID de cada fila para abrir el detalle.
- [ ] Leer `X-Next-Cursor` y usarlo para cargar más resultados. Mostrar estados de carga, lista vacía y error.
- [ ] Sustituir el selector flotante de módulos del flujo normal por la navegación entre listado y detalle. Mantener o refrescar los datos del listado al volver tras un cambio.

## Tarea 2. Conectar el detalle y la validación

- [ ] Abrir el detalle existente con el ID seleccionado y cargarlo con JWT. Reutilizar la descripción, categoría, galería y formulario de validación.
- [x] Enviar JWT en `PATCH /incidents/:id/status` y `PATCH /incidents/:id/priority`, con los campos admitidos por cada endpoint.
- [ ] Actualizar el detalle con la respuesta de cada PATCH y mantener el reintento de prioridad si ya se confirmó la validación.

## Tarea 3. Integrar las asignaciones en el detalle

- [ ] Activar la edición en la sección «Asignación» para los roles autorizados cuando la incidencia esté en `validated` o `assigned`.
- [ ] Alimentar el formulario con la incidencia ya abierta y cargar el catálogo con `GET /incidents/assignment-options`. El flujo real empieza en la fila seleccionada y usa una sola carga del detalle.
- [ ] Reutilizar los desplegables, el filtrado de equipos y técnicos, la limpieza de niveles inferiores y el cálculo del parche.
- [ ] Guardar mediante `PATCH /incidents/:id/assignment` y usar la respuesta para actualizar el detalle. Mostrar el error si falla el guardado y permitir recargar ante un conflicto.

## Comprobaciones finales

| Comprobación | Comando o recorrido | Resultado |
| --- | --- | --- |
| Pruebas unitarias | `npm run test` | Pendiente |
| Tipos | `npm run typecheck` | Pendiente |
| Lint | `npm run lint` | Pendiente |
| Build | `npm run build` | Pendiente |
| Diff | `git diff --check` desde la raíz | Pendiente |
| Flujo real | Login municipal → listado → abrir incidencia `reported` → validar → asignar los tres valores → volver a abrir y comprobar la persistencia | Pendiente |

- [ ] Comprobar que una incidencia pendiente o rechazada no permite editar la asignación.
- [ ] Comprobar que la segunda página se añade al listado y que los cambios de estado aparecen al volver.

### Pruebas unitarias

| Archivo dentro de `frontend-web/src/__tests__/` | Casos que debe cubrir |
| --- | --- |
| `services/incident.service.test.ts` | Primera página y página con cursor, lectura de `X-Next-Cursor`, respuesta vacía o inválida, Bearer en las rutas protegidas y cuerpos de estado y prioridad sin `civicId` |
| `services/assignment.service.test.ts` | Bearer al cargar el catálogo y guardar, cuerpo con campos omitidos o anulados explícitamente y respuesta de conflicto o error sin confirmación de guardado |
| `hooks/use-incident-assignment.test.ts` | Limpieza de equipo y técnico al cambiar el departamento, limpieza de técnico al cambiar el equipo, selección incompatible y parche con solo los campos modificados |

- [ ] Actualizar las pruebas existentes en esas rutas y ejecutar `npm run test`.
- [ ] Si la integración introduce lógica nueva de coordinación, cubrir el reintento de prioridad tras una validación confirmada y que solo una respuesta de guardado correcta actualice el detalle. Usar los servicios sustituidos por dobles de prueba en lugar de depender del backend para estas comprobaciones unitarias.

## Confirmación de implementación

- Estado: autenticación del detalle, estado y prioridad implementada, incluida la carga de detalle desde asignaciones. Listado e integración pendientes.
- Evidencia parcial: antes del ajuste fallaron las tres pruebas de cabecera Bearer. Tras el ajuste, `npm run test` pasó con 55 pruebas en 5 archivos y `git diff --check` pasó. Typecheck y build se detuvieron por ausencia de `@types/node`. Lint se detuvo por ausencia de `typescript-eslint`.
