# {{fecha}} - Corrección de bug: {{asunto}}

- Desarrollador responsable: {{persona que solicita y asume el cambio}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador exacto; declarar si no está disponible}}.

> Copiar a backend/docs/spec/bugs/nombre-feature/DD-MM-YY-asunto.md. Si estaba registrado en bugs/todo.md, marcarlo como resuelto al terminar.

- Funcionalidad: {{nombre o independiente}}.
- Estado: pendiente.
- Referencias: {{issue y documentos relacionados}}.

## Contexto y diagnóstico

{{Síntoma observable, pasos para reproducir, resultado esperado y causa confirmada.}}

## Alcance y decisiones

{{Cambio mínimo, límites y decisiones justificadas.}}

## Archivos y tareas

| Archivo | Cambio | Estado |
| --- | --- | --- |
| {{ruta desde la raíz}} | {{responsabilidad}} | Pendiente |

## Verificación

- [ ] Verificar el fallo y su corrección con una prueba unitaria pertinente.
- [ ] Para código o dependencias: ejecutar desde backend/ pnpm run build, pnpm run lint y pnpm test; registrar resultados reales.
- [ ] Para documentación: comprobar enlaces, rutas y git diff --check, sin ejecutar servicios.
- [ ] Actualizar las fichas de endpoints si cambia su contrato.

No ejecutar e2e ni integración salvo petición explícita.

## Confirmación

- Estado final: {{resultado real y fecha}}.
- Comprobaciones: {{comandos y resultados, incluidos bloqueos}}.
- Decisiones y desviaciones: {{detalle o ninguna}}.
- Pendientes: {{detalle o ninguno}}.
