# 2026-11-12 — Plan de implementación: asignar incidencias desde el panel web

- Objetivo: consultar y actualizar la terna departamento, equipo y técnico de una incidencia desde el panel municipal.
- Arquitectura: vista en `components/`, estado en un hook, peticiones en un servicio, ampliación del tipo de incidencia y datos mock de desarrollo; reutilizar HTTP y configuración existentes.
- Herramientas: React 19, Vite 8, TypeScript 5.7, Tailwind CSS 3, Vitest 5 y lucide-react.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: `asignaciones-frontend` (base `origin/dev` en `feb78f1`).
- Estado: implementado y verificado localmente el 2026-11-12.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios y textos de la UI); conservar los nombres del contrato HTTP.
- Código nuevo en TypeScript estricto, sin `any`; estilos con Tailwind CSS; lógica de datos en servicios y hooks.
- No instalar dependencias, crear commits ni hacer push sin petición explícita. El usuario autorizó `npm ci` durante esta implementación.
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

## Ejecución

- [x] Se revisaron el contrato backend, los tipos, el servicio HTTP, la navegación y las restricciones del proyecto.
- [x] Se intentaron las comprobaciones iniciales; fallaron porque faltaba `node_modules`.
- [x] Con autorización explícita del usuario, se ejecutó `npm ci`. El primer intento no resolvió el registro npm dentro del entorno aislado; el segundo terminó con acceso de red.
- [x] Se ampliaron `IncidentDetail` y su type guard con el estado `assigned` y los tres IDs anulables.
- [x] Se añadieron tipos, catálogo y datos de demostración en memoria con UUID válidos.
- [x] Se implementaron GET de detalle y catálogo, PATCH autenticado y tratamiento de 401, 403, 404, 409 y falta de conexión.
- [x] Se implementaron el hook y la vista con búsqueda por UUID, jerarquía, asignación intermedia, recarga, estados y modo demo explícito.
- [x] Se conservó la navegación existente de acceso y validación.
- [x] Se añadieron pruebas unitarias de forma del contrato, petición HTTP, errores y selección jerárquica.

## Comprobaciones finales

Comandos ejecutados desde `frontend-web/`, salvo `git diff --check`:

| Comprobación | Resultado real |
| --- | --- |
| `npm test` | 5 archivos y 55 pruebas correctas |
| `npm run typecheck` | Correcto |
| `npm run lint` | Correcto |
| `npm run build` | Correcto; Vite generó `dist/` |
| `git diff --check` | Sin errores |

La revisión del backend confirmó los nombres de rutas, el Bearer en opciones y PATCH, la nulabilidad y la limpieza de niveles inferiores al cambiar un nivel superior. Las pruebas de frontend verifican las peticiones y la lógica local; no se ejecutaron pruebas e2e ni contra un backend activo.

## Confirmación de implementación

- Estado final: funcionalidad implementada en la rama `asignaciones-frontend`.
- Fecha de revisión: 2026-11-12.

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| 1 | Vista, hook, carga real y PATCH autenticado | Implementado |
| 2 | Limpieza jerárquica, filtrado y pruebas unitarias | Verificado |
| 3 | Validación de UUID, 404, catálogo vacío, estado y cambios | Implementado |
| 4 | Parche con omisión/`null`, Bearer, guardado único y manejo de errores | Verificado |
| 5 | Error de conexión y modo demo separado por `import.meta.env.DEV` | Verificado |
| 6 | Navegación existente y cambios confinados a `frontend-web/` | Verificado |

Decisiones: se mantuvo la búsqueda por UUID y el modo demo explícito previstos en el spec. El mock vive en memoria y no sustituye un PATCH real fallido. La comprobación de duplicados combina el estado de UI con una referencia sincrónica durante el envío.

Desviación del plan: las pruebas se añadieron junto con la implementación; no se obtuvo una fase roja previa por tarea. La verificación final está registrada arriba.

Limitaciones: no se probó la integración con un backend activo ni el comportamiento visual en navegador. La identidad del desarrollador responsable sigue pendiente de confirmación. `npm ci` informó 12 avisos de auditoría (11 moderados y uno alto); no se cambiaron versiones ni el lockfile.
