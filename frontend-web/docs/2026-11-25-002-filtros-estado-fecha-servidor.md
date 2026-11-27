# Sesión — 2026-11-25 · Feature 25-11-26 · Filtros de estado y fecha en el servidor

- Desarrollador responsable: Alejandro (Alewuito).
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

## Contexto

Parte frontend de la #213. El backend ya filtra (#214) y la #215 conectó prioridad y categoría; estado, fecha y orden seguían filtrándose sobre lo cargado. Rama `feature/213-filtros-estado-fecha-servidor-frontend-web`.

## Alcance

Enviar al backend todos los filtros del listado y retirar el filtrado en el navegador.

## Decisiones clave

Se aceptan las fechas en UTC del backend y se conserva el intercambio de fechas invertidas, porque el backend rechaza `from` posterior a `to`.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/utils/incident-filters.ts`, `src/types/incident.ts` | `toPageFilters` y tipos de la petición |
| `src/hooks/use-incident-filters.ts`, `src/hooks/use-incident-list.ts` | Todos los criterios en la consulta |
| `src/services/incident.service.ts` | Parámetros nuevos |
| `src/components/incident-list-view.tsx` | Sin contador ni aviso parcial |
| `src/__tests__/` | Pruebas actualizadas |

## Checklist de la sesión

- [x] Conectar estado, fechas y orden al backend.
- [x] Pasar typecheck, lint, tests y build.
- [ ] Probar con el backend y el seed.

## Documentos actualizados

[Especificación](spec/features/25-11-26-filtros-estado-fecha-servidor/spec.md) y [plan](spec/features/25-11-26-filtros-estado-fecha-servidor/plan.md).

## Estado / Verificación

132 pruebas correctas; typecheck, lint y build sin errores.

## Pendiente / diferido

Prueba manual con el backend.
