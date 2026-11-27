# DD-002 — Servicio externo para subir imágenes de las incidencias

| Metadato | Valor |
|---|---|
| Estado | Pendiente de revisión |
| Autoría | Equipo 13, Sofía Si Villalba Jiménez |
| Fecha / última revisión | 2026-11-24 / 2026-11-27 |
| Iteración | Sprint 2 - Poblar Base de Datos para analizar métricas |
| Revisores | Pendiente |
| Enlaces | Issue #160; [ADR 0007](../adr/0007-almacenamiento-fotos.md); [conexión de fotos con S3](../conexion-s3-fotos.md); [población de incidencias](../spec/features/20-11-26-poblar-incidencias-masivas/spec.md) |

## 1. Resumen ejecutivo

**Problema**

Se debe poblar la base de datos para analizar métricas. Anteriormente se utilizaba Cloudinary para almacenar las fotos, pero el servicio se quedaba corto para la cantidad de imágenes prevista.

**Solución propuesta**

Migrar el almacenamiento a un bucket privado de S3 en AWS, accediendo a las imágenes a través de CloudFront. El backend se encarga de subir las fotos y de generar los enlaces para consultarlas.

**Razón principal**

S3 permite almacenar las imágenes sin ocupar espacio local del equipo y se adapta mejor al volumen que se necesita. Además, AWS es el servicio que se utilizará posteriormente en la asignatura.

**Principal riesgo**

El equipo utiliza una cuenta de AWS con saldo limitado. Si se agota o se pierde el acceso a la cuenta, el servicio de imágenes podría dejar de estar disponible. Por ello, será necesario controlar el gasto y decidir cómo recuperar las imágenes en caso de problema.

## 2. Contexto y problema

El servicio de fotos se encontraba previamente en Cloudinary. Al aumentar el número de incidencias y fotos necesarias para las métricas, se decidió buscar una alternativa con más capacidad.

Actualmente, las imágenes se almacenan en un bucket privado de S3 situado en la región de Estocolmo (`eu-north-1`). El backend tiene permiso para subir y consultar los objetos, mientras que CloudFront permite servirlos mediante enlaces firmados. La configuración se explica en la [guía de conexión](../conexion-s3-fotos.md).

La primera población documentada contempla 5.000 incidencias sin fotos. Además, existe una ampliación con 45.000 fotos, según lo indicado por el equipo. Queda pendiente añadir el enlace a esa ampliación.

## 3. Objetivos, no objetivos y alcance

**Objetivos**

- Poder almacenar y consultar las fotos de las incidencias desde un servicio externo.
- Disponer de capacidad para las 45.000 fotos de la ampliación.
- Mantener el bucket privado y dar acceso a las imágenes mediante enlaces temporales.

**No objetivos**

- Modificar el diseño de la aplicación móvil o web.
- Generar las incidencias y fotos de prueba dentro de este cambio.
- Migrar automáticamente las fotos antiguas de Cloudinary. Si existen imágenes que deban conservarse, se tendrá que preparar esa migración.

**Dentro del alcance:** el backend, la tabla de imágenes, S3 y CloudFront. **Fuera del alcance:** los cambios visuales de los frontends y el script de población de datos.

## 4. Requisitos y drivers arquitectónicos

| ID | Tipo | Necesidad | Cómo comprobarlo | Prioridad |
|---|---|---|---|---|
| RF-1 | Funcional | Subir fotos a una incidencia propia | Subir una imagen con un usuario autenticado y comprobar que se guarda | Alta |
| RF-2 | Funcional | Consultar las fotos de una incidencia | Abrir la incidencia y comprobar que las URL devueltas muestran las fotos | Alta |
| RF-3 | Funcional | Poder reintentar una subida | Repetir la petición con la misma clave y comprobar que no se duplican las fotos | Alta |
| RQ-1 | Capacidad | Almacenar las fotos de la ampliación | Comprobar la carga y el acceso a las imágenes con el volumen previsto | Alta |
| RQ-2 | Seguridad | Mantener las fotos privadas | Comprobar que una URL válida funciona y que el acceso sin firma se rechaza | Alta |
| RQ-3 | Coste | Mantener el servicio dentro de los recursos disponibles | Revisar el consumo de la cuenta de AWS | Alta |
| RC-1 | Restricción | Utilizar AWS para el servicio de imágenes | Comprobar la configuración del bucket y CloudFront | Media |

Actualmente, el backend acepta hasta ocho fotos por incidencia, en formato JPEG, PNG o WebP, de hasta 5 MiB cada una. Los enlaces firmados caducan a los 15 minutos.

## 5. Arquitectura actual y dependencias

La arquitectura general del proyecto se puede consultar [aquí](../architecture.md). No hay un diagrama específico de fotos en este documento.

El flujo de las imágenes es el siguiente:

1. El ciudadano envía las fotos al backend junto a su sesión.
2. El backend comprueba que la incidencia le pertenece y valida las imágenes.
3. Las fotos se suben a S3 y sus referencias se guardan en PostgreSQL.
4. Cuando se consulta la incidencia, el backend genera enlaces temporales para acceder a las imágenes.
5. El cliente utiliza esos enlaces para obtener las fotos a través de CloudFront.

El servicio depende del backend, PostgreSQL, S3, CloudFront y de las credenciales necesarias para acceder a AWS y firmar los enlaces. Si CloudFront no está configurado, el código puede generar enlaces firmados directamente a S3; si la configuración está incompleta, devuelve un error.

## 6. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Cloudinary | Ya se estaba utilizando en el proyecto | El plan utilizado se quedaba corto para el volumen previsto |
| MinIO | Permite gestionar el almacenamiento desde el equipo | Habría que ocuparse del espacio, las copias y la disponibilidad del servicio |
| S3 con CloudFront | Permite almacenar las imágenes fuera del equipo y utilizar AWS, que también se necesita en la asignatura | Depende de la cuenta de AWS y requiere controlar su configuración y consumo |

Se ha elegido S3 con CloudFront porque cubre las necesidades de almacenamiento del proyecto y evita tener que mantener el servicio en un equipo local. Además, adelanta el uso de AWS para la asignatura. La integración ya está implementada; la revisión de este documento sigue pendiente.

## 7. Diseño propuesto

### 7.1. Visión y diagramas C4

- **Contexto:** los ciudadanos crean incidencias y pueden consultar sus imágenes desde Urban Pulse.
- **Contenedores:** los frontends se comunican con el backend, que utiliza PostgreSQL para las referencias y S3 para los archivos. CloudFront sirve las imágenes.
- **Componentes:** el controlador de incidencias recibe la petición; el servicio de fotos gestiona la operación y el servicio de almacenamiento se comunica con S3.
- **Secuencia:** el backend valida y sube las fotos, guarda sus referencias y devuelve enlaces temporales para consultarlas.

Queda pendiente añadir un diagrama específico si el equipo lo considera necesario.

### 7.2. Interfaces y contratos

Para subir fotos se utiliza `POST /incidents/:id/images`. La petición debe estar autenticada y enviar las imágenes en `multipart/form-data`. Solo el ciudadano propietario de la incidencia puede añadir fotos.

Se puede incluir `Idempotency-Key` con un UUID v4 para reintentar la misma subida sin duplicarla. La respuesta devuelve la lista de fotos con su identificador, URL temporal, tipo y fecha. El detalle `GET /incidents/:id` también incluye las imágenes. Los errores y el formato de la petición están documentados en el [controlador](../../backend/src/incidents/incidents.controller.ts).

### 7.3. Modelo y gestión de datos

La tabla `IncidentImage` relaciona cada imagen con su incidencia y guarda la clave del objeto en S3, el tipo de imagen y la fecha. El archivo se almacena en S3 bajo `incidents/<id>/`. La URL no se guarda permanentemente, sino que se genera cuando se consulta la imagen.

Queda pendiente decidir cómo se gestionarán las copias, la recuperación y la posible migración de imágenes anteriores.

### 7.4. Fallos, concurrencia y resiliencia

Si falla una subida, el backend intenta eliminar los objetos que ya se habían subido. Al guardar las referencias se vuelve a comprobar el número de imágenes y la propiedad de la incidencia para evitar problemas cuando llegan varias peticiones a la vez.

Si no se puede confirmar el resultado en la base de datos o falla la limpieza de un objeto, se deja constancia en los registros para revisarlo. En algunas consultas, si falla la obtención de fotos, se devuelve la incidencia con la lista de imágenes vacía.

### 7.5. Seguridad

El bucket tiene el acceso público bloqueado. El backend utiliza permisos para acceder a los objetos de las incidencias y comprueba la sesión y la propiedad antes de permitir una subida. También valida el tamaño y el formato de los archivos.

CloudFront sirve las imágenes mediante URL firmadas que caducan a los 15 minutos. Las credenciales de AWS y la clave privada de firma deben mantenerse fuera del repositorio.

### 7.6. Operación y despliegue

La [guía de conexión](../conexion-s3-fotos.md) recoge las variables necesarias, los permisos y los pasos para configurar S3 y CloudFront. También incluye cómo comprobar que el servicio funciona y los errores habituales.

Será necesario revisar el consumo de AWS y los registros de errores. Para volver atrás habría que mantener las imágenes y sus referencias y comprobar que el servicio alternativo funciona antes de retirar la configuración actual.

## 8. Decisiones y trade-offs

| Decisión | Beneficio | Coste o consecuencia | ¿Requiere ADR? |
|---|---|---|---|
| Utilizar S3 privado y CloudFront | Las imágenes se almacenan fuera del equipo y se sirven con enlaces temporales | Dependencia de AWS y de su configuración | [ADR 0007](../adr/0007-almacenamiento-fotos.md), pendiente de revisión |
| Subir las imágenes a través del backend | Se comprueban la sesión, la propiedad y los archivos antes de guardarlos | Las fotos pasan por el backend | Pendiente de decidir |
| Guardar las referencias en PostgreSQL | Las fotos quedan relacionadas con su incidencia | Si falla una operación entre S3 y la base de datos, puede ser necesario revisar los objetos | Pendiente de decidir |

La elección de S3 y CloudFront se recoge en el [ADR 0007](../adr/0007-almacenamiento-fotos.md), pendiente de revisión.

## 9. Plan de implementación y migración

1. Preparar el bucket privado y los permisos de acceso del backend.
2. Configurar CloudFront y las claves para generar enlaces firmados.
3. Aplicar las migraciones necesarias para la tabla de imágenes y configurar el backend.
4. Comprobar la subida y consulta de fotos, así como el rechazo del acceso sin autorización.
5. Si hay fotos anteriores que deban conservarse, preparar su copia y comprobar que siguen asociadas a sus incidencias antes de retirar el servicio anterior.
6. Revisar el consumo y los registros una vez esté en uso.

La integración de S3 y CloudFront ya cuenta con implementación y pruebas descritas en la guía. La posible migración de imágenes antiguas y las pruebas con el volumen completo quedan pendientes de comprobar.

## 10. Estrategia de verificación y evaluación

| Requisito | Prueba | Resultado esperado |
|---|---|---|
| RF-1 y RF-2 | Subir una foto a una incidencia propia y consultar el detalle | La foto se guarda y puede abrirse desde la URL devuelta |
| RF-1 | Intentar subir archivos inválidos o fotos a una incidencia ajena | La petición se rechaza |
| RF-3 | Repetir una subida con la misma clave de idempotencia | No se duplican las fotos |
| RQ-1 | Probar el almacenamiento con las fotos de la ampliación | Las imágenes se almacenan y pueden consultarse |
| RQ-2 | Acceder con URL válida, caducada y sin firma; probar S3 sin autenticación | La URL válida funciona y el resto de accesos se rechazan |
| Fallos | Provocar un fallo durante la subida o el registro | Se limpian los objetos cuando sea posible o queda constancia para revisarlos |

La guía recoge pruebas realizadas en AWS los días 15 y 16 de noviembre de 2026, incluyendo una subida y lectura completas. Estas pruebas no comprueban por sí solas el volumen de la ampliación. Los permisos y el acceso a CloudFront también deben probarse en AWS, ya que una simulación local no los verifica.

## 11. Riesgos, hipótesis y cuestiones abiertas

| ID | Tipo | Descripción | Impacto | Acción y responsable |
|---|---|---|---|---|
| H-1 | Hipótesis | La ampliación contempla 45.000 fotos | Es necesario tener capacidad para almacenarlas y consultarlas | Equipo: añadir la referencia a la ampliación |
| R-1 | Riesgo | Se agota el saldo o se pierde el acceso a AWS | El servicio de imágenes podría dejar de funcionar | Equipo: controlar el consumo y preparar la recuperación |
| R-2 | Riesgo | Una operación falla después de subir un archivo | Pueden quedar objetos sin su referencia o fotos inaccesibles | Backend: revisar los registros y limpiar o recuperar los objetos afectados |
| R-3 | Riesgo | Se filtran credenciales o enlaces de imágenes | Acceso no autorizado a las fotos | Equipo: proteger las claves y revisar los permisos |
| Q-1 | Pregunta | ¿Hay imágenes antiguas que deban copiarse desde Cloudinary? | Podrían quedar fotos fuera del nuevo servicio | Equipo: comprobarlo antes de retirar el servicio anterior |
| Q-2 | Pregunta | ¿Cómo se harán las copias y la recuperación de imágenes? | No se podría recuperar el servicio fácilmente ante una pérdida | Equipo: acordar el procedimiento |

## 12. Revisión y resultado

La integración está implementada y la guía recoge pruebas de funcionamiento en AWS. Quedan pendientes la revisión del documento, la comprobación del volumen de la ampliación y las decisiones sobre recuperación y posibles fotos antiguas. El [ADR 0007](../adr/0007-almacenamiento-fotos.md) recoge la decisión y está pendiente de revisión.

## Checklist de aprobación

- [x] Problema y alcance delimitados.
- [x] Requisitos y restricciones documentados.
- [x] Alternativas comparadas.
- [ ] Diagramas y contratos revisados por el equipo.
- [ ] Seguridad, operación y recuperación revisadas.
- [ ] Pruebas con el volumen de la ampliación realizadas.
- [x] Riesgos y cuestiones pendientes documentados.
- [ ] Revisión técnica del diseño y del ADR realizada.

