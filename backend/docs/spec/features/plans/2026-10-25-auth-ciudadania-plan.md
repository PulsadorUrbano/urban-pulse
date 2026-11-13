# Plan de implementación: autenticación de ciudadanía

> Plan de la especificación [autenticación de ciudadanía](../specs/2026-10-25-auth-ciudadania.md). Los pasos marcados corresponden a trabajo realizado en esta rama.

- Objetivo: registro, login y validación de sesión de ciudadanos con datos reales, y retirada de `POST /auth/token`.
- Arquitectura: módulo `auth` existente, con pipes propios, transacción de Prisma para `users` + `citizens`, y `JwtService` con HS256.
- Herramientas: `@nestjs/jwt` 12, `bcryptjs` 3, `@prisma/client` 7.10, Vitest 4, NestJS 12.
- Especificación: [Contrato y criterios](../specs/2026-10-25-auth-ciudadania.md).
- Rama: feature/token.
- Estado: implementado con verificación pendiente.

## Restricciones generales

- Programar y documentar en español; los nombres exigidos por Prisma y NestJS se conservan.
- El modelo `citizens` requiere `prisma generate` antes de compilar. No se edita `src/generated/prisma/` a mano.
- No se ejecutan migraciones ni `db push`, ni se conecta a PostgreSQL para verificar.
- Solo pruebas unitarias en `backend/test/auth/` y `backend/test/dev-seed/`.
- No se modifican `frontend-web` ni `frontend-mobile`.

## Focos de revisión

- Contraseñas: hash bcrypt, nunca en respuestas ni registros. Mismo mensaje y tiempo aproximado en login para usuario inexistente. Prueba: `auth.service.spec.ts`.
- Unicidad: `P2002` se traduce a `409` sin datos parciales gracias a la transacción. Prueba: `auth.service.spec.ts`.
- Rol: el cliente no puede elegir `role`; campos desconocidos rechazados. Pruebas: pipes.
- Token: algoritmo fijo HS256; token expirado o malformado da `401`, no `500`. Prueba: `jwt-auth.guard.spec.ts`.
- Seed: solo en `development`. Prueba: `dev-seed.service.spec.ts`.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | backend/prisma/schema.prisma | Nuevo modelo `citizens` y relación con `users`. |
| Modificar | backend/src/auth/auth.controller.ts | Rutas `register`, `login`, `me`; se retira `token`. |
| Modificar | backend/src/auth/auth.service.ts | Registro, login y lectura de usuario actual. |
| Modificar | backend/src/auth/jwt-auth.guard.ts | Error de verificación como `401`, algoritmo HS256. |
| Modificar | backend/src/auth/token-payload.ts | Añadir `sub`. |
| Crear | backend/src/auth/dto/register-citizen.dto.ts | DTO de registro para Swagger. |
| Crear | backend/src/auth/dto/login.dto.ts | DTO de login para Swagger. |
| Crear | backend/src/auth/dto/public-user.dto.ts | Respuesta pública sin contraseña. |
| Crear | backend/src/auth/pipes/register-citizen.pipe.ts | Validación y normalización del registro. |
| Crear | backend/src/auth/pipes/login.pipe.ts | Validación del login. |
| Eliminar | backend/src/auth/dto/create-token.dto.ts | DTO de `POST /auth/token` retirado. |
| Modificar | backend/src/dev-seed/dev-seed.service.ts | Ciudadano de desarrollo. |
| Modificar | backend/.env.example | Advertencia sobre `JWT_SECRET`. |
| Crear | backend/test/auth/services/auth.service.spec.ts | Pruebas de servicio. |
| Crear | backend/test/auth/controllers/auth.controller.spec.ts | Pruebas de controlador. |
| Crear | backend/test/auth/guards/jwt-auth.guard.spec.ts | Pruebas de guard. |
| Crear | backend/test/auth/pipes/register-citizen.pipe.spec.ts | Pruebas de validación de registro. |
| Crear | backend/test/auth/pipes/login.pipe.spec.ts | Pruebas de validación de login. |
| Crear | backend/test/dev-seed/services/dev-seed.service.spec.ts | Pruebas del seed. |
| Crear | backend/docs/spec/specs/2026-10-25-auth-ciudadania.md | Especificación. |
| Crear | backend/docs/spec/plans/2026-10-25-auth-ciudadania-plan.md | Este plan. |
| Crear | backend/docs/spec/endpoint/post-auth-register/README.md | Ficha del endpoint. |
| Crear | backend/docs/spec/endpoint/post-auth-login/README.md | Ficha del endpoint. |
| Crear | backend/docs/spec/endpoint/get-auth-me/README.md | Ficha del endpoint. |
| Crear | backend/docs/spec/endpoint/post-auth-token/README.md | Ficha del endpoint retirado. |

## Preparación

- [x] Leer AGENTS.md, el código de auth en `feature/token`, el consumidor `frontend-web` y el contrato `frontend-mobile/src/types/civic.ts`.
- [x] Listar el catálogo de endpoints: no había fichas de auth en la rama.
- [ ] Consultar Context7 para `@nestjs/jwt`, `bcryptjs` y Prisma 7. No hay herramienta de Context7 disponible en esta sesión; no se ha podido hacer.
- [x] Registrar el estado inicial de las comprobaciones. `npm ci` falla (ver comprobaciones).

## Tarea 1: esquema y tipos

**Archivos:** backend/prisma/schema.prisma.

**Criterios cubiertos:** 1, 2.

- [x] Añadir `citizens` con `user_id` clave foránea 1:1, `phone` único y opcional, y `created_at`.
- [ ] Ejecutar `npm exec -- prisma generate --config prisma7.config.ts`. Bloqueado: las dependencias no se pueden restaurar.

## Tarea 2: validación HTTP

**Archivos:** backend/src/auth/pipes/register-citizen.pipe.ts, backend/src/auth/pipes/login.pipe.ts, backend/src/auth/dto/*.ts.

**Criterios cubiertos:** 8.

- [x] Caso unitario: normalización, campos desconocidos, formatos y límites de contraseña y teléfono.
- [x] Implementar pipes y DTOs.

## Tarea 3: servicio de autenticación

**Archivos:** backend/src/auth/auth.service.ts, backend/src/auth/token-payload.ts.

**Criterios cubiertos:** 1, 2, 3, 4, 5, 6, 10.

- [x] Caso unitario: registro, conflicto, login correcto e incorrecto, usuario inexistente, `me`.
- [x] Implementar `registrarCiudadano`, `login` y `obtenerUsuarioActual`.

## Tarea 4: controlador y guard

**Archivos:** backend/src/auth/auth.controller.ts, backend/src/auth/jwt-auth.guard.ts.

**Criterios cubiertos:** 5, 6, 7.

- [x] Caso unitario: delegación del controlador y errores del guard.
- [x] Retirar `POST /auth/token`, añadir `register` y `login`, y `me` con datos de base de datos.

## Tarea 5: seed de desarrollo

**Archivos:** backend/src/dev-seed/dev-seed.service.ts.

**Criterios cubiertos:** 9.

- [x] Caso unitario: solo en `development`, ciudadano civic con hash, aviso sin lanzar error.
- [x] Implementar el ciudadano de desarrollo.

## Tarea 6: documentación

**Archivos:** especificación, plan, fichas de endpoint, backend/.env.example.

- [x] Crear especificación y plan.
- [x] Crear fichas de `POST /auth/register`, `POST /auth/login`, `GET /auth/me` y `POST /auth/token` retirado.
- [x] Actualizar la advertencia de `JWT_SECRET` en `.env.example`.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Restaurar dependencias | npm ci | Fallido: `package-lock.json` de feature/token no está sincronizado con `package.json` (faltan `@nestjs/jwt`, `bcryptjs` y otras). Se ha usado `npm.cmd` porque PowerShell bloquea `npm.ps1`. No se ha ejecutado `npm install` por prohibición de AGENTS.md. |
| Unitarias | npm test | No ejecutada: depende de las dependencias. |
| Compilación | npm run build | No ejecutada: depende de las dependencias y de `prisma generate`. |
| Lint | npm run lint | No ejecutada: depende de las dependencias. |
| Diff, desde la raíz | git diff --check | Sin errores (código de salida 0). Solo avisos de finales de línea CRLF/LF en cinco archivos de código. |

- [ ] Mantener el catálogo coherente con los contratos implementados.
- [x] Mantener la especificación alineada con los requisitos.
- [x] No tocar archivos de frontend, credenciales ni servicios fuera del alcance.

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente.
- Fecha de revisión: 2026-10-25.
- Resultado entregado: retirada de `POST /auth/token`; `POST /auth/register`, `POST /auth/login` y `GET /auth/me` con consulta a base de datos; modelo `citizens`; validación en pipes; ciudadano de desarrollo; pruebas unitarias escritas; documentación y fichas de endpoint.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. Registro válido | auth.service.spec.ts (registro); register-citizen.pipe.spec.ts | Pendiente de ejecución |
| 2. Duplicados | auth.service.spec.ts (P2002) | Pendiente de ejecución |
| 3. Login correcto | auth.service.spec.ts (login) | Pendiente de ejecución |
| 4. Credenciales incorrectas | auth.service.spec.ts (login) | Pendiente de ejecución |
| 5. /auth/me válido | auth.service.spec.ts (obtenerUsuarioActual) | Pendiente de ejecución |
| 6. /auth/me inválido o inexistente | jwt-auth.guard.spec.ts; auth.service.spec.ts | Pendiente de ejecución |
| 7. /auth/token retirado | auth.controller.spec.ts; create-token.dto.ts eliminado | Verificado por código; sin ejecución de Nest |
| 8. Validación 400 | register-citizen.pipe.spec.ts; login.pipe.spec.ts | Pendiente de ejecución |
| 9. Seed solo en development | dev-seed.service.spec.ts | Pendiente de ejecución |
| 10. Sin contraseñas en respuestas | auth.service.spec.ts | Pendiente de ejecución |

- Comprobaciones: `npm ci` bloqueado por lockfile desincronizado; `npm test`, `npm run build` y `npm run lint` no ejecutadas por esa causa.
- Decisiones y desviaciones:
  - Se usa `npm.cmd` en lugar de `npm` porque PowerShell bloquea scripts `.ps1`. No se ha cambiado la política de ejecución.
  - `POST /auth/register` devuelve el usuario público, sin token.
  - `GET /auth/me` devuelve también `email` y `phone`, además de los campos anteriores.
- Limitaciones y pendientes:
  - Regenerar el cliente Prisma y ejecutar build, lint y pruebas cuando el lockfile esté sincronizado. Requiere autorización explícita para actualizar el lockfile.
  - Consultar Context7 para las APIs de `@nestjs/jwt`, `bcryptjs` y Prisma antes de dar la implementación por verificada.
  - `frontend-web` y `frontend-mobile` deben migrar a `POST /auth/login` y `GET /auth/me`; sus fallbacks simulados deben eliminarse en esa migración.
  - Los usuarios mock de los frontends no existen en la base de datos.
  - Sin límite de intentos de login.
