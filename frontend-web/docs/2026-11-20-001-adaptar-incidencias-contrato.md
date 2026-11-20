# Sesión — 2026-11-20 · Feature 20-11-26 · Adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA.** GPT-6. Identificador exacto de la sesión no disponible.

## Contexto

El panel web debe adaptarse al contrato de la #185 y a las reglas de asignación recogidas en la #192. El borrador se ha preparado en la copia local de `dev`.

## Alcance

Preparar el plan y la especificación, adaptar el panel a los estados nuevos, aplicar el acceso provisional al listado global y exigir departamento y equipo al guardar.

## Decisiones clave

- La primera PR web prepara el panel para funcionar tanto con el backend actual como con la #185. Cada cambio verificable se propone como un commit que hará Artina.
- Tras integrar la #185, una segunda PR web habilitará la reasignación de reabiertas y los comentarios opcionales. El contrato actual de asignación todavía rechaza `cause`.
- Artina ha confirmado el plan y ha elegido `fix/compatibilidad-incidencias-web` y `feature/completar-asignaciones-web`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| [Plan de implementación](spec/features/20-11-26-adaptar-incidencias-contrato/plan.md) | Tareas, puntos de commit y verificación del bloque de estados |
| [Especificación](spec/features/20-11-26-adaptar-incidencias-contrato/spec.md) | Contrato del panel y criterios de aceptación de ambas PRs |
| `src/types/incident.ts`, `src/services/incident.service.ts`, `src/constants/incident-labels.ts` | Estados nuevos y etiquetas en las respuestas del listado y el detalle |
| `src/components/incident-validation-view.tsx`, `src/__tests__/` | Prioridad visible en incidencias tramitadas y pruebas de regresión |
| `src/App.tsx`, `src/types/user.ts`, `src/components/incident-list-view.tsx` | Acceso al listado y criterio compartido para administración |
| `src/hooks/use-incident-assignment.ts`, `src/components/incident-assignment-view.tsx`, `src/mocks/assignment-mock.ts` | Selección completa para guardar, técnico opcional y misma regla en la demo |

## Checklist de la sesión

- [x] Revisar los contratos de la #185, la #192 y la estructura de documentos del frontend web.
- [x] Crear el plan de implementación.
- [x] Ajustar el orden a dos PRs web, una antes y otra después de la #185.
- [x] Revisar el plan con Artina.
- [x] Crear la especificación tras su aprobación.
- [x] Hacer el commit de documentación en `fix/compatibilidad-incidencias-web` (`c58c5c5`).
- [x] Implementar y comprobar los estados nuevos del listado y el detalle.
- [x] Hacer el commit del bloque de estados (`9a3a5a3`).
- [x] Implementar y probar el acceso provisional al listado y el formulario del detalle según el rol.
- [x] Hacer el commit del bloque de acceso (`8570368`).
- [x] Implementar y probar la selección obligatoria de departamento y equipo.
- [x] Hacer el commit del bloque de asignación (`eac841a`).
- [x] Revisar el diff de la primera PR, repetir las comprobaciones automatizadas y contrastar los cuerpos de asignación con los validadores de `dev` y de la #185.
- [ ] Abrir la primera PR web para revisión.

## Documentos actualizados

[Plan de implementación](spec/features/20-11-26-adaptar-incidencias-contrato/plan.md) y [especificación](spec/features/20-11-26-adaptar-incidencias-contrato/spec.md).

## Estado / Verificación

La rama completa pasó las 76 pruebas unitarias, el typecheck, el lint, la compilación y `git diff --check`. Los validadores de `dev` y de la #185 aceptaron los cuerpos de asignación comprobados con dobles. El motor de Docker y el backend local estaban inactivos. Queda pendiente el recorrido con el backend.

## Pendiente / diferido

Apertura y revisión de la primera PR web y prueba del flujo con el backend.
