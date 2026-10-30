# {{AAAA-MM-DD}} — Plan de implementación: {{descripción de la acción o cambio}}

> Copiar a frontend-web/docs/spec/features/AAAA-MM-DD-nombre-feature/plan.md.

- Desarrollador responsable: {{nombre}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador y versión exactos o No utilizada}}.
- Historial de prompts: {{enlaces a ../../prompts/AAAA-MM-DD.md#NN}}.
- Objetivo: {{resultado observable definido por la especificación}}.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: {{rama de trabajo}}.
- Estado: pendiente de implementación y verificación.

## Restricciones

- Respetar el alcance de la especificación; no añadir requisitos implícitos.
- No modificar archivos fuera de `frontend-web/` salvo petición explícita.
- Dependencias nuevas solo con aprobación previa.
- Backend real primero con fallback y aviso claro si no hay conexión; no depurar el backend desde el frontend.
- Tests en `src/__tests__/<ruta-que-refleja-src>/`.
- Restricciones particulares: {{reglas de esta funcionalidad}}.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| {{crear/modificar}} | {{ruta exacta}} | {{responsabilidad}} |

## Tarea {{N}}: {{entregable concreto}}

**Archivos:** {{rutas}}. **Criterios cubiertos:** {{números de la spec}}.

- [ ] Definir el caso de prueba: {{entradas, resultado y errores}}.
- [ ] Implementar el cambio mínimo.
- [ ] Ejecutar la prueba y registrar evidencia: {{comando y resultado}}.
- [ ] Revisar el diff y actualizar spec, plan e historial de prompts.

## Comprobaciones finales

Ejecutar desde `frontend-web/`.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | Pendiente |
| Lint | npm run lint | Pendiente |
| Build | npm run build | Pendiente |
| Diff, desde la raíz | git diff --check | Pendiente |

## Confirmación de implementación

- Estado final: {{Pendiente / Implementación parcial / Implementado con verificación pendiente / Implementado y verificado}}.
- Fecha de revisión: {{AAAA-MM-DD}}.
- Resultado entregado: {{comportamiento realmente implementado}}.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| {{número y criterio}} | {{archivo, test o comprobación}} | {{Cumplido / Pendiente / Bloqueado}} |

- Decisiones y desviaciones: {{cambios respecto al plan y motivo, incluidas sugerencias de la IA descartadas}}.
- Limitaciones y pendientes: {{detalle o ninguno}}.
