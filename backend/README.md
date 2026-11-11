# Backend de Urban Pulse

API NestJS con TypeScript para autenticación y gestión de incidencias urbanas. Los módulos activos son configuración, Nest Observe, Prisma, autenticación, salud e incidencias.

## Requisitos y configuración

El componente usa npm y `package-lock.json`. `package.json` declara Node.js ≥22 y npm ≥10. Necesita PostgreSQL accesible y las tablas de usuarios y ciudadanía para las operaciones de autenticación.

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
| `UPLOADS_DIRECTORY` | Directorio de imágenes; por defecto `uploads/` dentro del directorio de ejecución. |

No versiones los archivos `.env` ni credenciales reales. La configuración de contenedores se explica en [despliegue](../docs/deployment.md).

## Instalación y arranque

Desde la raíz:

```bash
cd backend
npm ci
npm run start:dev
```

Configura el entorno y prepara la base de datos antes del arranque. El ejemplo deja `DB_SYNC` vacío. La configuración CLI de Prisma está en `prisma7.config.ts`; para utilizarla explícitamente:

```bash
npm exec -- prisma generate --config prisma7.config.ts
```

El `postinstall` ejecuta `prisma skills sync || exit 0`. Los scripts `start:dev` y `build` incluyen su propia llamada a `prisma generate`.

Swagger se publica en `http://localhost:3000/`. `GET /health` devuelve `{ "status": "ok" }`; no consulta PostgreSQL. Ajusta la dirección si defines otro `PORT`.

## Scripts

Desde `backend/`:

| Comando | Función |
| --- | --- |
| `npm run start` | Arrancar con Nest CLI. |
| `npm run start:dev` | Generar el cliente Prisma y arrancar con recarga. |
| `npm run start:debug` | Arrancar con depurador y recarga. |
| `npm run build` | Generar el cliente Prisma y compilar con Nest. |
| `npm run deploy` | Generar el cliente, compilar y arrancar con Nest CLI; comando usado por el contenedor. |
| `npm run start:prod` | Ejecutar `node dist/main` después de compilar. |
| `npm run lint` | Oxlint con comprobación de tipos sobre `src/` y `test/`. |
| `npm test` | Pruebas unitarias con Vitest. |
| `npm run test:watch` | Vitest en modo observación. |
| `npm run test:cov` | Cobertura unitaria. |
| `npm run test:debug` | Depuración de pruebas sin paralelismo entre archivos. |
| `npm run test:e2e` | Suite e2e con configuración separada; según `AGENTS.md`, requiere petición explícita. |
| `npm run format` | Reescribir el formato de los archivos TypeScript de `src/` y `test/`. |

La configuración unitaria descubre `**/*.spec.ts` y la e2e `**/*.e2e-spec.ts`. Los procedimientos de esta guía se han contrastado por lectura; no se han ejecutado instalaciones, servicios ni suites para esta revisión documental.

## API

Los contratos detallados, validaciones y respuestas tienen su ubicación principal en el [catálogo de endpoints](docs/spec/endpoint/README.md).

| Método y ruta | Función |
| --- | --- |
| `POST /auth/register` | Registrar un ciudadano. |
| `POST /auth/login` | Iniciar sesión y obtener un JWT. |
| `GET /auth/me` | Consultar el usuario autenticado mediante un token Bearer. |
| `GET /categories` | Consultar el catálogo temporal de categorías. |
| `POST /incidents` | Crear una incidencia con `multipart/form-data`. |
| `GET /incidents?civicId=<UUID>` | Listar incidencias por identificador ciudadano. |
| `GET /incidents/:id` | Consultar una incidencia. |
| `PATCH /incidents/:id/status` | Validar o rechazar una incidencia reportada, con motivo y actor declarado. |
| `PATCH /incidents/:id/priority` | Cambiar la prioridad de una incidencia validada, con motivo y actor declarado. |

El alta recibe `title` y `civicId` obligatorios. El título recortado admite entre 4 y 35 puntos de código. Descripción, categoría, activo y ubicación son opcionales. Admite hasta ocho archivos `images` JPEG, PNG o WebP de hasta 5 MB cada uno. Devuelve `201`, el recurso y la cabecera `Location`. El formato completo y los errores se mantienen en la ficha de registro del catálogo.

`GET /auth/me` utiliza `JwtAuthGuard`. Las rutas de incidencias reciben `civicId` como dato del cliente y no aplican ese guard. El arranque no configura CORS explícitamente.

## Persistencia y estructura

Los usuarios y ciudadanos se almacenan en PostgreSQL mediante Prisma. Las contraseñas se guardan con hash bcrypt. El esquema `prisma/schema.prisma` también define incidencias, ubicaciones, imágenes y cambios de estado y prioridad; su existencia no determina el almacenamiento utilizado por cada servicio.

`IncidentsService` conserva incidencias e historial en un `Map` del proceso y el catálogo de categorías también es temporal. Se pierden al reiniciar. Las imágenes se escriben en `uploads/incidents/<id>/` y se sirven mediante `/uploads/`; son archivos locales separados del registro en memoria.

| Ruta | Contenido |
| --- | --- |
| `src/auth/` | Registro, login, tokens y validación de sesión. |
| `src/incidents/` | Incidencias, categorías, validaciones y almacenamiento de imágenes. |
| `src/prisma/` | Conexión y sincronización de esquema según `DB_SYNC`. |
| `src/dev-seed/` | Usuarios de desarrollo cuando `NODE_ENV=development`. |
| `src/health/` | Comprobación de salud. |
| `src/main.ts` y `src/app.module.ts` | Arranque, Swagger, archivos estáticos y composición de módulos. |

El [DBML](../database/diagram.dbml) y el [SQL de referencia](docs/migrations/001_base_diagram.sql) describen el modelo de datos del proyecto.

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](docs/adr/).
