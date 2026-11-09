# {{AAAA-MM-DD}} — Bug: {{asunto}}

> Copiar a frontend-web/docs/spec/bugs/nombre-feature/AAAA-MM-DD-asunto.md. Si venía de `bugs/todo.md`, marcarlo como resuelto ahí.

- Feature afectada: {{nombre de la feature o "independiente"}}.
- Desarrollador responsable: {{nombre}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador y versión exactos o No utilizada}}.
- Historial de prompts: {{enlaces a ../../prompts/AAAA-MM-DD.md#NN}}.
- Rama: {{rama de trabajo}}.
- Estado: {{Pendiente / En diagnóstico / Corregido con verificación pendiente / Corregido y verificado}}.

## Síntoma observado

{{Qué falla, en qué vista y con qué entrada concreta.}}

## Diagnóstico

- Archivo y línea de la causa: {{ruta}}.
- Causa: {{explicación concreta, no una suposición}}.

## Corrección aplicada

{{Cambio mínimo que soluciona la causa.}}

| Acción | Archivo |
| --- | --- |
| {{crear/modificar}} | {{ruta}} |

## Verificación

- [ ] Reproducir el fallo antes del cambio: {{pasos y resultado}}.
- [ ] Confirmar que ya no ocurre: {{pasos y resultado}}.
- [ ] `npm run lint` y `npm run test` sin errores nuevos.
