# ADR 0004: Stack del frontend web (React con Vite)

- Estado: Aceptado.
- Fecha de registro: 2026-10-27.
- Relacionados: [ADR 0002 - Dos frontends separados](0002-two-frontend.md), [ADR 0005 - Stack del frontend móvil](0005-frontend-mobile-stack.md).

## Contexto

Según el [ADR 0002](0002-two-frontend.md), `frontend-web/` es el panel del personal municipal y de los analistas: inicio de sesión, validación y rechazo de incidencias, asignación, priorización, colaboración y consulta de contexto e indicadores. Es una aplicación interna, con sesión autenticada y sin necesidad de posicionamiento en buscadores.

Condiciones de partida:

- El backend es una API REST en NestJS con autenticación JWT (`POST /auth/login`, `GET /auth/me`); el cliente web solo consume esa API.
- El equipo ya usa React a través de React Native en `frontend-mobile/`, también con TypeScript.
- Se necesita desarrollar sin depender siempre del backend levantado (patrón de backend real primero con fallback local) y con pruebas unitarias.

## Decisión

Construir el frontend web como una SPA con este stack (versiones de `frontend-web/package.json`):

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Librería de UI | React 19 | Mismo modelo de componentes y hooks que React Native en el móvil; el conocimiento se comparte entre equipos. |
| Herramienta de build y servidor de desarrollo | Vite 8 con `@vitejs/plugin-react` | Arranque y recarga instantáneos, build de producción estático y proxy de desarrollo (`/api` hacia `http://localhost:3000`) que evita problemas de CORS con NestJS. |
| Lenguaje | TypeScript 5 (migración progresiva desde JSX) | Tipos explícitos para los contratos de la API; por ejemplo, `ProfileRole` en `src/types/auth.ts` refleja el enum `profile_role` del backend. Las piezas nuevas (autenticación) ya están en TypeScript. |
| Estilos | Tailwind CSS 3 (PostCSS y Autoprefixer) | Utilidades rápidas para paneles y tablas, con modo oscuro, sin mantener hojas de estilo propias. Coherente con NativeWind (Tailwind) en el móvil. |
| Iconos | lucide-react | Iconos SVG ligeros e importables por separado. |
| Pruebas | Vitest 5 | Integrado con Vite y con la misma API que usa el backend (también Vitest). Pruebas en `src/__tests__/`. |
| Calidad | ESLint 10 con `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh` | Detecta usos incorrectos de hooks y problemas de recarga en caliente. |

Comandos de referencia, desde `frontend-web/`: `npm run dev`, `npm run lint`, `npm run test` y `npm run build`.

## Alternativas consideradas

- **Next.js.** Su principal ventaja (renderizado en servidor y SEO) no aporta en un panel interno autenticado, y añadiría un servidor Node propio junto al backend NestJS. Se descarta por complejidad innecesaria.
- **Angular.** Es un framework completo y opinado, pero obliga a aprender un paradigma distinto al de React Native y no reutiliza el conocimiento del equipo móvil.
- **Vue.** Es válido técnicamente, pero tampoco comparte modelo ni ecosistema con React Native.
- **Create React App.** Está abandonado y es más lento que Vite; se descarta.
- **Expo para web (reutilizar la app móvil).** Descartado en el [ADR 0002](0002-two-frontend.md).

## Consecuencias

Positivas:

- La SPA estática se puede servir desde cualquier hosting o CDN, sin servidor de aplicación propio.
- El equipo comparte conocimiento de React, TypeScript y Tailwind entre la web y el móvil.
- Ciclo de desarrollo rápido, con proxy al backend local y pruebas unitarias que se ejecutan en milisegundos.

Negativas y riesgos:

- Conviven archivos `.jsx` y `.tsx`; hay que completar la migración a TypeScript para que todo el código tenga tipos.
- Sin renderizado en servidor, la primera carga depende del bundle de JavaScript; es aceptable en un panel interno.
- La navegación entre vistas se gestiona hoy con estado en `App.jsx`. Cuando crezca el número de pantallas habrá que decidir un enrutador (por ejemplo, React Router) y registrarlo en un ADR nuevo.
- El proxy de Vite solo actúa en desarrollo; en producción la URL del backend se indica con la variable `VITE_BACKEND_URL` (`src/services/authService.ts`), que hay que definir en cada entorno de despliegue.
