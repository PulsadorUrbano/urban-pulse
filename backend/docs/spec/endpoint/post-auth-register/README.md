# POST /auth/register

- Estado: implementado, verificación pendiente (sin ejecución de pruebas).
- Última revisión: 2026-10-25.
- Método y ruta: `POST /auth/register`.
- Finalidad: registrar un ciudadano (rol `civic`).
- Acceso: público.

## Entrada

Cuerpo JSON:

```json
{
  "username": "ciudadano.nuevo",
  "email": "ciudadano.nuevo@example.com",
  "password": "clave-segura-2026",
  "phone": "+34 612 345 678"
}
```

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| `username` | sí | 3 a 30 caracteres `[a-zA-Z0-9._-]`, recortado. |
| `email` | sí | Formato `x@y.z`, máximo 254, guardado en minúsculas. |
| `password` | sí | 8 a 72 bytes UTF-8. |
| `phone` | no | 9 a 15 dígitos con `+` opcional; se eliminan espacios. `null` u omitido guarda `null`. |

Campos desconocidos y `role` se rechazan con `400`.

## Respuesta

`201 Created`:

```json
{
  "userId": "8d2f6a4e-1b3c-4d5e-9f70-a1b2c3d4e5f6",
  "username": "ciudadano.nuevo",
  "email": "ciudadano.nuevo@example.com",
  "role": "civic",
  "phone": "+34612345678"
}
```

No devuelve token. Para obtenerlo, llamar a `POST /auth/login`.

## Errores

| Código | Condición |
| --- | --- |
| `400` | Cuerpo no es objeto, campo desconocido o formato no válido. |
| `409` | Usuario, email o teléfono ya registrados. Mensaje: `Ya existe un usuario con ese nombre, email o teléfono`. |

## Almacenamiento

- `users`: contraseña guardada como hash bcrypt, rol `civic` fijado por el servidor.
- `citizens`: fila con `user_id` y `phone` (`null` si no se indica). Creación en la misma transacción.
- Requiere PostgreSQL activo y el esquema aplicado.

## Referencias

- Especificación: [autenticación de ciudadanía](../../specs/2026-10-25-auth-ciudadania.md).
- Plan: [plan de implementación](../../plans/2026-10-25-auth-ciudadania-plan.md).
- Código: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/auth/pipes/register-citizen.pipe.ts`, `backend/src/auth/dto/register-citizen.dto.ts`.
