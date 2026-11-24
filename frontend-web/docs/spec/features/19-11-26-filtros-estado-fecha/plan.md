# 2026-11-19 — Plan de implementación: filtrar el listado de incidencias por estado y fecha

- Objetivo: filtrar el listado del panel por estado, ordenarlo por fecha y acotarlo por días.
- Arquitectura: utilidad pura, hook y componente nuevos sobre el listado existente; sin cambios en servicios.
- Herramientas: React 19, Tailwind 3, `lucide-react` y Vitest ya instalados.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: feature/173-filtros-estado-fecha-frontend-web.
- Estado: implementado y verificado con pruebas unitarias; prueba manual en navegador pendiente.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Identificadores en inglés y textos en español; TypeScript estricto sin `any`; estilos solo con Tailwind.
- No instalar dependencias ni tocar `backend/` o `frontend-mobile/`.
- Restricciones particulares: no enviar parámetros nuevos a `GET /incidents`, porque el backend los rechaza con 400 hasta que exista #44.

## Focos de revisión

- Días en hora local: un `createdAt` a las 00:10 o a las 23:30 debe entrar en su día (criterio 3, caso «filtra un único día completo»).
- Resultado parcial: no avisar cuando el rango ya está cubierto y sí cuando no lo está (criterio 4).
- Orden estable: desempate por id con fechas iguales (criterio 2).

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | frontend-web/src/types/incident.ts | Tipos `IncidentListFilters`, `IncidentStatusFilter` e `IncidentSortOrder`. |
| Modificar | frontend-web/src/constants/incident-labels.ts | Opciones de estado y etiquetas del orden. |
| Crear | frontend-web/src/utils/incident-filters.ts | Filtrado, orden y detección de resultado parcial. |
| Crear | frontend-web/src/hooks/use-incident-filters.ts | Estado de los filtros y lista visible. |
| Crear | frontend-web/src/components/incident-filters.tsx | Controles de estado, orden y rango. |
| Modificar | frontend-web/src/components/incident-list-view.tsx | Integrar filtros, contador y avisos. |
| Crear | frontend-web/src/__tests__/utils/incident-filters.test.ts | Pruebas unitarias. |
| Crear | frontend-web/docs/spec/features/19-11-26-filtros-estado-fecha/ | Especificación y plan. |

## Preparación

- [x] Leer `frontend-web/CLAUDE.md`, `estilo-codigo-web`, `diseno-web` y el código del listado.
- [x] Revisar el contrato de `GET /incidents` en el backend (solo lectura).
- [x] Crear la rama desde `origin/dev` (`45037fb`).

## Tarea 1: lógica de filtrado

**Archivos:** `src/types/incident.ts`, `src/constants/incident-labels.ts`, `src/utils/incident-filters.ts` y su test.

**Criterios cubiertos:** 1, 2, 3, 4 y 5.

- [x] Definir los casos: estado, orden inverso, desempate, día completo, rangos abiertos e invertidos, combinación, inmutabilidad, valores desconocidos y resultado parcial.
- [x] Implementar `applyIncidentFilters`, `isFilterResultPartial`, `hasActiveFilters`, `parseStatusFilter` y `parseSortOrder`.
- [x] Ejecutar `npm run test`: 14 casos nuevos correctos.

## Tarea 2: hook y componente

**Archivos:** `src/hooks/use-incident-filters.ts`, `src/components/incident-filters.tsx` y `src/components/incident-list-view.tsx`.

**Criterios cubiertos:** 1 a 5 en la interfaz.

- [x] Hook con los filtros en memoria y la lista visible derivada con `useMemo`.
- [x] Panel con selector de estado, selector de orden, «Desde» y «Hasta» enlazados con `min`/`max`, y «Limpiar filtros».
- [x] Contador de coincidencias, aviso ámbar de resultado parcial y mensaje sin coincidencias.
- [ ] Probar en el navegador con el backend: modo claro y oscuro y ancho de 375 px.

## Comprobaciones finales

Ejecutadas desde frontend-web/ con Node 22.14.0.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | 10 archivos, 92 pruebas correctas tras rebasar sobre `dev` (16 nuevas de esta feature) |
| Typecheck | npm run typecheck | Sin errores |
| Lint | npm run lint | Sin errores |
| Build | npm run build | Correcto |
| Diff, desde la raíz | git diff --check | Sin errores |

- [x] Cada criterio de aceptación tiene evidencia.
- [x] No se tocaron `backend/`, `frontend-mobile/`, dependencias ni credenciales.

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente.
- Fecha de revisión: 2026-11-20.
- Resultado entregado: filtros de estado, orden y rango de días en el listado del panel web.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Filtro por estado | Caso «filtra por estado» | Cumplido |
| 2. Orden inverso y desempate | Casos «ordena de más antigua a más reciente» y «desempata por id» | Cumplido |
| 3. Rango de días | Casos de día completo, rangos abiertos e invertidos, y `withDateRange` para los calendarios | Cumplido |
| 4. Aviso de resultado parcial | Bloque «resultado parcial al filtrar sobre páginas cargadas»; texto con «Reintentar» si falla la carga | Cumplido |
| 5. Limpiar y valores desconocidos | Caso «interpreta los valores de los controles»; `reset` vuelve a `DEFAULT_INCIDENT_FILTERS` | Cumplido |

- Comprobaciones: ver la tabla anterior.
- Decisiones y desviaciones: los filtros se aplican en el navegador, como decidió el usuario, hasta que exista #44.
- Correcciones tras la revisión de la #198 (artina09, 2026-11-20): los calendarios guardan el rango ya ordenado con `withDateRange` en lugar de mostrar las fechas invertidas, y el aviso de resultado parcial remite a «Reintentar» cuando falla «Cargar más».
- Rebase sobre `dev` (2026-11-20) tras la #201: el listado se pinta solo con sesión de administración (`token &&`) y el filtro de estado incluye los estados nuevos (`in_progress`, `resolved`, `reopened` y `closed`).
- Limitaciones y pendientes: falta la prueba manual en navegador con el backend levantado. Con estado u orden inverso el resultado solo cubre lo cargado, y la interfaz lo avisa. Cuando el backend filtre (#44), `useIncidentFilters` debe enviar los filtros y reiniciar la paginación.
