# Urban Pulse

Urban Pulse es un proyecto universitario para gestionar incidencias urbanas en Málaga. Busca convertir un reporte aislado en una unidad de trabajo con contexto, seguimiento y capacidad de análisis, manteniendo la decisión humana en actuaciones sensibles.

Está dirigido a la ciudadanía que comunica incidencias, al personal municipal que las gestiona y a responsables y analistas que necesitan información para planificar.

## Estado del proyecto

El proyecto dispone de autenticación ciudadana, registro y consulta de incidencias, categorías y operaciones de validación y prioridad. La aplicación móvil incluye acceso, registro y seguimiento de incidencias propias; la web incorpora pantallas de acceso y validación con datos de demostración. Se prevén más funciones de gestión municipal y análisis con datos contextuales, indicadores y modelos predictivos. Consulta el alcance de cada componente en los README de [backend](backend/README.md), [web](frontend-web/README.md) y [móvil](frontend-mobile/README.md).

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| NestJS y TypeScript | API backend. |
| React y Vite | Interfaz municipal en JavaScript/JSX y TypeScript. |
| React Native, Expo y TypeScript | Base de la aplicación ciudadana para Android, iOS y web. |
| Expo Router | Navegación móvil basada en archivos. |
| PostgreSQL y PostGIS | Base de datos relacional y geográfica definida en Compose. |
| Prisma | Modelado de datos y acceso a PostgreSQL para autenticación. |
| Docker Compose | Orquestación de base de datos y backend. |
| Vitest y Jest | Pruebas de backend y web con Vitest; móvil con Jest. |

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
| [backend/docs/adr/](backend/docs/adr/) | Decisiones de arquitectura, en su ubicación actual. |

Para empezar, consulta la [guía de desarrollo](docs/development.md) y el README de tu componente.
