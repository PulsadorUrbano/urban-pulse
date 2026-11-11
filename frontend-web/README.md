# Frontend web de Urban Pulse

Interfaz React y Vite para el panel municipal, escrita en TypeScript estricto. Incluye el acceso del personal municipal y la validación de incidencias, conectados al backend NestJS.

## Instalación y arranque

El componente usa npm y `package-lock.json`. Desde la raíz:

```bash
cd frontend-web
npm ci
npm run dev
```

Abre la dirección que muestre Vite. Consulta los requisitos de Node y npm en [desarrollo](../docs/development.md).

## API

`src/constants/config.ts` utiliza `VITE_BACKEND_URL` como URL base. Si no se define, usa `/api`. El archivo `.env.example` documenta las variables; cópialo a `.env.local` si necesitas cambiarlas.

En desarrollo, `vite.config.ts` redirige `/api` a `URBAN_PULSE_PROXY_URL` (por defecto `http://localhost:3000`) y elimina ese prefijo: `/api/auth/me` se envía como `/auth/me` al backend. Las imágenes de las incidencias se sirven igual: `/uploads/incidents/...` del backend se carga como `/api/uploads/incidents/...`.

En el despliegue con Compose, Nginx sirve la aplicación compilada y aplica el mismo proxy `/api/` al backend de la red interna. Consulta la [guía de despliegue](../docs/deployment.md).

Si la API se sirve desde otro origen, define `VITE_BACKEND_URL` con esa dirección; el backend tendría que permitir CORS, que hoy no activa.

### Comportamiento con el backend

| Funcionalidad | Endpoints | Sin conexión con el backend |
| --- | --- | --- |
| Inicio de sesión | `POST /auth/login`, `GET /auth/me` | En desarrollo, usa los usuarios simulados de `src/mocks/auth-mock.ts` y muestra un aviso, igual que la app móvil; en producción, muestra un error. Un `401` nunca cae al mock. |
| Restaurar sesión al recargar | `GET /auth/me` | Conserva la sesión guardada; un `401` la cierra. Una sesión simulada se descarta en cuanto el backend responde y no puede resolver incidencias. |
| Detalle de incidencia | `GET /incidents/:id` | Muestra el error y permite reintentar; no hay datos simulados. |
| Validar con prioridad | `PATCH /incidents/:id/status` y `PATCH /incidents/:id/priority` | Muestra el error. |
| Descartar con motivo | `PATCH /incidents/:id/status` | Muestra el error. |

Solo el personal municipal accede al panel: las cuentas `civic` se rechazan y se remiten a la app móvil (ADR 0002). La incidencia a validar se indica en la URL con `?incidencia=<id>`, porque el backend aún no ofrece un listado de incidencias pendientes para el personal.

## Scripts y comprobaciones

Desde `frontend-web/`:

| Comando | Función |
| --- | --- |
| `npm run dev` | Servidor Vite para desarrollo. |
| `npm run typecheck` | Comprobar tipos con TypeScript. |
| `npm run lint` | Ejecutar ESLint (con `typescript-eslint`). |
| `npm run build` | Comprobar tipos y generar la aplicación con Vite. |
| `npm run preview` | Previsualizar localmente el resultado de build. |
| `npm test` | Ejecutar las pruebas con Vitest. |
| `npm run test:watch` | Ejecutar Vitest en modo observación. |

## Estructura del subproyecto

La estructura y los nombres siguen a `frontend-mobile/src` para que los dos clientes describan los mismos datos de la misma forma.

| Ruta | Contenido |
| --- | --- |
| `src/main.tsx` y `src/App.tsx` | Entrada de React, sesión compartida y selección de pantallas. |
| `src/components/` | Vistas (`login-view.tsx`, `incident-validation-view.tsx`) y sus piezas: formulario de login, cuentas de prueba, consola técnica, cabecera, galería, resolución y modal de cierre de sesión. |
| `src/hooks/` | `use-auth.ts`, `use-incident-validation.ts` y `use-theme.ts`. |
| `src/services/` | `http.ts`, `auth.service.ts`, `token.service.ts`, `session-storage.service.ts` e `incident.service.ts`. |
| `src/types/` | Contratos de usuario, token, sesión e incidencias, alineados con el backend y el móvil. |
| `src/constants/config.ts` | URL del backend y de sus archivos. |
| `src/mocks/` | Usuarios simulados para el respaldo del login en desarrollo; no se incluyen en el build de producción. |
| `src/__tests__/` | Pruebas automatizadas. |
| `vite.config.ts`, `tailwind.config.ts`, `eslint.config.js`, `postcss.config.js` y `tsconfig.json` | Herramientas de desarrollo. `eslint.config.js` y `postcss.config.js` siguen en JavaScript porque esas herramientas lo exigen. |

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../docs/adr/).
