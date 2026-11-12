# 2026-11-12 — Plan de implementación: asignar incidencias desde el panel web

- Objetivo: consultar y actualizar la terna departamento, equipo y técnico de una incidencia desde el panel municipal.
- Arquitectura: vista en `components/`, estado en un hook, peticiones en un servicio, ampliación del tipo de incidencia y datos mock de desarrollo; reutilizar HTTP y configuración existentes.
- Herramientas: React 19, Vite 8, TypeScript 5.7, Tailwind CSS 3, Vitest 5 y lucide-react.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: `asignaciones-frontend` (base `origin/dev` en `feb78f1`).
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios y textos de la UI); conservar los nombres del contrato HTTP.
- Código nuevo en TypeScript estricto, sin `any`; estilos con Tailwind CSS; lógica de datos en servicios y hooks.
- No instalar dependencias, crear commits ni hacer push sin petición explícita.
- Consumir backend real primero. En desarrollo, mostrar aviso claro si no hay conexión y ofrecer modo demo; en producción, mostrar error. Un PATCH real fallido nunca debe convertirse en éxito simulado.
- Validar respuestas externas con `readJson` y type guards; no usar `as` sobre datos externos. Los mocks solo estarán disponibles tras `import.meta.env.DEV`.
- Tests en `src/__tests__/` reflejando la ruta de `src/`; no crear ni ejecutar e2e o integración salvo petición explícita.
- Confinar cambios a `frontend-web/`; `backend/`, `frontend-mobile/` y `database/` son de solo lectura.
- Restricciones particulares: solo `admin` y `administrative` editan con sesión real; el PATCH no cambia estado ni prioridad; UUID reales y mock deben tener el mismo formato.

## Focos de revisión

- Jerarquía y nulabilidad: prueba de cambio de departamento/equipo y de cuerpos PATCH con omisión frente a `null`.
- Permisos: prueba de sesión ausente, origen mock y rol distinto de los dos autorizados; el backend mantiene la autorización final.
- Fallos: prueba de 409 concurrente y de fallo de red durante el PATCH, sin éxito falso ni pérdida silenciosa del formulario.
- Catálogo e incidencia: prueba de arrays vacíos, UUID inválido, 404 y estado no editable.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `frontend-web/src/App.tsx` | Navegación hacia asignaciones y sesión |
| Crear | `frontend-web/src/components/incident-assignment-view.tsx` | Formulario, estados y mensajes accesibles |
| Crear | `frontend-web/src/hooks/use-incident-assignment.ts` | Carga, selección jerárquica y envío |
| Crear | `frontend-web/src/services/assignment.service.ts` | GET y PATCH reales; selección explícita del mock |
| Modificar | `frontend-web/src/types/incident.ts`, `frontend-web/src/services/incident.service.ts` | IDs anulables, estado `assigned` y type guard del detalle |
| Crear | `frontend-web/src/types/assignment.ts`, `frontend-web/src/mocks/assignment-mock.ts` | Catálogo, parche y datos demo con UUID válidos |
| Reutilizar | `frontend-web/src/constants/config.ts`, `frontend-web/src/services/http.ts`, `frontend-web/.env.example` | URL base, Bearer, timeout y validación de respuestas |
| Crear | `frontend-web/src/__tests__/services/assignment.service.test.ts`, `frontend-web/src/__tests__/hooks/use-incident-assignment.test.ts` | Contrato de petición, errores y reglas de selección |
| Actualizar | `frontend-web/docs/spec/features/12-11-26-asignar-incidencias/spec.md`, `plan.md` | Contrato y registro de ejecución |

## Preparación

- [x] Leer `frontend-web/CLAUDE.md`, la especificación, los archivos afectados y el estado de Git para redactar estos documentos.
- [x] Revisar los contratos backend de detalle, opciones y PATCH, y el controlador en modo lectura.
- [x] Comprobar las versiones declaradas en `package.json`.
- [ ] Registrar estado inicial de `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` antes de cambiar código; distinguir fallos previos.

## Tarea 1: tipos y mock compatible

**Archivos:** `frontend-web/src/types/incident.ts`, `frontend-web/src/types/assignment.ts`, `frontend-web/src/services/incident.service.ts`, `frontend-web/src/mocks/assignment-mock.ts`.

**Interfaces:** `IncidentDetail` ampliado, `AssignmentOptions`, `AssignmentPatch`; datos con forma pública y UUID válidos.

**Criterios cubiertos:** 1, 3, 5.

- [ ] Definir pruebas de forma del mock, UUID y catálogos vacíos donde añadan una comprobación útil.
- [ ] Ejecutar la prueba pertinente antes del cambio y anotar el resultado real.
- [ ] Implementar tipos, type guard y mock de desarrollo sin credenciales ni persistencia local de asignaciones.
- [ ] Ejecutar pruebas pertinentes y registrar evidencia.
- [ ] Revisar diff y alinear este plan con decisiones reales.

## Tarea 2: servicio HTTP y errores

**Archivos:** `frontend-web/src/services/assignment.service.ts`, `frontend-web/src/__tests__/services/assignment.service.test.ts`.

**Interfaces:** carga de detalle y catálogo; PATCH JSON no vacío con Bearer para sesión real; resultado diferenciado por origen.

**Criterios cubiertos:** 1, 4, 5.

- [ ] Definir pruebas de GET, PATCH, omisión/null, 401, 403, 404, 409 y fallo de red; comprobar que un PATCH fallido no se guarda en mock.
- [ ] Ejecutar la prueba pertinente antes del cambio y anotar el resultado real.
- [ ] Implementar las peticiones y la clasificación de errores según el contrato backend.
- [ ] Ejecutar pruebas pertinentes y registrar evidencia.
- [ ] Revisar diff y actualizar el plan.

## Tarea 3: estado del formulario y vista

**Archivos:** `frontend-web/src/hooks/use-incident-assignment.ts`, `frontend-web/src/components/incident-assignment-view.tsx`, `frontend-web/src/App.tsx`, `frontend-web/src/__tests__/hooks/use-incident-assignment.test.ts`.

**Interfaces:** UUID de incidencia, opciones filtradas, terna editable, guardado con respuesta del servidor y estados de UI.

**Criterios cubiertos:** 1, 2, 3, 4, 5, 6.

- [ ] Definir pruebas de limpieza jerárquica, ausencia de cambios, estado no editable, guardado único y conflicto 409.
- [ ] Ejecutar la prueba pertinente antes del cambio y anotar el resultado real.
- [ ] Implementar la vista con estados, avisos y navegación accesibles.
- [ ] Ejecutar pruebas pertinentes y registrar evidencia.
- [ ] Revisar diff y actualizar la especificación si cambia una decisión de producto.

## Comprobaciones finales

Los comandos de aplicación se ejecutarán desde `frontend-web/` cuando se implemente. En esta entrega documental no se ejecutan.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | `npm run test` | Pendiente de implementación |
| Typecheck | `npm run typecheck` | Pendiente de implementación |
| Lint | `npm run lint` | Pendiente de implementación |
| Build | `npm run build` | Pendiente de implementación |
| Diff, desde la raíz | `git diff --check` | Sin errores; los documentos nuevos aún no están añadidos a Git y se revisaron por separado |

- [ ] Revisar que cada criterio de aceptación tiene evidencia y que tipos y firmas coinciden entre tareas.
- [ ] Registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan.
- [ ] Confirmar que no se tocaron archivos ajenos, credenciales o servicios fuera del alcance.

## Confirmación de implementación

- Estado final: pendiente.
- Fecha de revisión: 2026-11-12.
- Resultado entregado: solo especificación y plan; no se ha implementado la funcionalidad.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1 a 6 | Requieren código y pruebas de implementación | Pendiente |

- Comprobaciones: pruebas, typecheck, lint y build pendientes hasta implementar. En esta entrega se comprobaron enlaces relativos, ausencia de marcadores y `git diff --check`; los documentos nuevos se revisaron por separado porque aún no están añadidos a Git.
- Decisiones y desviaciones: búsqueda por UUID y modo demo explícito son propuestas de esta especificación.
- Limitaciones y pendientes: confirmar las suposiciones de producto y el desarrollador responsable antes de cerrar el contrato.
