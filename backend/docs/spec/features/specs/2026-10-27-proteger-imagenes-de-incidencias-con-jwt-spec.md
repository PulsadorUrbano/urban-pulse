# 2026-10-27 - Especificación: proteger imágenes de incidencias con JWT

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA: identificador exacto no expuesto por la sesión.
- Rama: feature-login; preservar login y permisos de incidencias ya implementados.
- Estado: implementado y verificado; protección de la ruta estática sustituida por descarga autorizada.
- Plan: [Ejecución y confirmación](../plans/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-plan.md).

## Objetivo y decisiones vigentes

Cerrar la lectura anónima de imágenes servidas por /uploads, aplicando JWT, usuario/rol actual y propiedad de la incidencia. El usuario solicitó protegerlas tras explicar la política de propietario u operador admin/administrative; se ejecuta ese alcance sin introducir otro sistema de acceso.

Enfoque mínimo: sustituir el montaje estático completo por un controlador protegido en la misma URL generada. Tokens en consulta, URLs firmadas, cookies y un nuevo almacenamiento requieren otro diseño y no son necesarios aquí. Conservar URLs y archivos actuales; cambiar la autorización es deliberado.

## Contexto verificado

main.ts usa useStaticAssets sobre uploadsRoot y permite eludir las guardas. UploadStorageService.save escribe imágenes con UUID y extensión de MIME controlados por servidor. IncidentsService guarda su metadata y findOne(id,usuario) ya controla propietario/operadores. La asociación en memoria es la autoridad; un archivo huérfano tras reiniciar no puede recuperar permiso por existir en disco.

## Contrato HTTP

| Ruta | Entrada | Acceso y respuesta |
| --- | --- | --- |
| GET /uploads/incidents/:id/:archivo | id UUID y archivo exacto registrado | Bearer; civic propietario o admin/administrative actuales; 200 con bytes de imagen |

- Reutilizar JwtAuthGuard y AccesoIncidenciasGuard, metadata civic/admin/administrative. Usuario eliminado o JWT inválido/ausente: 401; rol/vinculación insuficientes: 403.
- id inválido: 400. Incidencia ausente o ajena, imagen no registrada, nombre/extensión alterados, archivo ausente/no regular: 404 sin revelar rutas locales.
- La descarga exige Authorization, también al abrir una URL conocida. No aceptar tokens en query. Las URLs de las respuestas siguen siendo /uploads/incidents/{id}/{imagenUUID}.{jpg|png|webp}.
- Buscar el nombre exacto reconstruido desde image.id y MIME registrados; no utilizar la URL ni un nombre arbitrario del cliente como ruta física. Comparar después de la decodificación normal del router y no volver a decodificar.
- No mantener static como fallback para variantes, rutas sueltas o imágenes no registradas. HEAD heredado de GET sigue pasando por guardas; no crear endpoint de listado de archivos.
- Content-Type corresponde al MIME registrado; Content-Disposition inline con nombre de servidor, Cache-Control: private, no-store y X-Content-Type-Options: nosniff. Sin credenciales o datos sensibles en nombres/cabeceras.
- Errores inesperados de disco: 500 genérico, sin ruta absoluta. Respuesta completa; no se añade soporte de Range/304 ni caché compartida.

## Modelos y objetos Prisma

Reutilizar IncidentImage, Incident y usuarios/ciudadanos existentes, sin cambios de esquema ni tipos generados. Incidencias/historiales siguen en Map e imágenes en archivos locales. Sin migraciones, DB_SYNC, semillas o limpieza de archivos. Las copias ya descargadas o cachés previas no pueden revocarse desde esta ruta.

## Diseño mínimo

Nuevo UploadsController en incidents/controllers registrado en IncidentsModule. Tras guardas y ParseUUIDPipe, obtenerImagen(id,archivo,usuario) reutiliza findOne y verifica pertenencia; devuelve incidenciaId canónico y copia de metadata.

UploadStorageService reconstruye el nombre usando el MIME controlado y lee solo esa imagen. Resolver realpath de raíz y archivo y comprobar pertenencia mediante relative/isAbsolute antes de leer; archivo no regular se rechaza. Esto evita escapes por symlink a otra raíz, pero no promete aislamiento frente a un atacante local con escritura concurrente sobre el almacenamiento.

Usar Buffer y StreamableFile: las subidas ya tienen máximo 5 MiB por imagen y se evita exponer mensajes/rutas de errores asíncronos del stream en la versión de Nest instalada. No introducir dependencias ni lógica de autorización duplicada.

## Criterios de aceptación

1. Se elimina el montaje público y la ruta exige JWT y rol actual; no hay acceso alternativo estático en producción.
2. Propietario y operadores permitidos reciben solo imágenes registradas de la incidencia autorizada. Otro ciudadano o archivo huérfano/no registrado recibe 404 antes de lectura.
3. Nombres con traversal, separadores, porcentajes, NUL, extensiones falsas o dobles no permiten acceso. Escape real fuera de raíz y archivo no regular se rechazan.
4. Respuesta conserva MIME/bytes/URL y cabeceras de privacidad. Archivo desaparecido es 404; fallo inesperado es 500 sin rutas del sistema.
5. Unitarias de rutas, permisos, pertenencia y almacenamiento, build/lint y revisión del arranque confirman el cierre. Sin frontend, DB real, e2e/integración, commit ni push.

## Documentación de endpoints

Crear ficha get-uploads-incidents-id-archivo y actualizar catálogo/fichas que todavía indiquen que /uploads es público. Señalar que consumidores deben adjuntar Authorization al descargar; no cambiar frontend en esta tarea.

## Estrategia de verificación

Solo unitarias con fs/Prisma sustituidos. Guardas ya tienen pruebas de JWT/rol actualizado; verificar su metadata en el nuevo controlador. Cubrir propietario/operadores, otra incidencia, traversal y variante codificada, registro perdido, archivo ausente, escape real, directorio y EACCES. Revisión independiente previa y posterior conforme a fix-finding, sin ejecutar una auditoría completa ni generar artefactos de escáner.
