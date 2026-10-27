# POST /auth/login

- Estado: implementado; unitarias, compilación y lint verificados en la fusión. Sin pruebas HTTP ni DB real.
- Última revisión: 2026-10-27.
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

## Verificación de feature-login

Se mantiene la emisión exclusiva de accessToken HS256 con sub/userId del usuario, username y role almacenados en DB, más iat/exp. JWT_SECRET y JWT_EXPIRES_IN deben ser cadenas no vacías. La duración se interpreta con la biblioteca JWT; una duración incompatible o fallo de firma/DB es un error de servidor (500), sin token simulado ni respaldo. No se guarda una sesión nueva ni se modifica el usuario durante login.

Las pruebas cubren username/email, contraseña conservada, límites UTF-8, error genérico de credenciales y fallos de firma/DB. No se han hecho peticiones HTTP ni pruebas con DB real en esta fase.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
- Código: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/auth/pipes/login.pipe.ts`, `backend/src/auth/dto/login.dto.ts`.

- [Especificación de login](../../features/specs/2026-10-27-completar-login-backend-con-jwt-spec.md).
- [Plan y confirmación](../../features/plans/2026-10-27-completar-login-backend-con-jwt-plan.md).
