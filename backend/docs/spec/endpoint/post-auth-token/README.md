# POST /auth/token (retirado)

- Estado: retirado en esta entrega. La ruta ya no existe y responde `404`.
- Última revisión: 2026-10-31.
- Método y ruta anterior: `POST /auth/token`, con cuerpo `{ "userId": "<uuid>" }`.
- Finalidad anterior: emitir un JWT para un usuario existente sin contraseña.

## Motivo de la retirada

Cualquiera que conociera un `userId` obtenía un token de ese usuario, incluido el administrador de desarrollo, cuyo id es fijo y aparece en la documentación de Swagger.

## Sustitución

- Para obtener token: [POST /auth/login](../post-auth-login/README.md).
- Para validar sesión: [GET /auth/me](../get-auth-me/README.md).

## Consumidores afectados

- La petición web de `src/services/authService.ts` usa ahora `POST /auth/login` con `usernameOrEmail` y `password`. El móvil también utiliza ese endpoint desde `src/services/auth.service.ts`. Se mantienen los mecanismos mock existentes de ambos clientes.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
