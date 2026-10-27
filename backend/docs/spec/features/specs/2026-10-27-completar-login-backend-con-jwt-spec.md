# 2026-10-27 - Especificación: completar el login del backend con JWT

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Rama: feature-login, hija de fix-resolve-backend-conflicts desde 147204f.
- Última actualización: 2026-10-27.
- Estado: implementada y verificada; revisión final sin hallazgos accionables.
- Plan: [Plan de implementación](../plans/2026-10-27-completar-login-backend-con-jwt-plan.md).
- Referencias: solicitud del usuario de crear la rama hija y planificar login usando token; [login existente](../../endpoint/post-auth-login/README.md) y [sesión existente](../../endpoint/get-auth-me/README.md).

## Objetivo y decisiones vigentes

Completar y verificar el login real del backend reutilizando credenciales almacenadas en PostgreSQL y JWT firmado. La rama ya contiene emisión de token y consulta de usuario autenticado: el trabajo consiste en consolidar ese flujo, cubrir sus límites y validar en ejecución la identidad contenida en el JWT, sin crear otro sistema de login.

- Alcance confirmado: solo backend. El usuario ha excluido los frontends de esta fase.
- Enfoque recomendado: reutilizar AuthModule, AuthService, LoginPipe, JwtAuthGuard y modelos users/citizens. Crear endpoints alternativos o otro mecanismo de token duplicaría contratos ya implementados; se descarta.
- Propuesta: conservar access token HS256, expiración configurada y consulta de usuario actual mediante Bearer. El servidor valida firma, algoritmo, tiempo y estructura de claims antes de aceptar el token.
- Fuera de alcance: frontend, llamadas a servicios reales durante la planificación, cambios de registro ciudadano, refresh tokens, cookies, persistencia de sesiones, revocación/logout en servidor, OAuth, nuevos roles, nuevas dependencias y límites de intentos no definidos por un requisito.
- Separación solicitada: no resolver ahora la deuda de identidad, autorización o persistencia de incidencias. Su propia especificación y plan se redactarán después; no crearlos anticipadamente ni cerrar sus pendientes en esta entrega.

## Contexto inicial verificado (antes de implementar)

- Base: 147204f, merge terminado por el usuario; sin MERGE_HEAD al iniciar. feature-login se creó desde el mismo commit que fix-resolve-backend-conflicts.
- [AuthController](../../../../src/auth/auth.controller.ts): POST /auth/login devuelve solo accessToken; GET /auth/me está protegido; POST /auth/register permanece disponible. /auth/token está retirado.
- [AuthService](../../../../src/auth/auth.service.ts): consulta username o email, compara hash bcrypt, firma claims desde el usuario almacenado y consulta datos públicos actuales para /me. No usa un usuario simulado.
- [LoginPipe](../../../../src/auth/pipes/login.pipe.ts): rechaza campos desconocidos, identificador vacío y contraseña vacía o superior a 72 bytes; aplica trim solo al identificador.
- [JwtAuthGuard](../../../../src/auth/jwt-auth.guard.ts): ya verifica firma HS256 y expiración si existe, pero asigna el resultado usando un genérico TypeScript. Esto no valida la presencia ni el tipo de sub, userId, username, role, iat o exp en ejecución. La separación actual de Authorization tampoco rechaza explícitamente segmentos adicionales.
- [AuthModule](../../../../src/auth/auth.module.ts): JWT_SECRET y JWT_EXPIRES_IN de ConfigService. [AppModule](../../../../src/app.module.ts) ya incorpora auth, Prisma, salud e incidencias.
- NestJS 12, @nestjs/jwt instalado 12.0.3, bcryptjs 3.0.3 y Prisma 7.10.1. Unitarias existentes bajo backend/test/auth/. Los 175 casos de la fusión son evidencia histórica, no verificación de este cambio.

## Contrato HTTP

No se crean rutas nuevas ni se cambian nombres públicos.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| POST /auth/login | JSON con usernameOrEmail y password | 200 { accessToken: string } | Público, con credenciales válidas |
| GET /auth/me | Sin cuerpo; Authorization: Bearer <JWT> | 200 { userId, username, email, role, phone } | Firma, algoritmo, expiración y claims válidos; usuario existente |

### Validación y normalización

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| usernameOrEmail | Cadena | Sí | trim y contenido no vacío; buscar username exacto o email en minúsculas | 400 |
| password | Cadena | Sí | No vacía, hasta 72 bytes UTF-8; no aplicar trim ni normalizar | 400 |
| Authorization | Cadena | Sí en /me | Un único esquema Bearer y token, sin segmentos adicionales; no tokens en query o body | 401 |

- POST rechaza cuerpo no objeto, arrays, tipos incorrectos y campos desconocidos: el cliente no elige userId, role, sub, exp ni token.
- Contraseña incorrecta y usuario inexistente devuelven el mismo 401 y mensaje: Usuario o contraseña incorrectos. No devolver detalles del usuario ni del hash.
- Firma incorrecta, algoritmo diferente de HS256, expiración, token malformado o claims inválidas: 401 en /me y sin publicar request.user.
- JWT firmado: sub y userId UUID del usuario, username y role provenientes de la DB, iat y exp numéricos en segundos generados por la biblioteca. No incluir password ni hash. El token no se devuelve hasta que la firma haya terminado correctamente.
- Claims obligatorias al verificar: objeto no nulo; sub/userId UUID equivalentes, username cadena no vacía, role perteneciente a profile_role y iat/exp enteros finitos con exp > iat. Rechazar ausencia de exp; la biblioteca sigue comprobando expiración y nbf si existe. No imponer igualdad de username o role con valores históricos de la DB para validar /me: su respuesta usa los datos actuales.
- /me devuelve 401 si el usuario del JWT ya no existe. phone es string o null; nunca se devuelven propiedades internas de Prisma o contraseña.
- Fallos de DB o de firma/configuración son errores de servidor; no se convierten en credenciales incorrectas ni producen tokens simulados. No exponer trazas o secretos en la respuesta.
- Compatibilidad: conservar contratos y campos existentes, incluyendo sub y userId. La validación más estricta invalida tokens firmados incompletos que nunca debieron representar una sesión válida. La vida configurada sigue dependiendo de JWT_EXPIRES_IN; no añadir un tiempo de sesión alternativo.

Ejemplo de login (valores ilustrativos, no usuarios garantizados):

~~~json
{ "usernameOrEmail": "persona@example.com", "password": "contraseña-de-prueba" }
~~~

Respuesta: objeto con accessToken emitido por el servidor; el cliente puede utilizarlo en Authorization para consultar /me. No agregar cabeceras de cookie ni nuevos campos a la respuesta.

## Modelos y objetos Prisma

| Modelo reutilizado | Campos relevantes | Relaciones y almacenamiento |
| --- | --- | --- |
| users | id UUID, username/email únicos, password hash, role profile_role | PostgreSQL existente; solo lectura en login y /me |
| citizens | user_id UUID, phone nullable | Relación existente para obtener teléfono; no se crea ni modifica al autenticar |

Conservar esquema y tipos Prisma generados. No hay nueva entidad de dominio: JWT es un token firmado sin fila de sesión, no un objeto que haya que guardar en la DB. No crear modelos Token, Session ni tablas de revocación en este alcance.

- Ciclo de vida: el token vale hasta exp mientras conserve validez criptográfica; reiniciar el proceso no lo invalida si la clave no cambia. /me requiere que el usuario siga existiendo.
- DB: login y /me requieren PostgreSQL configurado al ejecutar la API; las pruebas unitarias sustituyen Prisma y no conectan servicios.
- Sin migraciones, db push, cambios de esquema, activación de DB_SYNC o semillas durante esta tarea. Incidencias conserva su almacenamiento actual.

## Diseño mínimo

1. Mantener la validación en LoginPipe y completar los casos unitarios que falten; no reescribir lo que ya cumpla el contrato.
2. Mantener AuthService.login y obtenerUsuarioActual, verificando emisión real, errores y selección de datos públicos. Fijar HS256 explícitamente en la configuración de firma para que coincida con la verificación.
3. Añadir un predicado de dominio en token-payload.ts que reciba unknown, valide las claims y estreche el tipo. TokenPayload mantiene sus campos existentes; un tipo TokenPayloadVerificado añade iat y exp para representar el resultado validado. No introducir any ni una biblioteca de validación nueva.
4. JwtAuthGuard interpreta Authorization, verifica con JwtService y algoritmos permitidos y aplica el predicado antes de asignar request.user. Un fallo termina con 401, sin dejar claims parciales.
5. Conservar configuración JWT por entorno; comprobar ausencia o cadenas vacías de secreto y expiración con mensajes sin valores sensibles. Reutilizar validación de opciones de la biblioteca: no implementar un parser de duraciones paralelo. Una duración incompatible debe producir error de configuración/firma, nunca un login satisfactorio ni un fallback.
6. Actualizar Swagger y fichas de login/me con requisitos y errores reales. No añadir guardas a incidencias ni cambiar civicId.

## Criterios de aceptación

1. Username o email y contraseña válidos devuelven solo un JWT HS256 verificable, con claims de la DB y expiración configurada; ninguna contraseña en respuesta, claims o logs.
2. Cuerpo inválido devuelve 400; credenciales incorrectas e inexistentes comparten 401 y mensaje. No firmar ni crear sesión en esos errores.
3. /me acepta solo Bearer válido con firma, algoritmo, tiempo y claims correctos. Rechaza tokens incompletos aunque estén firmados y no deja request.user al fallar.
4. /me devuelve datos actuales y públicos de DB; usuario eliminado produce 401. Cambios de perfil no se sustituyen por datos antiguos del token.
5. Configuración ausente/vacía o fallo de firma/DB no produce un token o usuario simulado; los secretos nunca salen del servidor.
6. Registro ciudadano, endpoints de incidencias y sus contratos se conservan; sin migraciones ni cambios frontend. La deuda técnica de incidencias permanece fuera de esta entrega.
7. Unitarias pertinentes, build, lint, documentos y rutas revisados con evidencia en el mismo plan; no atribuir resultados históricos a esta rama.

## Documentación de endpoints

Actualizar al implementar las fichas [POST /auth/login](../../endpoint/post-auth-login/README.md), [GET /auth/me](../../endpoint/get-auth-me/README.md) y su catálogo si cambia la descripción. /auth/token permanece retirado. No hacer peticiones en vivo para redactar esta propuesta.

## Estrategia de verificación

Solo unitarias bajo test/auth/ por rol. Usar JwtService real con secreto exclusivo de prueba para verificar firma/expiración; Prisma, red y telemetría sustituidos por dobles. Probar entrada, límites UTF-8 de password, credenciales, emisión, errores de servidor, parsing de Bearer y claims inválidas, usuario ausente y datos actuales.

Context7 consultado para @nestjs/jwt: signAsync/verifyAsync, algorithms, expiresIn y errores. El genérico de verifyAsync es una anotación TypeScript, no validación del contenido. Al ejecutar: npm test, npm run build, npm run lint y git diff --check -- backend. No crear e2e/integración ni arrancar DB o servidor salvo autorización posterior.
