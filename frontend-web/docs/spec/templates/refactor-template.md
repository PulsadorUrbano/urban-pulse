# {{fecha}} — Refactor: {{asunto}}

> Copiar a frontend-web/docs/spec/refactor/nombre-feature/DD-MM-YY-asunto.md, o a refactor/independent/ si no pertenece a una feature.

- Feature afectada: {{nombre de la feature o "independiente"}}.
- Desarrollador responsable: {{nombre}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador y versión exactos o No utilizada}}.
- Rama: {{rama de trabajo}}.
- Estado: {{Pendiente / Implementado con verificación pendiente / Implementado y verificado}}.

## Motivo

{{Deuda técnica, duplicación, inconsistencia, etc. Si cambia comportamiento observable, es un bug o una feature.}}

## Alcance

- Alcance confirmado: {{qué se reestructura}}.
- Fuera de alcance: {{qué no se toca}}.
- Comportamiento preservado: {{qué garantiza que todo funciona igual}}.

| Acción | Archivo |
| --- | --- |
| {{crear/modificar/eliminar}} | {{ruta}} |

## Verificación

- [ ] Comportamiento registrado antes del cambio: {{detalle}}.
- [ ] Mismo comportamiento después: {{detalle}}.
- [ ] `npm run lint`, `npm run test` y `npm run build` sin errores nuevos.
