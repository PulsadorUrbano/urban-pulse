# Frontend web de Urban Pulse

Interfaz React y Vite para el panel municipal. Incluye pantallas de acceso y validación de incidencias, servicios de autenticación y tipos TypeScript. El servicio de incidencias proporciona datos simulados; la sesión también incluye comportamiento de demostración.

## Instalación y arranque

El componente usa npm y `package-lock.json`. Desde la raíz:

```bash
cd frontend-web
npm ci
npm run dev
```

Abre la dirección que muestre Vite. Consulta los requisitos de Node y npm en [desarrollo](../docs/development.md).

## Configuración de API

`src/services/authService.ts` utiliza `VITE_BACKEND_URL` como URL base. Si no se define, usa `/api`.

En desarrollo, `vite.config.js` redirige `/api` a `http://localhost:3000` y elimina ese prefijo: `/api/auth/me` se envía como `/auth/me` al backend. El proxy pertenece al servidor de desarrollo de Vite.

Para una dirección diferente, define `VITE_BACKEND_URL` en el entorno de Vite. El componente no tiene un archivo de ejemplo de entorno. La preparación de la API está en el [README del backend](../backend/README.md).

## Scripts

Desde `frontend-web/`:

| Comando | Función |
| --- | --- |
| `npm run dev` | Servidor Vite para desarrollo. |
| `npm run lint` | Ejecutar ESLint. |
| `npm run build` | Generar la aplicación con Vite. |
| `npm run preview` | Previsualizar localmente el resultado de build. |
| `npm test` | Ejecutar las pruebas con Vitest. |
| `npm run test:watch` | Ejecutar Vitest en modo observación. |

La suite incluye pruebas del servicio de autenticación. Los procedimientos se han contrastado por lectura, sin ejecutar instalación, compilación, lint, pruebas ni servicios durante esta revisión documental.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/main.jsx` y `src/App.jsx` | Entrada de React y selección de pantallas. |
| `src/components/` | Vistas de acceso y validación. |
| `src/hooks/` | Lógica de autenticación y validación de incidencias. |
| `src/services/` | Servicios de autenticación e incidencias. |
| `src/types/` | Tipos de autenticación. |
| `src/__tests__/` | Pruebas automatizadas. |
| `src/index.css` y configuración Tailwind | Estilos. |
| `vite.config.js`, `eslint.config.js` y `tsconfig.json` | Herramientas de desarrollo. |

La aplicación combina JavaScript/JSX y TypeScript. Los servidores `dev` y `preview` se utilizan para desarrollo y previsualización; el alcance del despliegue está en la [guía general](../docs/deployment.md).

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../backend/docs/adr/).
