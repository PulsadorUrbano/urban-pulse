# Backend de Urban Pulse

API NestJS con TypeScript para autenticación y gestión de incidencias urbanas. Los módulos activos son configuración, Nest Observe, Prisma, autenticación, salud e incidencias.

## Instalación y arranque

### Requisitos y configuración

El componente usa pnpm 10.34.8 y `pnpm-lock.yaml`. `package.json` declara Node.js ≥22. Necesita PostgreSQL accesible y las tablas de usuarios y ciudadanía para las operaciones de autenticación.

Desde `backend/`, copia el ejemplo solo si todavía no tienes `.env`:

```powershell
Copy-Item .env.example .env
```

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP; por defecto 3000. |
| `DATABASE_URL` | Conexión a PostgreSQL para Prisma y autenticación. |
| `JWT_SECRET` | Secreto para firmar y verificar tokens. |
| `JWT_EXPIRES_IN` | Duración de los tokens. |
| `NODE_ENV` | Con `development`, activa la creación de usuarios de desarrollo al arrancar. |
| `DB_SYNC` | Vacío: no sincroniza tablas. `dbpush`: ejecuta `prisma db push`. `deploy`: ejecuta `prisma migrate deploy`. |
| `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` | Credenciales de Nest Observe. |

No versiones los archivos `.env` ni credenciales reales. La configuración de contenedores se explica en [despliegue](../docs/deployment.md).

### Arranque local

Desde la raíz:

```bash
cd backend
pnpm install --frozen-lockfile
pnpm run start:dev
```

Configura el entorno y prepara la base de datos antes del arranque. El ejemplo deja `DB_SYNC` vacío. La configuración CLI de Prisma está en `prisma7.config.ts`; para utilizarla explícitamente:

```bash
pnpm exec prisma generate --config prisma7.config.ts
```

Los scripts `start`, `start:dev` y `build` generan el cliente Prisma con `prisma7.config.ts`. La imagen Docker lo genera durante el build y arranca con `pnpm run start:prod`.

Swagger se publica en `http://localhost:3000/`. `GET /health` devuelve `{ "status": "ok" }`; no consulta PostgreSQL. Ajusta la dirección si defines otro `PORT`.

## API

Los contratos detallados, validaciones y respuestas tienen su ubicación principal en el [catálogo de endpoints](docs/spec/endpoint/README.md).

El frontend móvil aún usa el contrato anterior de multipart y `civicId`; la incompatibilidad y la migración pendiente están registradas como [deuda técnica](../docs/deuda-tecnica/deuda-tecnica-contrato-incidencias-frontend.md).

| Método y ruta | Función |
| --- | --- |
| `POST /auth/register` | Registrar un ciudadano. |
| `POST /auth/login` | Iniciar sesión y obtener un JWT. |
| `GET /auth/me` | Consultar el usuario autenticado mediante un token Bearer. |
| `GET /categories` | Consultar el catálogo persistido de categorías. |
| `POST /incidents` | Crear una incidencia con `multipart/form-data`. |
| `GET /incidents` | Listar incidencias con cursor en cabeceras (`limit` por defecto 10, máximo 100) y filtro opcional `civicId`. |
| `GET /incidents/:id` | Consultar una incidencia. |
| `PATCH /incidents/:id/status` | Validar o rechazar una incidencia reportada, con motivo y actor declarado. |
| `PATCH /incidents/:id/priority` | Cambiar la prioridad de una incidencia validada, con motivo y actor declarado. |

El alta recibe JSON con `title` obligatorio. El título recortado admite entre 4 y 35 puntos de código; descripción, categoría, activo y ubicación son opcionales. `civicId` procede de la sesión y no se admite en el cuerpo. Tampoco se admiten `images`, archivos ni multipart. Devuelve `201`, el recurso y la cabecera `Location`. El campo de respuesta `images` se conserva temporalmente como `[]` para compatibilidad y no implica almacenamiento disponible.

`GET /auth/me` utiliza `JwtAuthGuard`. Las rutas de incidencias no aplican ese guard; por tanto, el listado y el filtro `civicId` no requieren autenticación. El listado usa cursor keyset, no OFFSET. El arranque no configura CORS explícitamente.

## Scripts y comprobaciones

Desde `backend/`:

| Comando | Función |
| --- | --- |
| `pnpm run start` | Arrancar con Nest CLI. |
| `pnpm run start:dev` | Generar el cliente Prisma y arrancar con recarga. |
| `pnpm run start:debug` | Arrancar con depurador y recarga. |
| `pnpm run build` | Generar el cliente Prisma y compilar con Nest. |
| `pnpm run start:prod` | Ejecutar `node dist/main` después de compilar. |
| `pnpm run lint` | Oxlint con comprobación de tipos sobre `src/` y `test/`. |
| `pnpm test` | Pruebas unitarias con Vitest. |
| `pnpm run test:watch` | Vitest en modo observación. |
| `pnpm run test:cov` | Cobertura unitaria. |
| `pnpm run test:debug` | Depuración de pruebas sin paralelismo entre archivos. |
| `pnpm run test:e2e` | Suite e2e con configuración separada; según `AGENTS.md`, requiere petición explícita. |
| `pnpm run format` | Reescribir el formato de los archivos TypeScript de `src/` y `test/`. |

La configuración unitaria descubre `**/*.spec.ts` y la e2e `**/*.e2e-spec.ts`. 

## Estructura del subproyecto

| Ruta | Contenido |
| --- | --- |
| `src/auth/` | Registro, login, tokens y validación de sesión. |
| `src/incidents/` | Incidencias, categorías, autorización, validaciones y persistencia Prisma. |
| `src/prisma/` | Conexión y sincronización de esquema según `DB_SYNC`. |
| `src/dev-seed/` | Usuarios de desarrollo cuando `NODE_ENV=development`. |
| `src/health/` | Comprobación de salud. |
| `src/main.ts` y `src/app.module.ts` | Arranque, Swagger y composición de módulos. |

### Persistencia

Los usuarios y ciudadanos se almacenan en PostgreSQL mediante Prisma. Las contraseñas se guardan con hash bcrypt. El esquema `prisma/schema.prisma` también define incidencias, ubicaciones y cambios de estado y prioridad.

`IncidentsService` usa operaciones asíncronas de Prisma para incidencias, ubicaciones e historiales. La creación y los cambios auditados usan transacciones. No existe almacenamiento local ni remoto de imágenes, ni ruta de descarga; la migración `20261109000000_retirar_imagenes` elimina la tabla anterior. La migración `20261117000000_model_integrity` crea categorías, activos urbanos, direcciones y contextos urbanos persistentes, amplía los estados y añade restricciones de integridad. Retira filas históricas de ubicación completamente vacías y se detiene ante otros datos incompatibles para corregirlos antes de desplegarla. El esquema local debe estar preparado; no se aplican migraciones automáticamente salvo que `DB_SYNC=deploy` se configure expresamente.

El [DBML](../database/diagram.dbml) y el [SQL de referencia](docs/migrations/001_base_diagram.sql) describen el modelo de datos del proyecto.

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../docs/adr/).


### Cierre del modelo y auditoría de asignaciones

La migración `20261118000000_close_model` exige categoría y ubicación y conserva el máximo de 35 caracteres del título. Mantiene los UUID del catálogo anterior y establece diez categorías controladas y quince tipos de activo urbano; las categorías históricas ajenas se conservan inactivas.
`citizens` y `TeamMember` pueden coexistir para un usuario; un usuario solo pertenece a un equipo. `DepartmentMember` determina el ámbito del rol `department`.
Las asignaciones requieren `cause` y resultado con departamento y equipo; se guardan con historial inmutable. `GET /incidents/:id/assignments` permite consultarlo.
Las transiciones adicionales están implementadas con autorización por departamento o técnico asignado; las incidencias se conservan permanentemente.
Los clientes deben enviar categoría y coordenadas al crear, y motivo al asignar. No se han adaptado los frontends en este cambio.
La migración se detiene ante datos históricos incompatibles. No se han ejecutado migraciones contra PostgreSQL durante esta implementación.
