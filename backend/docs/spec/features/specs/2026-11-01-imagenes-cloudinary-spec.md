# 2026-11-01 — Especificación: imágenes en Cloudinary y referencias en PostgreSQL

Estado: especificación de la implementación en la rama; código verificado con unitarias, build y lint. El esquema PostgreSQL local ya está migrado; queda pendiente verificar una subida real a Cloudinary y su recuperación tras reiniciar. Responsable: José González. Asistente: Codex; versión exacta del modelo no disponible.
Rama: feat-imagenes-cloudinary.
Plan: [Implementación](../plans/2026-11-01-imagenes-cloudinary-plan.md).

## Decisiones

Los archivos binarios se guardan en Cloudinary. PostgreSQL local conserva identificadores, URL y relación con la incidencia; no contiene bytes ni Base64. Se conserva el UUID público de cada imagen. cloudinaryId almacena public_id, no asset_id.

La incidencia, ubicación e historiales pasan también a PostgreSQL para conservar las relaciones tras reiniciar. No mantener simultáneamente Map y base de datos como fuentes de verdad. Conservar contratos, validaciones y restricciones de estados actuales; la persistencia no añade autenticación ni valida por sí misma civicId contra usuarios.

## Contratos HTTP

Mantener POST /incidents multipart, GET /incidents, GET /incidents/:id y PATCH de estado/prioridad. Máximo ocho imágenes JPEG/PNG/WebP, hasta 5 MB por archivo. Rechazar campos desconocidos y mantener las validaciones actuales.

Respuesta de imagen sin cambios: id, url, mimeType y createdAt. url pasa a ser secure_url HTTPS de Cloudinary; cloudinaryId es interno y no lo aporta el cliente. No prometer lectura privada: propuesta de entrega pública por URL, pendiente de aprobación. Sin cambios en frontend.

Errores: conservar 400/404/409 actuales; subida o respuesta inválida de Cloudinary produce 502; timeout produce 504; configuración incompleta para una subida produce 503. Fallo PostgreSQL produce 503 sin detalles internos. No devolver 201 hasta confirmar persistencia.

## Modelo y almacenamiento

IncidentImage: conservar id UUID, incidentId UUID, url, mimeType y createdAt; añadir cloudinaryId String único no nulo. La FK y su índice incidentId se mantienen. No mapear las tablas Prisma al diagrama SQL histórico en este cambio; documentar que cloudinary_id del diagrama corresponde a cloudinaryId, pero el UUID sigue siendo la PK por compatibilidad.

Reutilizar Incident, IncidentLocation, CambioEstado y CambioPrioridad. Guardar incidencia, ubicación e imágenes con una operación transaccional. Los cambios de estado/prioridad y su historial se guardan atómicamente; una actualización condicional evita que peticiones concurrentes eludan las reglas de transición.

## Flujo de subida y fallos

Generar UUID de incidencia e imagen antes de subir. Usar public_id determinista urban-pulse/incidents/{incidentId}/{imageId}, overwrite=false. Subir desde los buffers recibidos, sin escribir copias en disco. Validar public_id esperado y secure_url HTTPS en cada respuesta.

Después de subir todas las imágenes, guardar el agregado en PostgreSQL. No mantener una transacción SQL abierta mientras se llama a Cloudinary. Si falla una subida o la persistencia, intentar eliminar los public_id de esta operación, incluido el intento cuya respuesta se perdió por timeout. No borrar imágenes de otras operaciones.

PostgreSQL y Cloudinary no comparten transacción. Una caída del proceso o un fallo de limpieza puede dejar imágenes huérfanas: registrar IDs pendientes de limpieza con identificador de operación, sin secretos ni datos personales. No prometer atomicidad distribuida ni limpieza automática después de una caída. Un timeout al confirmar SQL puede ser ambiguo: comprobar por el UUID de incidencia si se confirmó antes de borrar; si no se puede determinar, conservar imágenes y registrar conciliación pendiente.

## Configuración y límites

CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET solo en backend/.env. Ejemplo sin credenciales reales. Timeout por petición 15000 ms, sin reintento automático de subida. No fallback a archivos locales. No instalar SDK: utilizar fetch, FormData, Blob y node:crypto, con solicitudes firmadas documentadas por Cloudinary.

No migrar ni borrar archivos históricos uploads. Conservar su servicio estático para no romper enlaces antiguos. Los registros en memoria existentes no son recuperables tras reiniciar: explicitarlo antes de cambiar de almacenamiento.

## Aceptación

1. Subida válida devuelve URL Cloudinary y persiste su public_id asociado a una incidencia persistente.
2. Crear una nueva instancia del servicio recupera los datos desde Prisma, sin Map.
3. No se escribe ningún archivo de imagen nuevo localmente.
4. Fallos parciales no devuelven éxito y la limpieza queda limitada a los IDs de esa operación.
5. Sin imágenes no se llama a Cloudinary; persistir la incidencia sigue siendo obligatorio.
6. Se mantienen respuestas, orden de listado, estados, prioridades e historiales; conflictos concurrentes no producen actualizaciones parciales.
7. Credenciales y errores originales del proveedor no aparecen en respuestas ni logs.

## Verificación y estado de despliegue local

La rama cuenta con 183 pruebas unitarias aprobadas, y `npm run build` y `npm run lint` finalizan correctamente. Las pruebas usan dobles para Cloudinary y Prisma; no se probaron Cloudinary ni PostgreSQL reales y estos resultados no prueban persistencia tras reiniciar.

La migración SQL no está preparada/aplicada: no existe historial de migraciones en `backend/prisma/migrations`. Tras autorizar la consulta de solo lectura a `DATABASE_URL` (host `localhost`), PostgreSQL rechazó la conexión (`ECONNREFUSED`) en `::1` y `127.0.0.1:5432`; no se inspeccionaron tablas ni datos ni se pudo definir un baseline seguro. Un intento anterior había sido bloqueado con `EACCES`. No se aplicó SQL a la base de datos. Antes de usar la persistencia con una base real hay que revisar esquema y datos, definir el baseline/migración y validar de forma autorizada la operación y la recuperación tras reiniciar.

## Fuera de alcance

Frontend, despliegue, autenticación, permisos nuevos, migración de archivos anteriores, sustitución/borrado por el usuario y worker de conciliación. Aplicación de migraciones en la base local requiere revisar primero su esquema y datos actuales; nunca reset ni db push automático.
