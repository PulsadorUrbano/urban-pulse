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

El frontend móvil aún usa el contrato anterior de multipart y `civicId`; la incompatibilidad y la migración pendiente están registradas como [deuda técnica](../docs/deuda-tecnica-contrato-incidencias-frontend.md).

| Método y ruta | Función |
| --- | --- |
| `POST /auth/register` | Registrar un ciudadano. |
| `POST /auth/login` | Iniciar sesión y obtener un JWT. |
| `GET /auth/me` | Consultar el usuario autenticado mediante un token Bearer. |
| `GET /categories` | Consultar el catálogo temporal de categorías. |
| `POST /incidents` | Crear una incidencia propia con JSON y JWT. |
| `GET /incidents` | Listar las incidencias del ciudadano autenticado. |
| `GET /incidents/:id` | Consultar una incidencia propia o, para operadores, cualquiera. |
| `PATCH /incidents/:id/status` | Validar o rechazar una incidencia reportada; solo operadores. |
| `PATCH /incidents/:id/priority` | Cambiar la prioridad de una incidencia validada; solo operadores. |

El alta recibe JSON con `title` obligatorio. El título recortado admite entre 4 y 35 puntos de código; descripción, categoría, activo y ubicación son opcionales. `civicId` procede de la sesión y no se admite en el cuerpo. Tampoco se admiten `images`, archivos ni multipart. Devuelve `201`, el recurso y la cabecera `Location`. El campo de respuesta `images` se conserva temporalmente como `[]` para compatibilidad y no implica almacenamiento disponible.

`GET /auth/me` y todas las rutas de incidencias utilizan JWT Bearer. El acceso a incidencias revalida en PostgreSQL el usuario, su rol actual y, para ciudadanía, su vínculo `citizens`. El arranque no configura CORS explícitamente.

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

`IncidentsService` usa operaciones asíncronas de Prisma para incidencias, ubicaciones e historiales. La creación y los cambios auditados usan transacciones. No existe almacenamiento local ni remoto de imágenes, ni ruta de descarga; la migración `20261109000000_retirar_imagenes` elimina la tabla anterior. El catálogo de categorías sigue siendo temporal. El esquema local debe estar preparado; no se aplican migraciones automáticamente salvo que `DB_SYNC=deploy` se configure expresamente.

El [DBML](../database/diagram.dbml) y el [SQL de referencia](docs/migrations/001_base_diagram.sql) describen el modelo de datos del proyecto.

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../docs/adr/).