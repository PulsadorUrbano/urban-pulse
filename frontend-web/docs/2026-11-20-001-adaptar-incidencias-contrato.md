# Sesión — 2026-11-20 · Feature 20-11-26 · Adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA.** GPT-6. Identificador exacto de la sesión no disponible.

## Contexto

El panel web debe adaptarse al contrato de la #185 y a las reglas de asignación recogidas en la #192. El borrador se ha preparado en la copia local de `dev`.

## Alcance

Preparar el plan y la especificación de las dos PRs web y adaptar el listado y el detalle a los estados nuevos.

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

## Checklist de la sesión

- [x] Revisar los contratos de la #185, la #192 y la estructura de documentos del frontend web.
- [x] Crear el plan de implementación.
- [x] Ajustar el orden a dos PRs web, una antes y otra después de la #185.
- [x] Revisar el plan con Artina.
- [x] Crear la especificación tras su aprobación.
- [x] Hacer el commit de documentación en `fix/compatibilidad-incidencias-web` (`c58c5c5`).
- [x] Implementar y comprobar los estados nuevos del listado y el detalle.
- [ ] Hacer el commit del bloque de estados.

## Documentos actualizados

[Plan de implementación](spec/features/20-11-26-adaptar-incidencias-contrato/plan.md) y [especificación](spec/features/20-11-26-adaptar-incidencias-contrato/spec.md).

## Estado / Verificación

Pasaron las 66 pruebas unitarias, el typecheck, el lint y la compilación. La verificación del flujo con el backend queda pendiente.

## Pendiente / diferido

Commit del bloque de estados. El siguiente bloque de la primera PR es el acceso provisional al listado.
