# UrbanPulse (frontend-web)

Panel web de UrbanPulse para el personal municipal: React 19 + Vite, TypeScript/JSX, Tailwind CSS 3 y Vitest. La aplicación móvil (ciudadanía) vive en `frontend-mobile/` y el backend NestJS en `backend/`.

## Comandos

Ejecutar desde `frontend-web/`:

```bash
npm run dev     # servidor de desarrollo (proxy /api -> http://localhost:3000)
npm run lint
npm run test
npm run build
```

## Reglas

- Confinar los cambios a `frontend-web/`. `backend/`, `frontend-mobile/` y `database/` son de solo lectura.
- Consumir el backend real primero y caer a un fallback local con aviso claro si no hay conexión. No depurar el backend desde aquí.
- Tests en `src/__tests__/` reflejando la ruta de `src/`.
- No instalar dependencias, crear commits ni hacer push sin petición explícita.
- Para ramas, commits y PR, seguir el `README.md` de la raíz.

## Specs y trazabilidad (`docs/spec/`)

- La estructura de carpetas, las plantillas y la diferencia entre `spec.md` y `plan.md` están documentadas en `docs/spec/README.md` — es la única fuente de verdad, no se duplica aquí. Es la misma que `frontend-mobile/docs/spec/`.
- Cada feature, bug, refactor o cambio de documentación se documenta ahí y declara el desarrollador responsable, el asistente de IA y el modelo exacto utilizados. No existe historial de prompts: no crear `docs/spec/prompts/`.
- La skill `trazabilidad` (`.claude/skills/trazabilidad/`) aplica este flujo; usarla siempre que se haga una feature, fix, refactor o docs.

## Documentación de sesión y seguimiento de tareas (`docs/`)

- Mantén el progreso de la sesión dentro del directorio `docs/`, en `docs/AAAA-MM-DD-NNN-nombre.md`.
- Documenta notas de sesión y mantén una lista de tareas estructurada que detalle todas las tareas completadas y sus subtareas (p. ej. usando checkboxes `- [x]` / `- [ ]`).
- Actualiza este registro al completar cada tarea para que el trabajo en curso y el pasado quede transparente y trazable entre sesiones.
