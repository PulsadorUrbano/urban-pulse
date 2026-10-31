# Arquitectura

## Componentes y responsabilidades

Urban Pulse separa la aplicación ciudadana móvil, la interfaz web municipal y de análisis, la API y la base de datos. Los servicios de los frontends realizan solicitudes HTTP y también incluyen flujos con datos simulados. La API utiliza PostgreSQL para autenticación y almacenamiento en memoria para incidencias. Los README de los componentes detallan su estado funcional y de integración.

| Componente | Responsabilidad prevista |
| --- | --- |
| [Móvil](../frontend-mobile/README.md) | Comunicar incidencias, aportar ubicación y evidencias, y consultar su evolución. |
| [Web](../frontend-web/README.md) | Validación, asignación, priorización, gestión municipal y análisis. |
| [Backend](../backend/README.md) | Autenticación, contratos HTTP y lógica de dominio compartida. |
| Base de datos | Persistencia relacional y datos geográficos; servicio definido en [Compose](deployment.md). |

## API y comunicación

La API organiza la entrada HTTP en controladores, valida los datos mediante pipes y concentra la lógica en servicios. La autenticación utiliza JWT y Prisma; las imágenes se reciben como multipart y se sirven bajo `/uploads/`. El [README del backend](../backend/README.md) describe módulos activos, contratos, persistencia y configuración.

La configuración de conexión de cada consumidor se documenta en los README de [web](../frontend-web/README.md) y [móvil](../frontend-mobile/README.md). Los puertos, la red interna y las dependencias entre servicios de Compose se describen en [despliegue](deployment.md).

## Dominio

Los conceptos siguientes describen el dominio del producto. Su presencia en el modelo no implica que todas sus operaciones estén implementadas; el alcance de la API se detalla en el README del backend.

| Concepto | Significado |
| --- | --- |
| `Incident` | Reporte con descripción, categoría, localización, prioridad, estado y marcas temporales. |
| `User` | Ciudadano o profesional que crea, consulta o modifica según sus permisos. |
| `UrbanAsset` | Elemento físico identificable: semáforo, contenedor, fuente, parada, aparcamiento o zona verde. |
| `UrbanContext` | Contexto de clima, tráfico, movilidad, eventos, ambiente, demografía y entorno espacial. |

El [DBML](../database/diagram.dbml) incluye usuarios y roles, ciudadanía, incidencias, categorías, activos, ubicaciones, direcciones, contextos, imágenes, departamentos, equipos y cambios de estado y prioridad. Es un diseño de referencia, no el inventario de tablas utilizadas por el backend.

El contrato HTTP, el esquema Prisma y el DBML representan niveles distintos del sistema. Los estados del modelo no implican por sí solos transiciones o permisos implementados.

## Modelo de datos y recursos existentes

El [esquema Prisma](../backend/prisma/schema.prisma) define usuarios, ciudadanos, incidencias, ubicaciones, imágenes y cambios de estado y prioridad. Los servicios de autenticación acceden a PostgreSQL; el estado del resto del almacenamiento se mantiene en el [README del backend](../backend/README.md).

- [Diagrama C4 existente](../backend/docs/c4/c4.drawio_1.png): recurso de referencia; debe contrastarse con el estado de implementación descrito aquí.
- [Modelo DBML](../database/diagram.dbml) y [representación SQL](../backend/docs/migrations/001_base_diagram.sql): diseños de referencia para la persistencia. La inicialización de la base de datos se explica en [despliegue](deployment.md).
- [ADRs existentes](../backend/docs/adr/): decisiones de arquitectura en su ubicación actual. Su contenido no sustituye la comprobación del código integrado.

La operación de contenedores se describe en [despliegue](deployment.md); la preparación local, en [desarrollo](development.md).
