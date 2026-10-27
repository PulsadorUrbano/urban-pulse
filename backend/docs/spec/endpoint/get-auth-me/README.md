# GET /auth/me

- Estado: implementado, verificación pendiente (sin ejecución de pruebas).
- Última revisión: 2026-10-25.
- Método y ruta: `GET /auth/me`.
- Finalidad: validar la sesión y devolver los datos actuales del usuario.
- Acceso: Bearer JWT válido y usuario existente en la base de datos.

## Entrada

Cabecera `Authorization: Bearer <accessToken>`. Sin cuerpo.

## Respuesta

`200 OK`:

```json
{
  "userId": "8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6",
  "username": "ciudadano",
  "email": "ciudadano@urbanpulse.dev",
  "role": "civic",
  "phone": null
}
```

Los datos se leen de la base de datos, no del token. No incluye `password`.

## Errores

| Código | Condición |
| --- | --- |
| `401` | Falta la cabecera, el esquema no es `Bearer`, el token es inválido o ha expirado, o el usuario del token ya no existe. |

## Almacenamiento

Lectura de `users` y `citizens`. Requiere PostgreSQL activo.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
- Código: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/auth/jwt-auth.guard.ts`, `backend/src/auth/current-user.decorator.ts`.
