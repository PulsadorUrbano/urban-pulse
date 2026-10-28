# {{fecha}} — Bug: {{asunto}}

> Crear únicamente este documento. Copiar a frontend-web/docs/spec/bugs/nombre-feature/DD-MM-YY-asunto.md. Si el bug venía de `bugs/todo.md`, marcarlo como resuelto ahí (quitar o tachar la línea) al terminar.

- Desarrollador responsable: {{nombre}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA: {{identificador y versión exactos o No utilizada}}.

- Feature afectada: {{nombre de la feature o "independiente"}}.
- Rama: {{rama de trabajo}}.
- Última actualización: {{AAAA-MM-DD}}.
- Estado: {{Pendiente / En diagnóstico / Corregido con verificación pendiente / Corregido y verificado}}.
- Origen: {{entrada de bugs/todo.md, reporte del usuario o hallazgo propio}}.

## Síntoma observado

{{Qué falla exactamente, en qué vista/flujo y con qué entrada o condición concreta. No describir una hipótesis como si fuera el síntoma.}}

## Diagnóstico

- Archivo y línea donde está la causa real: {{ruta exacta}}.
- Causa: {{explicación concreta, no una suposición; si hace falta reproducir el fallo para confirmarla, decirlo}}.
- Alcance del fallo: {{a qué otras vistas/flujos afecta o si está aislado}}.
- Si el fallo está en el backend: reportarlo y no intentar depurarlo ni arreglarlo desde el frontend (ver `frontend-web/CLAUDE.md`), salvo que se pida explícitamente.

## Corrección aplicada

{{Cambio mínimo que soluciona la causa, no el síntoma. No añadir refactors ni mejoras fuera del bug.}}

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| {{crear/modificar}} | {{ruta exacta}} | {{responsabilidad}} |

## Verificación

- [ ] Reproducir el fallo antes del cambio y registrar el resultado: {{pasos o comando concreto y resultado observado}}.
- [ ] Aplicar la corrección.
- [ ] Confirmar que el síntoma ya no ocurre: {{mismos pasos, resultado esperado}}.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores nuevos.
- [ ] Tests en `src/__tests__/<ruta-que-refleja-src>/` si el bug es cubrible con un test (no crear tests solo para registrar texto).

## Confirmación

- Estado final: {{Corregido con verificación pendiente / Corregido y verificado}}.
- Fecha de revisión: {{AAAA-MM-DD}}.
- Evidencia de que no reaparece: {{comando/caso de prueba ejecutado y resultado real}}.
- Limitaciones y pendientes: {{detalle o ninguno}}.
