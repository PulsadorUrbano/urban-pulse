# Arquitectura

## Componentes y responsabilidades
Urban Pulse separa la aplicación ciudadana móvil, la interfaz web municipal, la API y la base de datos. Los frontends se comunican con la API mediante HTTP y disponen de algunos flujos simulados para desarrollo. La API utiliza Prisma para persistir en PostgreSQL los datos de autenticación, las incidencias, sus ubicaciones y los cambios de estado y prioridad. Los README de los componentes detallan el alcance de cada cliente.

| Componente | Responsabilidad prevista |
| --- | --- |
| [Móvil](../frontend-mobile/README.md) | Comunicar incidencias, aportar ubicación y consultar su evolución. |
| [Web](../frontend-web/README.md) | Validación, asignación, priorización, gestión municipal y análisis. |
| [Backend](../backend/README.md) | Autenticación, contratos HTTP y lógica de dominio compartida. |
| Base de datos | Persistencia relacional y datos geográficos; servicio definido en [Compose](deployment.md). |

## API y comunicación

Los controladores reciben las peticiones HTTP, los pipes validan los datos y los servicios ejecutan la lógica de negocio. El listado de incidencias es público. El alta, el detalle y los cambios de estado y prioridad requieren autenticación mediante JWT.

Los contratos se detallan en el [catálogo de endpoints](../backend/docs/spec/endpoint/README.md). La conexión de cada cliente se explica en los README de [web](../frontend-web/README.md) y [móvil](../frontend-mobile/README.md). La red y los puertos de Docker Compose se documentan en la [guía de despliegue](deployment.md).

## Dominio

Los conceptos siguientes describen el dominio del producto. Su presencia en el modelo no implica que todas sus operaciones estén implementadas; el alcance de la API se detalla en el README del backend.

| Concepto | Significado |
| --- | --- |
| `Incident` | Reporte con descripción, categoría, localización, prioridad, estado y marcas temporales. |
| `User` | Ciudadano o profesional que crea, consulta o modifica según sus permisos. |
| `UrbanAsset` | Elemento físico identificable: semáforo, contenedor, fuente, parada, aparcamiento o zona verde. |
| `UrbanContext` | Contexto de clima, tráfico, movilidad, eventos, ambiente, demografía y entorno espacial. |

El [DBML](../database/diagram.dbml) incluye usuarios y roles, ciudadanía, incidencias, categorías, activos, ubicaciones, direcciones, contextos, departamentos, equipos y cambios de estado y prioridad. Es un diseño de referencia, no el inventario de endpoints disponibles.

El contrato HTTP, el esquema Prisma y el DBML representan niveles distintos del sistema. Los estados del modelo no implican por sí solos transiciones o permisos implementados.

## Modelo de datos y recursos existentes

El [esquema Prisma](../backend/prisma/schema.prisma) define usuarios, ciudadanos, incidencias, ubicaciones y cambios de estado y prioridad. Autenticación e incidencias acceden a PostgreSQL mediante Prisma; el estado se mantiene en el [README del backend](../backend/README.md).

- [Diagrama C4 existente](../backend/docs/c4/c4.drawio_1.png): recurso de referencia; debe contrastarse con el estado de implementación descrito aquí.
- [Modelo DBML](../database/diagram.dbml) y [representación SQL](../backend/docs/migrations/001_base_diagram.sql): diseños de referencia para la persistencia. La inicialización de la base de datos se explica en [despliegue](deployment.md).
- [ADRs existentes](adr/): decisiones de arquitectura en su ubicación actual. Su contenido no sustituye la comprobación del código integrado.

La operación de contenedores se describe en [despliegue](deployment.md); la preparación local, en [desarrollo](development.md).
