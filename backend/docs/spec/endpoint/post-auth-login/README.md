# POST /auth/login

- Estado: implementado; unitarias, compilación y lint verificados en la fusión. Sin pruebas HTTP ni DB real.
- Última revisión: 2026-10-26.
- Método y ruta: `POST /auth/login`.
- Finalidad: iniciar sesión con usuario o email y contraseña, y obtener un JWT.
- Acceso: público.

## Entrada

Cuerpo JSON:

```json
{
  "usernameOrEmail": "ciudadano",
  "password": "ciudadano"
}
```

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| `usernameOrEmail` | sí | Texto no vacío, recortado. Se busca como usuario o como email en minúsculas. |
| `password` | sí | Texto no vacío, máximo 72 bytes. |

Campos desconocidos se rechazan con `400`.

## Respuesta

`200 OK`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

Claims del JWT (HS256): `sub`, `userId`, `username`, `role`, `iat`, `exp`. La duración la controla `JWT_EXPIRES_IN`. No hay refresh token.

## Errores

| Código | Condición |
| --- | --- |
| `400` | Cuerpo no válido. |
| `401` | Credenciales incorrectas o usuario inexistente. Mensaje idéntico: `Usuario o contraseña incorrectos`. |

Sin límite de intentos en esta fase.

## Almacenamiento

Lectura de `users`. No escribe datos. Requiere PostgreSQL activo.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
- Código: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/auth/pipes/login.pipe.ts`, `backend/src/auth/dto/login.dto.ts`.
