# 2026-11-01 — Plan de implementación: imágenes Cloudinary y referencias PostgreSQL

> Retirado el 2026-11-09. Este plan se conserva solo como registro histórico y no describe la API activa. La retirada está definida en el [diseño vigente](../../../../../docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md).

Estado: implementación de código completada y verificada con pruebas unitarias; preparación de persistencia bloqueada por la migración pendiente.
Rama local: feat-imagenes-cloudinary.
Especificación: [Contrato](../specs/2026-11-01-imagenes-cloudinary-spec.md).

## Alcance y restricciones de ejecución

Se siguieron las instrucciones de AGENTS.md y backend/AGENTS.md. Trabajar desde backend para los comandos npm. Sin instalar paquetes, commits, push, conexiones reales exitosas, db push, reset ni aplicar migraciones. ESM .js, TypeScript estricto y español. No cambiar frontend. No devolver public_id al cliente ni aceptar IDs Cloudinary desde la petición. La implementación de código ya se realizó; el bloqueo de esquema/migración descrito abajo sigue abierto.

La distribución de archivos por tarea documenta el alcance ejecutado. Los cambios de contrato se coordinan con las fichas de endpoint.

## Tarea A — Modelo y preparación de migración

Archivos: modificar backend/prisma/schema.prisma y database/diagram.dbml. Crear backend/prisma/migrations/20261101000000_imagenes_cloudinary/migration.sql. El coordinador es propietario de la migración; A no aplica SQL.

- [ ] Añadir cloudinaryId String @unique a IncidentImage; conservar id UUID como PK y el índice de incidentId. No guardar bytes.
- [ ] Actualizar el diagrama incident_images: UUID id PK, cloudinary_id único, incident_id FK, URL, MIME y fecha. No renombrar tablas físicas existentes automáticamente.
- [ ] Revisar esquema real local antes de finalizar SQL: actualmente no hay historial de migraciones en backend/prisma. No generar un ALTER ciego ni una inicialización que choque con users/citizens existentes. Si existen tablas o datos, preparar baseline revisado antes de esta migración; registrar bloqueo sin ejecutar SQL. El nombre exacto del baseline solo puede fijarse tras inspección del esquema real autorizada.
- [ ] La migración no inventa cloudinaryId para imágenes antiguas. Si existen registros, exigir estrategia explícita de transición antes de NOT NULL; no borrar ni rellenar con UUID local como si fuera public_id.
- [ ] Regenerar cliente mediante npm exec -- prisma generate --config prisma7.config.ts. No editar src/generated manualmente.

Entrega: modelo, diagrama y SQL revisable, o bloqueo concreto de baseline/datos. B puede avanzar con tipos locales; C depende de tipos regenerados. Ningún agente aplica migraciones.

## Tarea B — Cliente Cloudinary

Crear backend/src/incidents/cloudinary.service.ts y backend/test/incidents/services/cloudinary.service.spec.ts. Modificar backend/.env.example. Sin SDK nuevo.

Interfaces exportadas:
- ImagenCloudinary: { cloudinaryId: string; url: string }.
- subirImagen(publicId: string, archivo: UploadedImageFile): Promise<ImagenCloudinary>.
- eliminarImagen(publicId: string): Promise<void>.

- [ ] Inyectar ConfigService; leer CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET. Validar configuración al usar el cliente, no impedir operaciones sin imágenes.
- [ ] Subida HTTPS a https://api.cloudinary.com/v1_1/{cloud_name}/image/upload. FormData: file Blob, public_id, overwrite=false, timestamp, api_key y signature. Firmar parámetros salvo file/api_key: ordenar pares nombre=valor, unir con &, añadir secreto y SHA-256 hexadecimal. No firmar cloud_name ni resource_type de la ruta.
- [ ] Borrado firmado al endpoint image/destroy con public_id y timestamp. Considerar ok y not found como limpieza satisfecha. No hacer consultas administrativas ni borrados por prefijo.
- [ ] Limitar cada llamada a 15000 ms. No reintentar uploads. Validar respuesta unknown antes de devolverla: public_id igual al solicitado, secure_url HTTPS. Traducir errores a 502/504/503 sin exponer payload ni secreto.
- [ ] Escribir unitarias con fetch simulado: firma reproducible con secreto ficticio/reloj fijo, bytes enviados, public_id esperado, HTTPS, 4xx/5xx, JSON inválido, timeout, falta configuración y destroy no encontrado.
- [ ] Documentar las tres variables con valores vacíos en backend/.env.example.

Entrega: servicio, tipo y pruebas. Solo usa IDs generados por el servidor.

## Tarea C — Sustituir escritura local por Cloudinary

Modificar backend/src/incidents/upload-storage.service.ts y backend/src/incidents/incident.ts. Retirar backend/src/incidents/upload-storage.service.spec.ts; trasladar/adaptar sus casos a backend/test/incidents/services/upload-storage.service.spec.ts. Mantener exports uploadsRoot y la ruta estática antigua, sin escribir nuevos archivos.

Consume B. Entrega interna: IncidentImage conserva campos y añade cloudinaryId; la respuesta pública elimina ese campo mediante serialización explícita.

- [ ] Cambiar save para subir secuencialmente buffers con public_id urban-pulse/incidents/{incidentId}/{imageId}. Registrar ID antes de llamar a Cloudinary para limpiar también respuestas ambiguas.
- [ ] Sustituir remove(incidentId) por eliminarImagenes(publicIds: string[]): Promise<string[]>: devuelve los IDs cuya limpieza falló, no deja de limpiar al primer error. No listar ni eliminar por carpeta.
- [ ] Si una subida falla, compensar todos los IDs intentados y conservar el error principal. Registrar limpieza pendiente por ID sin secretos. La limpieza no puede ocultar el error inicial.
- [ ] Probar cero archivos, éxito múltiple, fallo en segundo archivo, timeout y fallo de limpieza. Sustituir Cloudinary por un doble; comprobar que no se llama a fs.writeFile/mkdir.

## Tarea D — Persistir el agregado y conservar todas las operaciones

Modificar backend/src/incidents/incidents.service.ts, backend/src/incidents/incidents.module.ts, backend/src/incidents/incidents.controller.ts y backend/src/incidents/incident.ts. C y D NO trabajan en paralelo sobre incident.ts; D empieza tras C.

Modificar pruebas existentes: backend/test/incidents/services/incidents.service.spec.ts; listar-incidencias.service.spec.ts; cambiar-estado-incidencia.service.spec.ts; cambiar-prioridad-incidencia.service.spec.ts. No ejecutar ni ampliar e2e heredadas.

- [ ] Inyectar PrismaService y registrar CloudinaryService en IncidentsModule. PrismaModule ya es global; no crear otro cliente ni repositorio genérico.
- [ ] Eliminar Map como almacenamiento. create genera UUID, sube imágenes y hace creación anidada transaccional de Incident, IncidentLocation e IncidentImage. Sin llamada de red dentro de transacción SQL.
- [ ] Si SQL falla, compensar por IDs conocidos solo cuando se confirma ausencia de la incidencia. Si el commit es ambiguo, consultar por UUID: existe, recuperar respuesta; no existe, compensar; consulta falla, conservar imágenes y registrar conciliación pendiente. No borrar imágenes que puedan estar referenciadas por un commit válido.
- [ ] Convertir listarPorCiudadano/findOne/obtenerIncidencia/consultarCambiosEstado/consultarCambiosPrioridad y mutaciones a Promise. Actualizar firmas del controlador sin cambiar rutas ni cuerpos.
- [ ] Listar en SQL filtrando civicId normalizado, orden createdAt descendente e id ascendente; conservar el resumen actual.
- [ ] Consultar detalle con ubicación e imágenes. Serializar fechas ISO y los cuatro campos públicos de imagen; no filtrar accidentalmente secretos por devolver objetos Prisma completos.
- [ ] Cambio de estado: transacción con updateMany condicionado a id y status=reported, comprobar count=1 y crear historial. count=0 distingue 404 de 409. Prioridad: equivalente condicionado a status=validated y crear historial en la misma transacción. Mantener validaciones existentes.
- [ ] Actualizar los dobles Prisma y await de las pruebas existentes; probar rollback, ausencia/404, conflictos concurrentes y persistencia mediante nueva instancia del servicio usando el mismo doble de almacenamiento. No confundir este caso con integración PostgreSQL real.
- [ ] Actualizar Swagger retirando afirmaciones de almacenamiento en memoria; añadir errores Cloudinary/DB documentados. Conservar la advertencia de falta de autenticación actual.

## Tarea E — Documentación y verificación del coordinador

Modificar backend/README.md y backend/AGENTS.md para reflejar persistencia real al implementar. Actualizar fichas backend/docs/spec/endpoint/post-incidents/README.md, get-incidents/README.md, get-incidents-id/README.md, patch-incidents-id-status/README.md y patch-incidents-id-priority/README.md. Actualizar este plan y la especificación.

- [ ] Documentar Cloudinary, metadatos PostgreSQL, variables, error parcial, commit ambiguo y preparación/baseline pendiente. No declarar una migración aplicada si solo está generada.
- [ ] Ejecutar en backend npm test, npm run build y npm run lint. Unitarias sin red ni PostgreSQL; el coordinador ejecuta las pruebas si se delega implementación.
- [ ] Ejecutar git diff --check; comprobar enlaces. Registrar comandos y resultados reales aquí.
- [ ] Antes de aplicar SQL en la base local, revisar SQL, baseline y datos; sin reset ni borrado de uploads. La validación real de subir/consultar/reiniciar se programa aparte con autorización, no como parte de unitarias.

## Dependencias de ejecución

A y B pueden avanzar en paralelo. C depende de B. D depende de A y C. E se ejecuta después de todas las entregas. Un bloqueo de baseline permite escribir y probar código con dobles, pero impide declarar lista la persistencia en el dispositivo.

## Progreso y verificación real

- La implementación de código de las tareas A–D está presente en la rama. Las 183 pruebas unitarias pasan; `npm run build` y `npm run lint` también pasan.
- El 2026-11-01 PostgreSQL local volvió a estar accesible. Se inspeccionaron tablas, columnas, índices y recuentos: `IncidentImage` existía con cero filas, y el diff Prisma→base pedía solo `cloudinary_id` obligatorio y su índice único. Se generó `20261101000000_baseline` desde el esquema existente y se marcó aplicada sin ejecutar sus CREATE; después se aplicó `20261101000001_imagenes_cloudinary` con esos dos cambios. `prisma migrate status` confirmó que ambas están aplicadas y el esquema está al día.
- La migración se aplicó en la base local `urbanpulse_db`. Una consulta posterior confirmó columna no nula, índice único y las dos entradas de historial. No se modificaron las filas preexistentes de usuarios y ciudadanos; la tabla de imágenes estaba vacía.
- Las credenciales de Cloudinary están configuradas (solo se comprobó su presencia, sin mostrar valores). No se efectuó una subida real ni una prueba de integración o reinicio; las 183 unitarias usan dobles y no acreditan ese flujo de extremo a extremo.
- `git diff --check` pasó desde la raíz del repositorio; los enlaces relativos entre especificación y plan resuelven. Los avisos de conversión LF/CRLF no son errores de diff.

## Confirmación de implementación

Código y esquema local preparados. Tras aplicar las migraciones: 183 pruebas unitarias, compilación y lint correctos; `prisma migrate status` indica esquema actualizado y `git diff --check` pasa. Queda pendiente una verificación real de subida a Cloudinary y recuperación de la incidencia tras reiniciar; no presentarla como probada.

Referencia técnica: https://cloudinary.com/documentation/authentication_signatures y https://cloudinary.com/documentation/node_quickstart, consultadas mediante Context7. Antes de implementar Prisma, consultar también la documentación actual de transacciones y migraciones para la versión instalada.
