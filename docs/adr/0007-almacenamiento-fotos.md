# ADR 0007: Almacenamiento de fotos de incidencias en S3

- Estado: Propuesto, pendiente de revisión.
- Fecha de registro: 2026-11-27.
- Relacionados: [Diseño del servicio de imágenes](../disenyo/disenyo-fotos.md), [conexión de fotos con S3](../conexion-s3-fotos.md).

## Contexto

Las incidencias pueden tener imágenes asociadas. Hasta ahora se utilizaba Cloudinary para almacenarlas, pero el servicio se quedaba corto para el volumen previsto de fotos. Además, el equipo necesita utilizar AWS en la asignatura.

La primera población documentada contempla 5.000 incidencias sin fotos. Según lo indicado por el equipo, existe una ampliación con 45.000 fotos. Necesitamos almacenar y consultar esas imágenes sin ocupar espacio local del equipo y evitando que el bucket sea público.

## Decisión

Utilizar un bucket privado de Amazon S3 para almacenar las fotos de las incidencias y CloudFront para servirlas mediante URL firmadas y temporales.

El backend recibe y valida las fotos, comprueba que el ciudadano sea propietario de la incidencia y las sube a S3. Las referencias a los objetos se guardan en PostgreSQL, en la tabla `IncidentImage`. Al consultar una incidencia, el backend genera las URL necesarias para acceder a sus imágenes.

La integración está implementada y los pasos de configuración y las pruebas realizadas se recogen en la [guía de conexión](../conexion-s3-fotos.md). La revisión formal de este ADR queda pendiente.

## Alternativas consideradas

- **Mantener Cloudinary:** ya se estaba utilizando y no requería cambiar de proveedor, pero el plan utilizado se quedaba corto para el volumen previsto.
- **Utilizar MinIO:** permitiría gestionar el almacenamiento desde el equipo, pero también habría que encargarse del espacio, las copias y la disponibilidad del servicio.
- **Utilizar S3 con CloudFront:** almacena los archivos fuera del equipo, permite mantener el bucket privado y adelanta el uso de AWS para la asignatura. Es la opción elegida.

## Consecuencias

Positivas:

- Las imágenes se almacenan fuera del equipo y quedan asociadas a sus incidencias en la base de datos.
- El bucket permanece privado y las imágenes se consultan mediante enlaces temporales.
- Se aprovecha AWS para una necesidad que también se plantea en la asignatura.

Negativas y riesgos:

- El servicio depende de la cuenta de AWS, sus permisos y su saldo. Habrá que controlar el consumo.
- Hay que proteger las credenciales y la clave utilizada para firmar los enlaces.
- S3 y PostgreSQL no comparten una misma transacción; si falla una operación, puede ser necesario revisar y limpiar objetos.
- Queda pendiente comprobar el volumen completo de la ampliación y acordar cómo se harán las copias y la recuperación. Si hay imágenes anteriores que deban conservarse, también habrá que preparar su migración.
