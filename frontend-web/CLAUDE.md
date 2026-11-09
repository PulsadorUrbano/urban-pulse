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

## Trazabilidad de IA (obligatoria)

La estructura, plantillas y flujo están en `docs/spec/README.md`, que es la única fuente de verdad. En resumen, en cada sesión que use IA:

1. Abrir o crear `docs/spec/prompts/AAAA-MM-DD.md` (fecha de hoy) desde `docs/spec/templates/prompts-template.md`.
2. Añadir una entrada por cada prompt que produzca un cambio: prompt literal, asistente, modelo exacto, rama, resultado y archivos tocados.
3. Si el cambio es una feature, bug o refactor, crear también su documento en `docs/spec/` y enlazarlo con la entrada del prompt.
4. Incluir el historial del día en el mismo commit o PR que los cambios.
