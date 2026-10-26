# POST /auth/token (retirado)

- Estado: retirado en esta entrega. La ruta ya no existe y responde `404`.
- Última revisión: 2026-10-25.
- Método y ruta anterior: `POST /auth/token`, con cuerpo `{ "userId": "<uuid>" }`.
- Finalidad anterior: emitir un JWT para un usuario existente sin contraseña.

## Motivo de la retirada

Cualquiera que conociera un `userId` obtenía un token de ese usuario, incluido el administrador de desarrollo, cuyo id es fijo y aparece en la documentación de Swagger.

## Sustitución

- Para obtener token: [POST /auth/login](../post-auth-login/README.md).
- Para validar sesión: [GET /auth/me](../get-auth-me/README.md).

## Consumidores afectados

- `frontend-web` (`src/services/authService.ts`) y `frontend-mobile` (`src/services/token.service.ts`) llaman a esta ruta. Al recibir `404` usan su token simulado hasta que se migren a `POST /auth/login`.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
