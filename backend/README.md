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
| `S3_BUCKET` y `S3_REGION` | Bucket privado y región de las fotos de incidencias. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | Credenciales del backend local; el token de sesión solo aplica a credenciales temporales. |
| `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` | Credenciales de Nest Observe. |

No versiones los archivos `.env` ni credenciales reales. La configuración de contenedores se explica en [despliegue](../docs/deployment.md) y la de fotos en la [guía S3](../docs/conexion-s3-fotos.md).

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

Los scripts `start`, `start:dev` y `build` generan el cliente Prisma con `prisma7.config.ts`. La imagen Docker lo genera durante el build y arranca con `pnpm run start:prod`. Con `DB_SYNC=deploy`, el backend espera a que Prisma aplique las migraciones y detiene el arranque si fallan.

Swagger se publica en `http://localhost:3000/`. `GET /health` devuelve `{ "status": "ok" }`; no consulta PostgreSQL. Ajusta la dirección si defines otro `PORT`.

## API

Los contratos detallados, validaciones y respuestas tienen su ubicación principal en el [catálogo de endpoints](docs/spec/endpoint/README.md).

La PR #158 permite al frontend móvil crear incidencias mediante JSON y JWT. La app todavía no sube las fotos seleccionadas al backend real; ese cambio móvil queda fuera de esta rama.

| Método y ruta | Función |
| --- | --- |
| `POST /auth/register` | Registrar un ciudadano. |
| `POST /auth/login` | Iniciar sesión y obtener un JWT. |
| `GET /auth/me` | Consultar el usuario autenticado mediante un token Bearer. |
| `GET /categories` | Consultar el catálogo persistido de categorías. |
| `POST /incidents` | Crear una incidencia con JSON y JWT. |
| `POST /incidents/:id/images` | Añadir entre una y ocho fotos a una incidencia propia. |
| `GET /incidents` | Listar incidencias con cursor en cabeceras (`limit` por defecto 10, máximo 100) y filtro opcional `civicId`. |
| `GET /incidents/:id` | Consultar una incidencia. |
| `PATCH /incidents/:id/status` | Validar o rechazar una incidencia reportada, con motivo y actor derivado del JWT. |
| `PATCH /incidents/:id/priority` | Cambiar la prioridad de una incidencia validada, con motivo y actor derivado del JWT. |
| `PATCH /incidents/:id/assignment` | Asignar departamento y equipo con motivo e historial. |
| `GET /incidents/:id/assignments` | Consultar el historial de asignaciones según el ámbito del usuario. |

El alta recibe JSON con `title` de 4 a 35 caracteres y coordenadas obligatorias. La categoría, la descripción, el activo y la dirección son opcionales. Si no se envía una dirección, el backend intenta resolverla con Nominatim; una dirección manual tiene prioridad. Los resultados solo se guardan si incluyen vía, número, código postal de cinco dígitos y distrito de Málaga reconocido. Los fallos del geocodificador no impiden crear la incidencia. `civicId` procede de la sesión y no se admite en el cuerpo. Tampoco se admiten `images`, archivos ni multipart en esa ruta. Devuelve `201`, el recurso y la cabecera `Location`. Las fotos se suben después por `POST /incidents/:id/images`; el detalle incluye URL de lectura temporales. Sin `S3_BUCKET` o `S3_REGION`, la subida devuelve `503` con un mensaje de configuración y la incidencia se puede crear sin fotos.

La geocodificación usa `NOMINATIM_ENDPOINT`, `NOMINATIM_USER_AGENT` y `NOMINATIM_TIMEOUT_MS`, configurables en `backend/.env` al ejecutar el backend fuera de Compose o en el `.env` raíz para Compose. Solo se envían las coordenadas; no se envían el título, la descripción, el token ni la identidad del ciudadano. El cliente limita las consultas a una por segundo por proceso y guarda resultados en una caché en memoria durante 24 horas. El servicio público de Nominatim es de baja capacidad: varias réplicas requieren un limitador compartido o un proveedor/servicio propio. Se debe respetar la [política de uso de Nominatim](https://operations.osmfoundation.org/policies/nominatim/) y, si los resultados se muestran directamente a usuarios, incluir la atribución de OpenStreetMap que exige el proveedor.

`GET /auth/me` y las rutas de incidencia individuales utilizan `JwtAuthGuard`; el listado y el filtro `civicId` siguen sin requerir autenticación. El listado usa cursor keyset, no OFFSET. El arranque no configura CORS explícitamente.

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

`IncidentsService` usa Prisma para incidencias, ubicaciones e historiales; la creación y los cambios auditados usan transacciones. `FotosIncidenciaService` guarda las fotos en S3 y sus referencias en `IncidentImage`. Las migraciones se aplican en orden: `20261115000000_imagenes_s3` crea esa tabla; `20261117000000_model_integrity` añade categorías, activos, direcciones, contextos y restricciones; `20261118000000_close_model` exige ubicación, crea el catálogo controlado y cierra la auditoría de asignaciones. Las dos últimas se detienen ante datos históricos incompatibles para corregirlos antes de poblar la base. No se aplican automáticamente salvo que `DB_SYNC=deploy` se configure expresamente.

El [DBML](../database/diagram.dbml) y el [SQL de referencia](docs/migrations/001_base_diagram.sql) describen el modelo de datos del proyecto.

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../docs/adr/).
### Cierre del modelo y auditoría de asignaciones

La migración `20261118000000_close_model` exige categoría y ubicación y conserva el máximo de 35 caracteres del título. Mantiene los UUID del catálogo anterior y establece diez categorías controladas y quince tipos de activo urbano; las categorías históricas ajenas se conservan inactivas.
`citizens` y `TeamMember` pueden coexistir para un usuario; un usuario solo pertenece a un equipo. `DepartmentMember` determina el ámbito del rol `department`.
Las asignaciones requieren `cause` y resultado con departamento y equipo; se guardan con historial inmutable. `GET /incidents/:id/assignments` permite consultarlo.
Las transiciones adicionales están implementadas con autorización por departamento o técnico asignado; las incidencias se conservan permanentemente y las fotos se guardan en S3.
Los clientes deben enviar coordenadas al crear, y motivo al asignar. No se han adaptado los frontends en este cambio.
La migración se detiene ante datos históricos incompatibles. La secuencia completa se comprobó en un PostgreSQL temporal; ninguna base existente fue modificada.
