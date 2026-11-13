# Urban Pulse

Urban Pulse es un proyecto universitario para gestionar incidencias urbanas en Málaga. Busca convertir un reporte aislado en una unidad de trabajo con contexto, seguimiento y capacidad de análisis, manteniendo la decisión humana en actuaciones sensibles.

Está dirigido a la ciudadanía que comunica incidencias, al personal municipal que las gestiona y a responsables y analistas que necesitan información para planificar.

## Estado del proyecto
El backend ofrece autenticación ciudadana, registro y consulta de incidencias, categorías y operaciones de validación y prioridad. El panel web permite al personal municipal iniciar sesión, consultar una incidencia por su identificador y validarla o rechazarla. También incluye una pantalla de asignación de departamento, equipo y técnico cuya integración con la API está pendiente.

La aplicación móvil incluye acceso, registro y pantallas para crear y consultar incidencias propias. El alta desde el móvil está pendiente de adaptarse al contrato actual del backend.

Consulta los README de [backend](backend/README.md), [web](frontend-web/README.md) y [móvil](frontend-mobile/README.md) para conocer el alcance y las instrucciones de cada módulo.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| NestJS y TypeScript | API backend. |
| React y Vite | Interfaz municipal en TypeScript. |
| React Native, Expo y TypeScript | Base de la aplicación ciudadana para Android, iOS y web. |
| Expo Router | Navegación móvil basada en archivos. |
| PostgreSQL y PostGIS | Base de datos relacional y geográfica definida en Compose. |
| Prisma | Modelado de datos y acceso a PostgreSQL para autenticación. |
| Docker Compose | Orquestación de base de datos, backend y panel web. |
| Vitest y Jest | Pruebas de backend y web con Vitest; móvil con Jest. |

## Cómo ejecutar el proyecto

### Aplicación web

Con Docker y Docker Compose instalados, abre una terminal en la raíz del repositorio.

1. Crea un `.env` en la raíz a partir de `.env.example` y completa los valores según la [guía de despliegue](docs/deployment.md#configuración). Para probar el panel con la cuenta `admin`, configura `NODE_ENV=development`. Si partes de una base de datos vacía, sigue los pasos de [primera ejecución](docs/deployment.md#primera-ejecución-con-una-base-de-datos-vacía) antes de continuar.
2. Desde la raíz, ejecuta `docker compose up -d --build` para iniciar la base de datos, el backend y el panel web.
3. Abre [http://localhost:8080](http://localhost:8080) e inicia sesión con el usuario de prueba `admin` y la contraseña `admin`.

### Aplicación móvil

Con el backend de Compose en marcha, sigue el [README de la aplicación móvil](frontend-mobile/README.md) para configurar la conexión e iniciar Expo. Si usas un teléfono, conéctalo a la misma red Wi-Fi que el ordenador y escanea el código QR con Expo Go.

## Repositorio y guías

| Ruta | Contenido |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Ramas, commits, revisión e integración. |
| [docs/architecture.md](docs/architecture.md) | Componentes, dominio, modelo y diagramas. |
| [docs/development.md](docs/development.md) | Preparación del entorno y flujos locales. |
| [docs/deployment.md](docs/deployment.md) | Infraestructura y operación con Compose. |
| [backend/](backend/README.md) | API, configuración, contratos y comprobaciones. |
| [frontend-web/](frontend-web/README.md) | Instalación, scripts y estado del panel web. |
| [frontend-mobile/](frontend-mobile/README.md) | Expo, dispositivos, navegación y limitaciones. |
| [database/diagram.dbml](database/diagram.dbml) | Modelo de datos de referencia. |
| [backend/docs/c4/](backend/docs/c4/) | Diagrama de arquitectura existente. |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura, en su ubicación actual. |

Para empezar, consulta la [guía de desarrollo](docs/development.md) y el README de tu componente.
