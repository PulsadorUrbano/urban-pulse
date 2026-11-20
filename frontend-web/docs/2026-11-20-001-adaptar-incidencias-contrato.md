# Sesión — 2026-11-20 · Feature 20-11-26 · Adaptar el panel web al contrato de incidencias

- **Desarrollador responsable.** Artina (`artina09`).
- **Asistente de IA.** Codex.
- **Modelo de IA.** GPT-6. Identificador exacto de la sesión no disponible.

## Contexto

El panel web debe adaptarse al contrato de la #185 y a las reglas de asignación recogidas en la #192. El borrador se ha preparado en la copia local de `dev`.

## Alcance

Preparar el plan y la especificación de las dos PRs web.

## Decisiones clave

- La primera PR web prepara el panel para funcionar tanto con el backend actual como con la #185. Cada cambio verificable se propone como un commit que hará Artina.
- Tras integrar la #185, una segunda PR web habilitará la reasignación de reabiertas y los comentarios opcionales. El contrato actual de asignación todavía rechaza `cause`.
- Artina ha confirmado el plan y ha elegido `fix/compatibilidad-incidencias-web` y `feature/completar-asignaciones-web`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| [Plan de implementación](spec/features/20-11-26-adaptar-incidencias-contrato/plan.md) | Borrador con el mapa de archivos, las tareas, los puntos de commit y las verificaciones |
| [Especificación](spec/features/20-11-26-adaptar-incidencias-contrato/spec.md) | Contrato del panel y criterios de aceptación de ambas PRs |

## Checklist de la sesión

- [x] Revisar los contratos de la #185, la #192 y la estructura de documentos del frontend web.
- [x] Crear el plan de implementación.
- [x] Ajustar el orden a dos PRs web, una antes y otra después de la #185.
- [x] Revisar el plan con Artina.
- [x] Crear la especificación tras su aprobación.
- [ ] Hacer el commit de documentación en la rama de la primera PR.

## Documentos actualizados

[Plan de implementación](spec/features/20-11-26-adaptar-incidencias-contrato/plan.md) y [especificación](spec/features/20-11-26-adaptar-incidencias-contrato/spec.md).

## Estado / Verificación

Plan revisado y especificación redactada. Las comprobaciones del código y del flujo real quedan pendientes de la implementación.

## Pendiente / diferido

Primer commit de documentación e implementación de la PR web de compatibilidad.
