# Despliegue y operación con Compose

## Servicios

El `docker-compose.yml` de la raíz define PostgreSQL/PostGIS, backend y frontend web. La aplicación móvil se ejecuta mediante el procedimiento de su README.

| Servicio | Configuración | Acceso y almacenamiento |
| --- | --- | --- |
| `database` | `imresamu/postgis:16-3.5-bookworm`, contenedor `urbanpulse_db`. | Puerto 5432 en la red interna; volumen `pgdata` en `/var/lib/postgresql/data`. |
| `backend` | Construcción desde `backend/Dockerfile`, contenedor `urbanpulse_backend`. | Puerto `API_PORT` publicado en el mismo puerto. |
| `frontend-web` | Construcción desde `frontend-web/Dockerfile`, contenedor `urbanpulse_frontend_web`; build con Node.js y servicio estático con Nginx. | Puerto 80 del contenedor publicado como `WEB_PORT` (8080 por defecto); `/api/` se redirige al backend interno. |

Los servicios utilizan `restart: always` y la red bridge `urbanpulse_net`. El backend depende de que PostgreSQL supere su healthcheck; el frontend espera a que el backend se inicie.

El Dockerfile del backend utiliza una sola etapa con `node:22-alpine`, instala Nest CLI y las dependencias, copia el código y ejecuta `npm run deploy`. Ese script genera el cliente Prisma, compila y arranca con Nest CLI. El Dockerfile del frontend construye los recursos estáticos de Vite en una etapa Node.js y los sirve desde Nginx; Nginx resuelve las rutas de la SPA y redirige `/api/` a `backend` dentro de Compose, quitando el prefijo `/api`.

## Configuración

Desde la raíz, copia el ejemplo únicamente si no existe ya `.env`:

```powershell
Copy-Item .env.example .env
```

Compose exige `DB_NAME`, `DB_USER` y `DB_PASSWORD`, que se traducen a las variables `POSTGRES_*` de la base de datos. `API_PORT` configura el puerto del backend (3000 si se omite) y `WEB_PORT` el puerto local del frontend (8080 si se omite). Completa los valores del entorno sin subirlos al repositorio.

El backend recibe el `.env` raíz mediante `env_file`. Compose fija `PORT` con `API_PORT` y construye `DATABASE_URL` con el host `database` y el puerto 5432. Las variables propias de la API se mantienen en el [README del backend](../backend/README.md); para autenticación, define también `JWT_SECRET` y `JWT_EXPIRES_IN` en el entorno del contenedor.

`NODE_ENV=development` activa los usuarios de desarrollo. `DB_SYNC` selecciona la sincronización al arrancar: vacío no ejecuta cambios, `dbpush` ejecuta `prisma db push` y `deploy` ejecuta `prisma migrate deploy`. El servicio de sincronización registra el resultado y captura los errores. El SQL de documentación no se carga automáticamente por Compose.

`backend/.env` pertenece al flujo local y no sustituye el `.env` raíz de Compose. No hay archivos Compose separados por entorno.

## Construcción y arranque

Desde la raíz, después de configurar las variables y preparar el esquema utilizado por la aplicación:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Para iniciar únicamente PostgreSQL/PostGIS:

```bash
docker compose up -d database
```

La base de datos no publica 5432 al anfitrión. Los servicios de la red interna la utilizan como `database:5432`. Abre `http://localhost:8080` para usar la web con los valores por defecto; las peticiones de API pasan por el proxy de Nginx. También se puede acceder directamente a la API en `http://localhost:3001` con los valores de `.env.example`.

Se validó `docker compose config --quiet` y se construyó la imagen `frontend-web`; no se inició el conjunto de servicios. El procedimiento descrito no constituye una validación de producción.

## Salud y logs

El healthcheck de PostgreSQL ejecuta `pg_isready` con el usuario y la base configurados cada 5 segundos, con timeout de 5 segundos y 5 reintentos. Comprueba disponibilidad de PostgreSQL, no la presencia de las tablas del dominio.

Swagger está configurado en `http://localhost:3000/`. `GET http://localhost:3000/health` devuelve `{ "status": "ok" }` según el controlador; no comprueba la base de datos. Compose no define un healthcheck adicional para el backend.

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

La API mantiene usuarios en PostgreSQL e incidencias e historial en memoria. Reiniciar el backend elimina estos últimos. Las imágenes se guardan en el sistema de archivos del backend; Compose no monta un volumen para ese directorio. Su conservación no equivale a persistencia del registro de la incidencia.

Guías: [arquitectura](architecture.md), [desarrollo](development.md) y [backend](../backend/README.md).
