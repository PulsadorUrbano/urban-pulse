# Especificación: autenticación de ciudadanía

- Desarrollador responsable: pendiente de indicar.
- Asistente de IA: herramienta de código de OpenCode.
- Modelo de IA que creó la especificación: opencode-go/claude-haiku-5-5.

- Rama: feature/token.
- Última actualización: 2026-10-25.
- Estado: implementado con verificación pendiente (ver el plan).
- Plan: [Plan de implementación](../plans/2026-10-25-auth-ciudadania-plan.md).
- Referencias: issues #35 (registro de ciudadanía), #37 (iniciar sesión) y #39 (sistema de autenticación); `frontend-mobile/src/types/civic.ts` para el contrato de ciudadano.

## Objetivo y decisiones vigentes

Permitir que un ciudadano se registre, inicie sesión con credenciales reales, obtenga un JWT firmado y valide su sesión contra la base de datos. Sustituye el flujo que emitía tokens por `userId` sin contraseña.

- Alcance confirmado: registro de ciudadanos, login por usuario o email, validación de sesión con datos actuales, retirada de `POST /auth/token`, ciudadano de desarrollo.
- Decisiones confirmadas:
  - `POST /auth/token` se retira en esta entrega. Motivo: emitía tokens para cualquier `userId` sin contraseña.
  - Los ciudadanos se guardan en `users` (credenciales y rol) y `citizens` (teléfono opcional y único), según el contrato de `frontend-mobile/src/types/civic.ts`.
  - El registro pide `username`, `email`, `password` y `phone` opcional. El rol `civic` lo asigna el servidor.
  - En desarrollo (`NODE_ENV=development`) se siembra un ciudadano `ciudadano` / `ciudadano`, además del admin.
  - Claims del JWT: `sub`, `userId`, `username`, `role`, con `iat` y `exp`. Caducidad `JWT_EXPIRES_IN` (24h por defecto).
  - Sin CORS. El puerto sigue la variable `PORT`.
  - PostgreSQL es obligatorio al arrancar, como ya ocurre en esta rama.
  - Sin límite de intentos de login ni refresh token.
- Suposiciones por validar:
  - `POST /auth/register` no devuelve token. El cliente llama después a `POST /auth/login`. Los frontends actuales no usan registro, así que no hay consumidor afectado.
  - Contraseña de 8 a 72 bytes (límite de bcrypt).
  - Usuario de 3 a 30 caracteres: letras, números, punto, guion y guion bajo.
  - Los usuarios mock de los frontends (`alejandro`, `carlos.tecnico`, `maria.analyst`, y los del móvil) no se siembran. Deben registrarse para obtener token real.
- Fuera de alcance: límite de intentos, refresh token, recuperación de contraseña, verificación de email, CORS, despliegue, y cambios en `frontend-web` o `frontend-mobile`.

## Contexto verificado

- Implementación previa en esta rama: `auth.controller.ts` expuso `POST /auth/token` con `{ userId }` y `GET /auth/me` devolvía las claims del token sin consultar la base de datos. `JwtAuthGuard` dejaba escapar errores de verificación de JWT.
- Consumidores actuales: `frontend-web/src/services/authService.ts` llama a `POST /auth/token` y a `GET /auth/me`. `frontend-mobile` usa un servidor mock para el login y llama a `POST /auth/token` con el id del usuario mock. Ambos caen a un token simulado si el backend no responde o devuelve error.
- Configuración: `DATABASE_URL` y `PrismaModule` activos; `DB_SYNC` opcional; `JWT_SECRET` y `JWT_EXPIRES_IN` obligatorios.
- Dependencias: `@nestjs/jwt` 12, `bcryptjs` 3 y `@prisma/client` 7.10.
- Diferencia con el estado propuesto: se añade `citizens`, se cambian los claims, `/auth/me` consulta la base de datos, y `/auth/token` desaparece.

## Contrato HTTP

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| `POST /auth/register` | JSON: `username`, `email`, `password`, `phone` opcional | `201` con `userId`, `username`, `email`, `role` (`civic`), `phone` | Público |
| `POST /auth/login` | JSON: `usernameOrEmail`, `password` | `200` con `accessToken` | Público |
| `GET /auth/me` | Cabecera `Authorization: Bearer <token>`, sin cuerpo | `200` con `userId`, `username`, `email`, `role`, `phone` | Bearer JWT válido y usuario existente |
| `POST /auth/token` | Retirado | `404` | Ninguno |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `username` (register) | texto | sí | Recortado. 3 a 30 caracteres `[a-zA-Z0-9._-]`. | Rechazado si falta. |
| `email` (register) | texto | sí | Recortado y en minúsculas. Formato `x@y.z`, máximo 254 caracteres. | Rechazado si falta. |
| `password` (register) | texto | sí | Sin recortar. 8 a 72 bytes UTF-8. | Rechazado si falta. |
| `phone` (register) | texto | no | Se eliminan espacios. 9 a 15 dígitos con `+` opcional. | Omitido o `null` se guarda como `null`. Otro tipo se rechaza. |
| `usernameOrEmail` (login) | texto | sí | Recortado, no vacío. | Rechazado si falta. |
| `password` (login) | texto | sí | No vacío, máximo 72 bytes. Sin recortar. | Rechazado si falta. |

- Campos desconocidos: se rechazan con `400` en register y login. El `role` no se acepta en la petición.
- Recurso de respuesta: `PublicUserDto` con `userId`, `username`, `email`, `role` y `phone` (`string` o `null`). Nunca incluye `password`. En login, `accessToken` es un JWT HS256.
- Errores:
  - `400`: cuerpo o campo no válido.
  - `401`: credenciales incorrectas (mensaje `Usuario o contraseña incorrectos`, igual para usuario inexistente), falta el token Bearer, token inválido o expirado, o usuario del token inexistente.
  - `409`: nombre de usuario, email o teléfono ya registrado (mensaje `Ya existe un usuario con ese nombre, email o teléfono`). Se detecta por la violación de unicidad de la base de datos.
  - `404` en `POST /auth/token`, porque la ruta ya no existe.
- Identidad y permisos: `GET /auth/me` valida el JWT con algoritmo HS256 y consulta el usuario. No hay roles por endpoint en esta fase.
- Compatibilidad: `POST /auth/token` deja de existir. Web y móvil reciben `404` y caen a su token simulado hasta migrar. `GET /auth/me` mantiene `userId`, `username` y `role`, y añade `email` y `phone`.

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `users` (reutilizado) | `id` UUID, `username` único, `email` único, `password` hash, `created_at`, `role` `profile_role` | Relación opcional 1:1 con `citizens`. Sin cambios en campos. |
| `citizens` (nuevo) | `user_id` UUID (clave primaria y clave foránea a `users.id`), `phone` texto opcional y único, `created_at` | `user_id` obligatorio. `phone` puede ser `null`; PostgreSQL admite varios `null` en un índice único. Borrado en cascada desde `users`. |

- Tipos generados: `profile_role` desde `src/generated/prisma/enums.js`. El cliente debe regenerarse con `prisma generate` para incluir `citizens`; no se edita `src/generated/prisma/` a mano.
- Objeto interno frente a respuesta: `PublicUserDto` oculta `password` y el id interno de `citizens`. `AuthService` selecciona solo los campos necesarios.
- Almacenamiento de esta fase: PostgreSQL mediante Prisma, configurado por `DATABASE_URL`.
- Ciclo de vida: los datos persisten en la base de datos. El seed de desarrollo se repite al arrancar en `development` y solo actualiza contraseña y rol de los dos usuarios fijos.
- Relaciones: `citizens.user_id` apunta a `users.id`. La existencia se garantiza por la clave foránea; la unicidad de `username`, `email` y `phone` por índices únicos.
- Base de datos y migraciones: la conexión ya está activa en esta rama. Aplicar el esquema localmente con `DB_SYNC=dbpush` o con el CLI de Prisma. Esta implementación no ejecuta migraciones.

## Diseño mínimo

- `auth/auth.controller.ts`: rutas `register`, `login` y `me`. Sin lógica de negocio.
- `auth/auth.service.ts`: `registrarCiudadano` (transacción `users` + `citizens`, hash bcrypt), `login` (búsqueda por usuario o email, comparación con hash de referencia si no existe el usuario), `obtenerUsuarioActual`.
- `auth/pipes/register-citizen.pipe.ts` y `auth/pipes/login.pipe.ts`: validación en el límite HTTP, sin añadir `class-validator`.
- `auth/jwt-auth.guard.ts`: captura errores de verificación y responde `401`.
- `dev-seed/dev-seed.service.ts`: sembrar admin y ciudadano solo en `development`.
- Errores que pueden dejar datos parciales: la creación de `users` y `citizens` va en una transacción; si falla la segunda escritura, se revierte la primera.

## Criterios de aceptación

1. Registro válido: `201`, rol `civic`, contraseña guardada como hash, fila en `citizens` con el teléfono indicado o `null`.
2. Registro con usuario, email o teléfono duplicados: `409` sin crear datos parciales.
3. Login con usuario o email y contraseña correctos: `200` con JWT cuyas claims contienen `sub`, `userId`, `username` y `role`.
4. Login con contraseña incorrecta o usuario inexistente: `401` con el mismo mensaje.
5. `GET /auth/me` con token válido: `200` con datos actuales del usuario, incluido el teléfono.
6. `GET /auth/me` sin token, con token inválido o expirado, o con usuario inexistente: `401`.
7. `POST /auth/token` no existe: `404`.
8. Campos desconocidos, `role` en la petición o formatos inválidos: `400`.
9. El seed de desarrollo crea el ciudadano solo con `NODE_ENV=development`.
10. Ninguna respuesta ni registro expone contraseñas, hashes ni cabeceras de autorización.

## Documentación de endpoints

- [POST /auth/register](../endpoint/post-auth-register/README.md)
- [POST /auth/login](../endpoint/post-auth-login/README.md)
- [GET /auth/me](../endpoint/get-auth-me/README.md)
- [POST /auth/token (retirado)](../endpoint/post-auth-token/README.md)

## Estrategia de verificación

Pruebas unitarias en `backend/test/auth/` y `backend/test/dev-seed/`, con Prisma sustituido por dobles y JWT y bcrypt reales. No se conecta PostgreSQL ni se ejecutan pruebas e2e.

| Criterio | Caso unitario |
| --- | --- |
| 1, 2 | `auth.service.spec.ts`: registro, hash, `citizens`, conflicto P2002, propagación de otros errores. |
| 3, 4 | `auth.service.spec.ts`: login con usuario y con email, credenciales incorrectas, usuario inexistente. |
| 5, 6 | `auth.service.spec.ts` (usuario existente e inexistente); `jwt-auth.guard.spec.ts` (token ausente, inválido, expirado, válido). |
| 7 | Verificado por ausencia del método en `auth.controller.spec.ts` y por la retirada de `create-token.dto.ts`. |
| 8 | `register-citizen.pipe.spec.ts` y `login.pipe.spec.ts`. |
| 9, 10 | `dev-seed.service.spec.ts`. La ausencia de hashes en respuestas se comprueba en `auth.service.spec.ts`. |

Un contrato HTTP documentado no equivale a una comprobación HTTP ejecutada. Los resultados reales se registran en [el plan](../plans/2026-10-25-auth-ciudadania-plan.md#confirmación-de-implementación).
