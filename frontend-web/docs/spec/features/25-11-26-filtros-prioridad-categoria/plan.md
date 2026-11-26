# 2026-11-25 - Plan de implementación: conectar filtros de prioridad y categoría en la web

- Desarrollador responsable: Artina (`artina09`).
- Asistente de IA: Codex.
- Modelo de IA: GPT-6. Identificador exacto de la sesión no disponible.

- Última actualización: 2026-11-25.
- Objetivo: completar el frontend web de #196 y #197 consumiendo el backend de José integrado en la [PR #214](https://github.com/PulsadorUrbano/urban-pulse/pull/214).
- Arquitectura: reutilizar panel, servicios y hooks existentes; GET /incidents aplica prioridad/categoría en PostgreSQL antes de paginar.
- Herramientas: React, TypeScript estricto, Tailwind y Vitest existentes, sin nuevas dependencias.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/filtros-prioridad-categoria-web.
- Estado: implementación web terminada; pruebas unitarias, typecheck y lint correctos; build correcto. Prueba manual con backend pendiente.

## Restricciones generales

- Cambios limitados a frontend-web/. No implementar ni modificar backend, esquema, migraciones o documentación backend: ese trabajo ya está en #214.
- Consumir el contrato integrado; no reproducir el contrato anterior propuesto por nosotros.
- Identificadores en inglés, UI/documentación en español, Tailwind y validación de JSON con utilidades existentes.
- Prioridad/categoría se envían al servidor. No filtrar por esos campos en el navegador, ampliar el resumen ni pedir el detalle de cada fila.
- Mantener identidad, permisos, listado, paginación y errores actuales.
- La adaptación web de estado/fecha/orden corresponde a Suito. Revisar su estado en dev antes de implementar para no duplicar trabajo; no incorporarla a nuestro alcance.
- Si estado/fecha/orden siguen locales, mantener explícita la posible parcialidad del resultado combinado. La existencia del backend no implica que su frontend ya esté adaptado.
- No instalar dependencias, hacer commits, push o PR sin solicitud.
- Artina hace los commits. Preparar bloques atómicos y entregar sus archivos y mensaje antes de continuar con el siguiente bloque.
- Verificar con pruebas unitarias. Sin pruebas e2e/integración salvo petición.

## Focos de revisión

- Cursor opaco vinculado a todos los filtros: cambiar prioridad/categoría exige una primera petición sin cursor.
- Los cursores anteriores al contrato de #214 ya no son compatibles. No conservar cursores entre sesiones ni decodificarlos para reconstruirlos.
- «Cargar más» repite exactamente los criterios de la consulta vigente y agrega solo sus páginas.
- Respuestas antiguas, cambios de sesión o reintentos no pueden mezclar resultados.
- Catálogo real por ID desde GET /categories; errores independientes del listado, sin inventar categorías.
- El resumen sigue incluyendo solo id, title, status y createdAt. El servidor puede filtrar sin devolver prioridad/categoría.
- El contador muestra filas cargadas, no total global.
- #214 interpreta from/to como días UTC. No cambiar ni convertir las fechas de Suito en este trabajo; si se comparte serialización, conservar el contrato UTC y coordinar la adaptación.
- «Limpiar filtros» debe restablecer todos los controles existentes y reiniciar la consulta.

## Mapa de archivos

Rutas relativas a la raíz; confirmar en dev actualizado.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | frontend-web/src/types/incident.ts | Selección y opciones de petición de prioridad/categoría; tipo de catálogo, sin cambiar IncidentSummary |
| Modificar | frontend-web/src/services/incident.service.ts | Query tipada con filtros/cursor y lectura validada de GET /categories |
| Modificar | frontend-web/src/hooks/use-incident-list.ts | Consulta por filtros, reinicio, paginación y respuestas obsoletas |
| Modificar | frontend-web/src/hooks/use-incident-filters.ts | Estado de selección y reset; conservar conexión de estado/fecha/orden que tenga dev |
| Crear si hace falta | frontend-web/src/hooks/use-incident-categories.ts | Carga/error/reintento de catálogo |
| Modificar | frontend-web/src/components/incident-filters.tsx | Selectores accesibles de prioridad/categoría |
| Modificar | frontend-web/src/components/incident-list-view.tsx | Conectar selección, catálogo y petición |
| Ampliar | frontend-web/src/__tests__/services/incident.service.test.ts | Query, cursor, catálogo y errores |
| Crear/ampliar | frontend-web/src/__tests__/hooks/use-incident-list.test.ts | Reinicio, acumulación y carreras de respuestas |
| Crear/ampliar según infraestructura | frontend-web/src/__tests__/hooks/use-incident-filters.test.ts, frontend-web/src/__tests__/components/incident-list-view.test.tsx | Selección, reset y convivencia con filtros existentes |
| Actualizar | spec.md y este plan | Progreso y resultados reales |

No se crearán planes/specs backend ni se repetirán sus pruebas como parte de esta feature web.

## Preparación

- [x] Revisar #196, #197 y los filtros de #198.
- [x] Revisar código y pruebas de #214: filtros antes de paginar, cursor, validación y permisos.
- [x] Registrar integración de #214 confirmada por Artina.
- [x] Retirar tareas backend y requisitos incompatibles sobre cursores antiguos.
- [x] Actualizar origin/dev mediante git fetch origin dev; ahora apunta a 955853a y contiene #214.
- [ ] Incorporar origin/dev a la rama de trabajo después de guardar la documentación. Artina realiza el merge para crear ella misma el commit.
- [x] Confirmar si Suito ya adaptó estado/fecha/orden; al consultar dev mediante GitHub, su hook sigue filtrando localmente.
- [x] Leer guías web y contratos integrados de GET /incidents y GET /categories antes de código.
- [x] Registrar estado inicial: typecheck, lint, 102 pruebas y build correctos.

Los primeros intentos de fetch fallaron por «getaddrinfo() thread failed to start». El último git fetch origin dev terminó correctamente y actualizó origin/dev a 955853a42db0284a0d16ec13a1c7b04f578ee706. La rama de trabajo todavía no incorpora ese merge; no se ha modificado código backend.

## Tarea 1: servicio y catálogo

**Interfaces:** filtros de petición opcionales priority/categoryId, cursor opaco y catálogo del backend.
**Criterios cubiertos:** 1, 2 y 5.

- [x] Probar peticiones sin filtros, con cada filtro, ambos y continuación con cursor.
- [x] Omitir valores «todas»; usar URLSearchParams y los nombres exactos del contrato.
- [x] Mantener firma compatible con consumidores actuales o actualizar todos los afectados dentro de web.
- [x] Consumir y validar GET /categories con utilidades HTTP existentes.
- [x] Gestionar carga/error/reintento del catálogo sin bloquear prioridad/listado.
- [x] Verificar que no se pide detalle por fila ni se exige prioridad/categoría en IncidentSummary.

### Bloque de commit 1: servicio y contrato web

- Archivos: src/types/incident.ts, src/services/incident.service.ts y src/__tests__/services/incident.service.test.ts, dentro de frontend-web/.
- Mensaje: feat: preparar consultas de prioridad y categoría en la web.
- Verificación: npm run typecheck y 30 pruebas del servicio correctos; git diff --check sin errores. Conexión de hooks/UI pendiente.
- Commit: dc738cf, creado por Artina.

## Tarea 2: listado filtrado y paginación

**Interfaces:** hook de listado recibe criterios vigentes y conserva solo páginas de esa consulta.
**Criterios cubiertos:** 1–4 y 6.

- [x] Cambio de prioridad/categoría: limpiar cursor y filas anteriores y solicitar primera página.
- [x] Cargar más: repetir criterios y acumular resultados sin mezclar búsquedas.
- [x] Evitar respuestas obsoletas, también al cambiar sesión.
- [x] Reintentar la petición fallida de la consulta vigente sin duplicar páginas.
- [x] Mantener selección de estado/fecha/orden al cambiar prioridad/categoría.
- [x] Probar cambio rápido de selección y llegada de respuestas fuera de orden.

## Tarea 3: controles conectados y reset

**Interfaces:** ampliar IncidentFilters y conectar catálogo, selección y listado.
**Criterios cubiertos:** 2–6.

- [x] Prioridad: todas, baja, media y alta; reutilizar etiquetas.
- [x] Categoría: todas y catálogo real por ID.
- [x] Habilitar controles conectados; estados accesibles de carga/error del catálogo.
- [x] Mantener diseño adaptable claro/oscuro.
- [x] Limpiar todos los filtros y solicitar primera página sin prioridad/categoría.
- [x] Conservar mensajes de vacío/error y paginación.
- [x] Si permanecen filtros locales, conservar aviso y contador sin presentar el resultado combinado como total global.
- [x] No añadir el antiguo aviso de «integración pendiente»: la feature debe conectar el backend real.

### Bloque de commit 2: controles y paginación

- Archivos: hooks, controles, tipos de selección y pruebas dentro de src/; documentación reservada para el commit final.
- Mensaje: feat: conectar filtros de prioridad y categoría al listado web.
- useIncidentFilters orquesta el estado de controles y useIncidentList; la vista consume un único resultado coherente. Los criterios nuevos nunca se aplican como predicados locales.
- Las pruebas de hooks usan un doble de useState/useMemo/useEffect para comprobar orquestación sin DOM ni nuevas dependencias; las de vista usan renderizado estático. No sustituyen una prueba manual en navegador.
- Commit: 7090eef, creado por Artina.

## Comprobaciones finales

Desde frontend-web salvo diff desde la raíz.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | 134 pruebas correctas en 13 archivos |
| Typecheck | npm run typecheck | Correcto |
| Lint | npm run lint | Correcto |
| Build | npm run build | Correcto |
| Diff | git diff --check | Correcto |

- [x] Ejecutar pruebas pertinentes y comprobaciones del frontend; registrar fallos previos y bloqueos.
- [x] Verificar criterios con evidencia concreta y revisar alcance del diff.
- [x] No atribuir las pruebas de #214 a nuestro trabajo ni afirmar integración HTTP por pruebas unitarias.

## Confirmación de implementación

- Estado final: implementado con verificación unitaria; prueba manual con backend pendiente.
- Fecha de revisión: 2026-11-25.
- Resultado entregado: selectores conectados al servidor, catálogo real con reintento, reset, paginación por consulta y descarte de respuestas obsoletas. Estado/fecha/orden conservan lógica local.

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| Backend disponible | #214 integrada por Artina; revisión previa de código/CI | Dependencia satisfecha |
| 1 y 5: consumo y contrato | 30 pruebas del servicio y prueba del hook sin campos nuevos en el resumen | Cumplido en unitarias |
| 2: catálogo | Pruebas de servicio, hook y vista: carga, error, reintento y catálogo vacío | Cumplido en unitarias |
| 3 y 4: paginación y respuestas obsoletas | Pruebas del hook de listado: cambio, continuación, reset, sesión, reintento y respuestas tardías | Cumplido en unitarias |
| 6: controles y convivencia | Pruebas de filtros, utilidad y vista | Cumplido en unitarias |
| Prueba manual con backend real | No ejecutada | Pendiente |

- Comprobaciones: 134 pruebas unitarias, typecheck y lint correctos. Build y git diff --check correctos. No se han ejecutado e2e, pruebas de integración ni prueba manual contra backend.
- Decisiones y desviaciones: se elimina implementación propia de backend y documentación duplicada. Consumir #214, incluida invalidación de cursores antiguos.
- Limitaciones: origin/dev ya está actualizado con #214; falta incorporarlo a la rama de trabajo y comprobar el flujo en navegador contra backend. No se afirma verificación manual del filtrado real.

### Bloque de commit 3: documentación

- Archivos: esta carpeta de especificación/plan y docs/2026-11-25-001-filtros-prioridad-categoria.md.
- Mensaje: docs: documentar filtros de prioridad y categoría web.
- Commit: pendiente de Artina.
- Después del commit de documentación: git merge origin/dev. Si hay conflictos, resolverlos antes de probar; no publicar sin incorporar el contrato integrado.

### Prueba manual pendiente

- Con backend de #214 y web actualizados, iniciar sesión como administración.
- Elegir prioridad y categoría por separado y juntas; comprobar que GET /incidents incluye priority/categoryId y no requiere cargar páginas sin filtrar.
- Cargar más si hay continuación: conservar los criterios y añadir cursor.
- Cambiar selección: primera petición sin cursor; no conservar filas anteriores.
- Limpiar: controles iniciales y primera página sin filtros de prioridad/categoría.
- Estado/fecha/orden siguen siendo locales; comprobar que la selección y los avisos se conservan.
- Registrar únicamente resultados realmente observados en este plan.
