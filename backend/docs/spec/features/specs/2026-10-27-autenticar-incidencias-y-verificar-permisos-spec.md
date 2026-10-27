# 2026-10-27 - Especificación: autenticar incidencias y verificar permisos

> Actualización posterior del 2026-10-27: el límite de /uploads público descrito como fuera de alcance en esta fase ya fue abordado por la [protección de imágenes](../specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md). Se conserva aquí la historia de identidad; las imágenes ahora requieren JWT y permiso. La persistencia en memoria sigue pendiente.


- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA: identificador exacto no expuesto por la sesión.
- Rama: feature-login; conservar los cambios aprobados de login que ya están en el checkout.
- Última actualización: 2026-10-27.
- Estado: implementado y verificado; revisión final sin hallazgos accionables.
- Plan: [Implementación y cierre de deuda](../plans/2026-10-27-autenticar-incidencias-y-verificar-permisos-plan.md).

## Objetivo y decisiones vigentes

Resolver DEUDA-27-01, DEUDA-47-01 y DEUDA-28-01 de identidad/autorización: obtener propietario y actor de una identidad JWT verificada, comprobar usuario y rol actuales en DB y evitar que un solicitante lea o modifique incidencias suplantando civicId.

- Confirmado por el usuario: solo identidad y permisos; conservar incidencias e historiales en memoria e imágenes locales.
- Confirmado por el usuario: únicamente admin y administrative pueden validar/rechazar y asignar prioridad manual.
- Enfoque: reutilizar JWT y modelos existentes; comprobar identidad/rol actual antes del acceso y derivar actor/propietario en el servidor. Rechazar confiar solo en role del JWT porque puede estar desactualizado; no introducir otro sistema de login.
- Decisiones de contrato: retirar civicId de entradas, rechazarlo como campo desconocido y consultar las propias incidencias sin filtro de ciudadano. GET individual permitirá al ciudadano propietario y a los dos roles operadores; acceso cruzado de un ciudadano devuelve 404 para no revelar existencia.
- Fuera de alcance: persistencia de incidencias, migraciones, frontend, listado administrativo global, permisos por departamento/equipo, nuevos roles, refresh/revocación de tokens y nuevas dependencias.

## Contexto inicial verificado (antes de implementar)

[IncidentsController](../../../../src/incidents/incidents.controller.ts) recibe civicId desde consulta/cuerpo y no usa guardas. [IncidentsService](../../../../src/incidents/incidents.service.ts) conserva el Map y registra actorId a partir de la entrada. [JwtAuthGuard](../../../../src/auth/jwt-auth.guard.ts) ya valida firma, expiración y claims, pero no consulta si usuario/rol siguen vigentes. users.role y citizens.user_id existen en [Prisma](../../../../prisma/schema.prisma).

Deudas originales: [consulta por ciudadano](2026-10-23-consultar-incidencias-por-ciudadano-spec.md), [estado](2026-10-23-validar-rechazar-incidencias-con-motivo-spec.md) y [prioridad](2026-10-23-asignar-prioridad-manual-con-motivo-y-actor-spec.md). No marcarlas resueltas antes de implementar y comprobar sus criterios.

## Contrato HTTP

JWT obligatorio en las cinco rutas de incidencias. Categorías mantiene su acceso actual.

| Ruta | Entrada nueva | Acceso y respuesta |
| --- | --- | --- |
| POST /incidents | Multipart actual sin civicId | Solo civic con registro citizens existente; 201, propietario derivado de citizens.user_id |
| GET /incidents | Sin cuerpo ni parámetros de consulta | Solo civic con citizens existente; 200 con sus resúmenes, mismo orden y cuatro campos |
| GET /incidents/:id | UUID | civic: solo propia; admin/administrative: cualquier incidencia; 200 con recurso público |
| PATCH /incidents/:id/status | Solo status y cause | admin/administrative actuales; 200 y actorId del usuario real del JWT |
| PATCH /incidents/:id/priority | Solo priority y cause | admin/administrative actuales; 200 y actorId del usuario real del JWT |

### Validación y normalización

- Authorization: Bearer válido con las reglas ya implementadas en login. Usuario inexistente en DB: 401. Fallo de DB: error de servidor, sin recurrir a identidad declarada por cliente.
- Consultar users por el userId verificado y obtener id, role y citizen.user_id. Los roles permitidos se comparan con la fila actual; no usar el rol del token para decidir permisos. Un token emitido cuando era admin no conserva acceso tras cambiar a civic.
- Civic sin relación citizens: 403 al crear, listar o consultar como ciudadano. No confundir ausencia de relación con autenticación válida para operar como otro rol.
- Rechazar civicId, actorId, userId o cualquier otro campo externo de identidad en cuerpos/consulta: 400 para solicitantes autorizados. En GET listado cualquier parámetro, incluido civicId, se rechaza; nunca produce listado global.
- Mantener title de 4 a 35 caracteres, hasta 8 imágenes y validaciones actuales de ubicación/metadata. El servidor incorpora el civicId real al objeto interno antes de create.
- UUID de recurso inválido: 400; inexistente: 404. GET individual de una incidencia ajena por civic: 404. UUID se compara sin distinguir mayúsculas, también al comprobar propietario.
- Sin token, firma/claims inválidas, expiración o usuario eliminado: 401. Rol actual no permitido: 403 antes de procesar entrada o archivos. Después de autenticación y autorización se validan campos (400) y las reglas de estado (409).
- Estado: reported -> validated/rejected con causa no vacía; prioridad solo en validated, low/medium/high con motivo obligatorio. Mantener comportamiento y atomicidad actuales.
- Guardas se ejecutan antes del interceptor de subida: un solicitante rechazado no guarda archivos, registros o historial.
- Respuestas sin cambios de estructura: civicId del recurso sigue siendo propietario; historial y actor internos no se exponen. El listado mantiene id/title/status/createdAt, orden descendente y desempate por id.
- Cambio incompatible deliberado: consumidores deben enviar JWT y dejar de elegir civicId. No admitir un modo antiguo de suplantación como compatibilidad. Frontend sin modificar en esta fase.

## Modelos y objetos Prisma

Reutilizar users, citizens, profile_role y modelos de incidencias/historial existentes. No modificar schema.prisma ni inventar tablas de sesión o relaciones SQL mientras incidentes siga en memoria. citizens.user_id es la vinculación real del ciudadano a users.id; el actor de auditoría es users.id actual del solicitante autenticado.

- Estado interno: Map e imágenes locales; reiniciar sigue perdiendo metadatos e historial. No trasladar ni reconstruir registros previos ni atribuirlos a otro usuario.
- Autenticación ya necesita DB. Las pruebas de autorización sustituyen Prisma: no activar DB ni migraciones durante esta tarea.
- Esta fase no aporta transacciones DB ni auditoría durable; mantiene la publicación síncrona de cambios en memoria.

## Diseño mínimo

Crear AccesoIncidenciasGuard en guards/ con PrismaService y Reflector; ejecutar después de JwtAuthGuard. Lee metadata rolesIncidencias mediante SetMetadata y getAllAndOverride, consulta identidad actual, verifica roles y relación ciudadana cuando role=civic, y adjunta usuarioIncidencias al request solo tras autorización completa. Falta de metadata en estas rutas debe denegar por defecto, no abrir acceso.

Tipo UsuarioIncidencias: { id: string; role: profile_role; ciudadanoId: string | null }. Decorador UsuarioIncidenciasActual extrae ese dato del servidor; no procede de la entrada del cliente. Usar metadatos explícitos por método: civic para crear/listar; civic/admin/administrative para detalle; admin/administrative para los dos PATCH.

IncidentsModule importa AuthModule y registra el nuevo guard; AuthModule no importa incidencias. Reutilizar PrismaModule ya global, sin dependencias circulares. Solo la autenticación consulta DB, no los registros de incidencias.

Separar cuerpos externos e información interna: CreateIncidentDto/CrearIncidenciaBody no contiene civicId; CreateIncidentInput interno puede conservarlo y el controlador lo añade desde ciudadanoId. Las entradas de PATCH contienen únicamente el estado/prioridad y cause; el servicio recibe idActor como argumento separado. GET listado recibe ciudadanoId del request, no consulta externa. findOne recibe UsuarioIncidencias y comprueba propiedad para civic antes de serializar; los operadores permitidos conservan acceso de detalle.

La comprobación de permisos tiene lugar al autorizar la petición con el rol actual de DB; no promete serialización frente a cambios de rol simultáneos o revocación inmediata de tokens. No introducir una caché de roles en esta fase.

## Criterios de aceptación y cierre

1. Un civic real crea solo a su nombre y lista solo las suyas, sin civicId en cuerpo/consulta. Suplantación externa rechazada: DEUDA-27-01.
2. GET individual ajeno queda oculto para ciudadanos; los operadores autorizados pueden consultar detalle. El resto de roles no accede a estas rutas.
3. Solo admin/administrative vigentes cambian estado; actor del historial es el usuario autenticado, no uno elegido por el cliente: DEUDA-47-01.
4. Solo esos dos roles cambian prioridad con las mismas garantías de actor y reglas existentes: DEUDA-28-01.
5. Usuario eliminado, sin JWT o con JWT inválido falla con 401. Rol insuficiente o ciudadano sin vinculación falla con 403. Rol actualizado en DB prevalece sobre claims antiguas.
6. Todo error de autenticación/permisos/suplantación deja imágenes, incidencias y ambos historiales sin cambios. Se mantienen reglas de estado/prioridad y respuestas sin auditoría interna.
7. Fichas/Swagger reflejan entradas sin identidad elegida, Bearer y 401/403/404. Las deudas se cierran individualmente con evidencia en este plan; persistencia queda pendiente.

## Límites que siguen abiertos

- Map e historial se pierden al reiniciar; imágenes locales sin persistencia coordinada.
- /uploads sigue servido estáticamente sin autorización. Este alcance protege endpoints de incidencias y no proporciona privacidad integral de archivos si se conoce su URL; no afirmar cierre de una deuda de acceso a imágenes que no se está implementando aquí.
- Los clientes actuales deben adaptarse al contrato con JWT; no se conectan ni cambian aquí.

## Documentación de endpoints

Actualizar las cinco fichas de incidencias, su catálogo y Swagger al implementar; no anunciarlas protegidas antes. Mantener referencias históricas y añadir una nota de sustitución/cierre en los tres specs/planes de deuda originales solo cuando su criterio esté probado. No eliminar la advertencia de almacenamiento en memoria.

## Estrategia de verificación

Solo unitarias bajo test/incidents/ por rol, con JwtService cuando corresponda y Prisma/archivos sustituidos. Cubrir todos los roles actuales, rol cambiado, usuario eliminado, falta de citizens, ausencia/validez JWT, acceso cruzado, campo civicId manipulado y ausencia de efectos. Probar registro/controladores, consulta de detalle y ambos historiales. Sin e2e/integración, HTTP, DB o servidor real.
