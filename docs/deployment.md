# Despliegue y operación con Compose

## Servicios

El `docker-compose.yml` de la raíz define PostgreSQL/PostGIS, backend y los frontends web y móvil. Compose selecciona las etapas de desarrollo para que los cambios de código se apliquen sin reconstruir. El móvil se ejecuta en el teléfono físico con Expo Go; Compose no crea un simulador ni inicia el mock.

| Servicio | Configuración | Acceso y almacenamiento |
| --- | --- | --- |
| `database` | `imresamu/postgis:16-3.5-bookworm`, contenedor `urbanpulse_db`. | `database:5432` desde la red de Compose y `127.0.0.1:5432` desde el equipo local. Volumen `pgdata` en `/var/lib/postgresql/data`. |
| `backend` | Etapa `development` de `backend/Dockerfile`; NestJS con `start:dev`. | Puerto `API_PORT` publicado; código montado desde `backend/`. |
| `frontend-web` | Etapa `development` de `frontend-web/Dockerfile`; Vite con recarga en caliente. | Puerto 5173 del contenedor publicado como `WEB_PORT` (8080 por defecto); Vite pasa `/api` al backend. |
| `frontend-mobile` | Etapa `development` de `frontend-mobile/Dockerfile`; Expo/Metro. | Puerto `EXPO_PORT` (8081 por defecto); código montado desde `frontend-mobile/`. |

Los servicios utilizan `restart: always` y la red bridge `urbanpulse_net`. El backend depende de que PostgreSQL supere su healthcheck; la web y Expo esperan a que el backend se inicie.

El Dockerfile del backend separa dependencias, desarrollo, compilación y ejecución de producción. La etapa de producción instala únicamente dependencias de producción y copia `dist/`. El Dockerfile web separa dependencias, desarrollo, build de Vite y ejecución con Nginx. Compose usa las etapas de desarrollo; las imágenes de producción mantienen las etapas finales existentes. Expo usa Metro en desarrollo y no genera aquí una imagen nativa de producción.

## Configuración

Desde la raíz del repositorio, copia `.env.example` a `.env` si todavía no tienes ese archivo:

```powershell
Copy-Item .env.example .env
```

Configura `DB_NAME`, `DB_USER` y `DB_PASSWORD` para PostgreSQL, y `JWT_SECRET` y `JWT_EXPIRES_IN` para la autenticación. Compose construye la conexión del backend a `database:5432` con los valores `DB_*`.

`API_PORT` y `WEB_PORT` configuran los puertos del backend y del panel web. `.env.example` usa `3001` y `8080`, respectivamente. PostgreSQL está accesible desde el equipo local en `127.0.0.1:5432`.

`EXPO_PORT` configura el puerto local de Expo (8081). Para usar Expo Go desde el teléfono, configura `MOBILE_HOST_IP` con la IP LAN del equipo donde corre Docker, para que Expo anuncie una dirección accesible. Compose deriva de ese host la URL del backend. También puedes fijar explícitamente `EXPO_PUBLIC_BACKEND_URL` en `.env`, por ejemplo `http://192.168.1.20:3001` (sustituye la IP y el puerto por los de tu entorno). `localhost` solo sirve para clientes ejecutándose en el propio ordenador.

Compose ejecuta el backend con `NODE_ENV=development`, independientemente del valor del `.env`, para habilitar el entorno de desarrollo. Deja `DB_SYNC` vacío y aplica las migraciones desde el equipo local, donde está instalado Prisma CLI.

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

Desde la raíz, inicia la base de datos, el backend y ambos frontends:

```powershell
docker compose up -d --build
```

Con los puertos de `.env.example`, abre el [panel web](http://localhost:8080) o accede directamente a la [API](http://localhost:3001). Compose fuerza `NODE_ENV=development`; si las cuentas de desarrollo están disponibles, puedes probar el panel con `admin` / `admin`.

Expo/Metro está disponible en el puerto 8081. Usa `docker compose logs -f frontend-mobile` para obtener la URL/QR de Expo. Los directorios `node_modules` se conservan en volúmenes nombrados para que los montajes del código fuente no los oculten. Si cambian las dependencias, reconstruye las imágenes con `docker compose up -d --build`.

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
