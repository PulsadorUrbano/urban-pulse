# {{fecha}} — Refactor: {{asunto}}

> Crear únicamente este documento. Copiar a frontend-web/docs/spec/refactor/nombre-feature/DD-MM-YY-asunto.md, o a frontend-web/docs/spec/refactor/independent/DD-MM-YY-asunto.md si no pertenece a una feature concreta.

- Desarrollador responsable: {{nombre}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador y versión exactos o No utilizada}}.

- Feature afectada: {{nombre de la feature o "independiente"}}.
- Rama: {{rama de trabajo}}.
- Última actualización: {{AAAA-MM-DD}}.
- Estado: {{Pendiente / Implementación parcial / Implementado con verificación pendiente / Implementado y verificado}}.

## Motivo

{{Qué llevó a refactorizar: deuda técnica, duplicación, inconsistencia con las convenciones de CLAUDE.md, migración de JSX a TSX, preparación para una feature futura, etc. Una refactorización no cambia comportamiento observable; si el motivo real es corregir un comportamiento, esto es un bug, no un refactor — usar bug-template.md.}}

## Alcance

- Alcance confirmado: {{qué se reestructura o reescribe, concretamente}}.
- Fuera de alcance: {{qué no se toca aunque esté relacionado}}.
- Comportamiento preservado: {{qué garantiza que la UI/el flujo se ve y funciona igual que antes}}.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| {{crear/modificar/eliminar}} | {{ruta exacta}} | {{responsabilidad}} |

## Verificación

- [ ] Registrar el comportamiento observado antes del cambio (capturas, pasos manuales o test existente) para poder comparar: {{detalle}}.
- [ ] Aplicar el refactor.
- [ ] Confirmar que el comportamiento es el mismo que antes: {{mismos pasos, mismo resultado}}.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores nuevos.
- [ ] Tests existentes en `src/__tests__/` siguen pasando; no se elimina cobertura salvo que el código que cubrían también se elimine.

## Confirmación

- Estado final: {{Implementado con verificación pendiente / Implementado y verificado}}.
- Fecha de revisión: {{AAAA-MM-DD}}.
- Resultado entregado: {{qué quedó reestructurado realmente}}.
- Decisiones y desviaciones: {{cambios respecto al plan inicial del refactor y su motivo}}.
- Limitaciones y pendientes: {{detalle o ninguno}}.
