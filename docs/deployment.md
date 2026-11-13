# Despliegue y operación con Compose

## Servicios

El `docker-compose.yml` de la raíz define PostgreSQL/PostGIS, backend y frontend web. La aplicación móvil se ejecuta mediante el procedimiento de su README.

| Servicio | Configuración | Acceso y almacenamiento |
| --- | --- | --- |
| `database` | `imresamu/postgis:16-3.5-bookworm`, contenedor `urbanpulse_db`. | `database:5432` desde la red de Compose y `127.0.0.1:5432` desde el equipo local. Volumen `pgdata` en `/var/lib/postgresql/data`. |
| `backend` | Construcción desde `backend/Dockerfile`, contenedor `urbanpulse_backend`. | Puerto `API_PORT` publicado en el mismo puerto. |
| `frontend-web` | Construcción desde `frontend-web/Dockerfile`, contenedor `urbanpulse_frontend_web`; build con Node.js y servicio estático con Nginx. | Puerto 80 del contenedor publicado como `WEB_PORT` (8080 por defecto); `/api/` se redirige al backend interno. |

Los servicios utilizan `restart: always` y la red bridge `urbanpulse_net`. El backend depende de que PostgreSQL supere su healthcheck; el frontend espera a que el backend se inicie.

El Dockerfile del backend usa dos etapas con `node:22-alpine`. La primera instala las dependencias y ejecuta `pnpm run build` para generar el cliente Prisma y compilar la API. La segunda instala las dependencias de producción, copia la compilación y arranca con `pnpm run start:prod`.

El Dockerfile del frontend compila la aplicación con Vite y sirve los archivos con Nginx. Nginx resuelve las rutas de la aplicación y reenvía las peticiones `/api/` al backend, quitando ese prefijo.

## Configuración

Desde la raíz del repositorio, copia `.env.example` a `.env` si todavía no tienes ese archivo:

```powershell
Copy-Item .env.example .env
```

Configura `DB_NAME`, `DB_USER` y `DB_PASSWORD` para PostgreSQL, y `JWT_SECRET` y `JWT_EXPIRES_IN` para la autenticación. Compose construye la conexión del backend a `database:5432` con los valores `DB_*`.

`API_PORT` y `WEB_PORT` configuran los puertos del backend y del panel web. `.env.example` usa `3001` y `8080`, respectivamente. PostgreSQL está accesible desde el equipo local en `127.0.0.1:5432`.

Para usar las cuentas de prueba locales, configura `NODE_ENV=development` en el `.env` de la raíz. Deja `DB_SYNC` vacío y aplica las migraciones desde el equipo local, donde está instalado Prisma CLI.

El `.env` de la raíz configura Compose. `backend/.env` se usa para ejecutar el backend o Prisma desde el equipo local. No subas estos archivos al repositorio.

## Construcción y arranque

### Primera ejecución con una base de datos vacía

1. Desde la raíz, inicia PostgreSQL y espera a que esté disponible:

   ```powershell
   docker compose up -d --wait database
   ```

2. Con Node.js 22.12 o posterior dentro de la rama 22, o Node.js 24 o superior y pnpm 10.34.8, entra en `backend/` e instala las dependencias si aún no las tienes:

   ```powershell
   cd backend
   pnpm install --frozen-lockfile
   ```

3. Crea o ajusta `backend/.env`. Sustituye `USUARIO`, `CONTRASEÑA` y `NOMBRE_BD` por los valores de `DB_USER`, `DB_PASSWORD` y `DB_NAME` del `.env` raíz:

   ```dotenv
   DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@127.0.0.1:5432/NOMBRE_BD?schema=public"
   ```

4. Desde `backend/`, aplica las migraciones. Cuando terminen correctamente, vuelve a la raíz:

   ```powershell
   pnpm exec prisma migrate deploy --config prisma7.config.ts
   cd ..
   ```

### Arranque con el esquema preparado

Desde la raíz, inicia la base de datos, el backend y el panel web:

```powershell
docker compose up -d --build
```

Con los puertos de `.env.example`, abre el [panel web](http://localhost:8080) o accede directamente a la [API](http://localhost:3001). Si configuraste `NODE_ENV=development`, puedes probar el panel con `admin` / `admin`.

## Salud y logs

El healthcheck de PostgreSQL ejecuta `pg_isready` con el usuario y la base configurados cada 5 segundos, con timeout de 5 segundos y 5 reintentos. Comprueba disponibilidad de PostgreSQL, no la presencia de las tablas del dominio.

Con el `API_PORT` de `.env.example`, Swagger está disponible en `http://localhost:3001/`. `GET http://localhost:3001/health` devuelve `{ "status": "ok" }` sin consultar PostgreSQL. Si cambias `API_PORT`, usa ese puerto en ambas URL. Compose no define un healthcheck para el backend.

```bash
docker compose ps
docker compose logs --tail=100 database backend
docker compose logs -f backend
```

## Parada y persistencia

```bash
docker compose stop
docker compose down
```

`stop` detiene los contenedores; `down` retira los contenedores y la red, conservando por defecto el volumen nombrado. `pgdata` conserva PostgreSQL entre recreaciones. Eliminar el volumen, incluido mediante `docker compose down -v`, elimina sus datos.

La API mantiene usuarios, incidencias, ubicaciones e historiales en PostgreSQL. Reiniciar el backend no elimina esos registros. No existe directorio ni volumen de imágenes: la API no acepta ni almacena archivos de incidencias.

Guías: [arquitectura](architecture.md), [desarrollo](development.md) y [backend](../backend/README.md).
