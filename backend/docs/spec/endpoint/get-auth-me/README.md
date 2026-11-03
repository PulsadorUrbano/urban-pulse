# GET /auth/me

- Estado: implementado; unitarias, compilación y lint verificados en la fusión. Sin pruebas HTTP ni DB real.
- Última revisión: 2026-10-27.
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

## Validación del token en feature-login

Se exige una cabecera Authorization con exactamente Bearer y un token, sin segmentos extra. La firma debe ser HS256. Las claims deben formar un objeto con sub/userId UUID coincidentes (comparación sin distinguir mayúsculas), username no vacío, role perteneciente al enum profile_role, iat y exp enteros finitos y exp > iat. exp es obligatoria: no se aceptan tokens sin expiración aunque estén firmados. La biblioteca valida expiración y nbf si existe.

Un fallo devuelve 401 sin publicar request.user. La respuesta usa perfil actual de DB, aunque nombre o rol hayan cambiado desde la emisión. Fallo de DB devuelve error de servidor (500), sin usuario simulado. Esta guarda no se ha aplicado a incidencias como parte de la tarea.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
- Código: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/auth/jwt-auth.guard.ts`, `backend/src/auth/current-user.decorator.ts`.

- [Especificación de login](../../features/specs/2026-10-27-completar-login-backend-con-jwt-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-27-completar-login-backend-con-jwt-plan.md).
