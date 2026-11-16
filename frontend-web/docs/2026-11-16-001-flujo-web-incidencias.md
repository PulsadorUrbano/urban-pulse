# Sesión - 2026-11-16 · Feature 16-11-26 · Flujo web de incidencias

- Desarrolladora responsable: Artina.
- Asistente de IA: Codex.
- Modelo de IA: GPT-6 (identificador exacto de versión no disponible).

## Contexto

Trabajo en `feature/flujo-web-incidencias`. El listado abrirá un detalle que requiere autenticación.

## Alcance

Ajustar las peticiones de detalle, estado y prioridad al contrato vigente de la API.

## Decisiones clave

Reutilizar `bearerHeader` y pasar el token de sesión al detalle desde sus dos puntos de entrada. El backend obtiene el autor del JWT.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/App.tsx`, `src/components/incident-validation-view.tsx`, `src/hooks/use-incident-validation.ts` | Propagación del JWT en el flujo de validación |
| `src/services/incident.service.ts`, `src/services/assignment.service.ts`, `src/types/incident.ts` | Peticiones autenticadas y cuerpos ajustados |
| `src/__tests__/services/` | Cobertura de cabeceras y cuerpos |

## Checklist de la sesión

- [x] Ajustar la autenticación y verificar las pruebas unitarias.
- [ ] Implementar listado y navegación.
- [ ] Integrar asignaciones en el detalle.

## Documentos actualizados

[Especificación](spec/features/16-11-26-flujo-web-incidencias/spec.md) y [plan](spec/features/16-11-26-flujo-web-incidencias/plan.md).

## Estado / Verificación

55 pruebas unitarias correctas. Typecheck, lint y build pendientes por dependencias locales ausentes. Los resultados detallados quedan en el plan.

## Pendiente / diferido

Commit del primer bloque a cargo de Artina. Quedan el listado, el formulario integrado y la prueba con datos reales.
