# 2026-10-27 - Plan de implementación: completar login del backend con JWT

- Objetivo: consolidar emisión de access token y consulta autenticada usando el backend existente.
- Arquitectura: reutilizar AuthModule/AuthService/LoginPipe/JwtAuthGuard; validar claims en ejecución, sin crear otro sistema de sesión.
- Herramientas: NestJS 12, @nestjs/jwt 12.0.3 instalado, bcryptjs y Prisma 7.10.1, Vitest existentes.
- Especificación: [Contrato y criterios](../specs/2026-10-27-completar-login-backend-con-jwt-spec.md).
- Rama: feature-login, hija de fix-resolve-backend-conflicts desde 147204f.
- Estado: implementado y verificado; revisión final completada.

## Restricciones generales

- Solo backend, confirmado por el usuario. No modificar ni conectar frontend-web o frontend-mobile.
- Mantener POST /auth/login y GET /auth/me y sus campos; /auth/token permanece retirado. HS256, expiración por JWT_EXPIRES_IN; sin refresh/cookies/sesiones nuevas.
- Usar users, citizens y profile_role existentes; sin nuevo esquema o generación innecesaria. No DB_SYNC, semillas, migraciones, conexión DB o arranque de servicios durante las unitarias.
- Programar/documentar en español, TypeScript estricto e imports .js. Sin any o nuevas dependencias. No npm install, npm i ni pnpm install.
- Solo unitarias bajo backend/test/auth/<rol>/. Sin e2e/integración por defecto. No crear commits ni push.
- Deuda técnica de incidencias: se abordará después con otra especificación y plan. No agregar guardas a esos endpoints, inferir propietarios o cambiar civicId en esta entrega.
- Seguimiento, decisiones y confirmación en este mismo plan; no crear informes o archivos de tareas adicionales.

## Focos de revisión

| Riesgo | Caso que lo comprueba |
| --- | --- |
| JWT con firma válida pero identidad inválida | Guard rechaza sub/userId ausentes o distintos, rol desconocido, username inválido y exp ausente. |
| Aceptación de Authorization ambiguo | Cabecera sin token, esquema distinto o segmentos extra termina 401 sin request.user. |
| Desbordar bcrypt por caracteres multibyte | Contraseña de 72 bytes aceptada, 73 rechazada; conservar espacios exactos. |
| Confundir un fallo DB con credenciales incorrectas | Error Prisma o firma se propaga como error de servidor; sin JWT de respaldo. |
| Devolver rol/usuario antiguo del token | /me usa datos actuales de DB y falla si ya no existe el usuario. |

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Revisar/ajustar solo si falta comportamiento | backend/src/auth/pipes/login.pipe.ts | Validación exacta del cuerpo y bytes de contraseña |
| Revisar/ajustar solo si falta comportamiento | backend/src/auth/auth.service.ts | Autenticar contra hash y emitir JWT; leer usuario actual |
| Modificar | backend/src/auth/token-payload.ts | Predicado esTokenPayloadValido y tipo TokenPayloadVerificado |
| Modificar | backend/src/auth/jwt-auth.guard.ts | Authorization inequívoco y validación de claims antes de request.user |
| Modificar | backend/src/auth/auth.module.ts | HS256 explícito y validación de configuración no vacía |
| Crear | backend/src/auth/configuracion-jwt.ts | Función configuracionJwt(config: ConfigService): JwtModuleOptions, reutilizada por el factory y testeable sin iniciar la app |
| Revisar/actualizar | backend/src/auth/auth.controller.ts y dto/login.dto.ts | Swagger y contrato real, sin rutas nuevas |
| Actualizar | backend/test/auth/pipes/login.pipe.spec.ts | Tipos, unknown/null, campos extra y límite UTF-8 |
| Actualizar | backend/test/auth/services/auth.service.spec.ts | Login, expiración, datos actuales y errores sin token |
| Actualizar | backend/test/auth/guards/jwt-auth.guard.spec.ts | Firma/algoritmo/expiración, claims y cabeceras inválidas |
| Crear | backend/test/auth/types/token-payload.spec.ts | Validación pura de forma y coherencia de claims |
| Crear | backend/test/auth/config/configuracion-jwt.spec.ts | Configuración requerida y firma HS256 con TTL configurado |
| Actualizar si cambia respuesta/documentación | backend/test/auth/controllers/auth.controller.spec.ts | Solo accessToken y usuario público |
| Actualizar al implementar | backend/docs/spec/endpoint/post-auth-login/README.md y get-auth-me/README.md | Contrato y errores verificados |
| Actualizar | Esta especificación y este plan | Requisitos, evidencia y confirmación reales |

## Preparación

- [x] Leer guía, plantillas y código de autenticación; listar y consultar fichas del catálogo.
- [x] Confirmar solo backend y separar la futura deuda técnica.
- [x] Crear feature-login desde la rama actual, misma base 147204f.
- [x] Consultar Context7 sobre signAsync/verifyAsync y opciones de @nestjs/jwt.
- [x] Revisar este plan antes de ejecutar; no modificar producto en esta entrega documental.
- [x] Comprobar estado de Git al ejecutar y registrar la base actual con npm test desde backend. No reutilizar el resultado de 175 casos de la fusión.

## Tarea 1: credenciales y respuesta de login

**Archivos:** LoginPipe, AuthService, AuthController/DTO si faltan descripciones y sus tres suites existentes.

**Interfaces:** LoginPipe.transform(value: unknown): LoginDto; AuthService.login(usernameOrEmail: string, password: string): Promise<string>; AuthController.login(input: LoginDto): Promise<{ accessToken: string }>.

**Criterios cubiertos:** 1, 2 y parte de 5.

- [x] Añadir los casos ausentes del pipe: null/array/no objeto, tipos incorrectos, password nulo, 72/73 bytes UTF-8, password con espacios conservados y campos userId/role rechazados. Mantener los casos existentes.
- [x] Añadir al servicio login válido con username y email; verificar con JwtService real que solo contiene claims públicas correctas, iat/exp y vida configurada. Usuario inexistente y password incorrecta deben compartir 401/mensaje; no realizar escrituras de sesión/usuario.
- [x] Probar error Prisma y error de firma sin devolver accessToken ni fallback; controller sigue devolviendo solo accessToken cuando el servicio tiene éxito.
- [x] Ejecutar npm test -- test/auth/pipes/login.pipe.spec.ts test/auth/services/auth.service.spec.ts test/auth/controllers/auth.controller.spec.ts antes de cambiar producto; registrar si cada comportamiento ya pasa o falla.
- [x] Corregir únicamente los huecos observados. Si las pruebas ya pasan, conservar implementación y documentar el comportamiento verificado.
- [x] Repetir las suites y registrar evidencia.

## Tarea 2: validar JWT y configuración

**Interfaces producidas:** TokenPayload conserva sub/userId/username/role; TokenPayloadVerificado extiende ese tipo con iat: number y exp: number. esTokenPayloadValido(valor: unknown): valor is TokenPayloadVerificado. configuracionJwt(config: ConfigService): JwtModuleOptions retorna secreto, HS256 y expiresIn configurados; rechaza ausencias o cadenas vacías sin incluir los valores en sus errores.

**Interfaces consumidoras:** AuthModule usa configuracionJwt como factory; JwtAuthGuard.canActivate(context: ExecutionContext): Promise<boolean> mantiene verificación criptográfica y solo asigna user tras validar el resultado como unknown.

**Criterios cubiertos:** 1, 3 y 5.

- [x] Crear unitarias del predicado: objeto válido, null/array, claims ausentes o de tipo incorrecto, UUID inválidos, sub/userId distintos, username vacío, rol ajeno a profile_role, iat/exp no numéricos, no finitos o no enteros, exp <= iat. Comparar UUID sin distinguir mayúsculas; role debe ser un valor real del enum.
- [x] Añadir casos al guard con tokens realmente firmados: exp ausente, payload incompleto, firma incorrecta, expirado y HS384. Cabeceras inválidas o con segmentos extra deben devolver 401 y dejar request.user ausente. Conservar caso JWT válido.
- [x] Crear unitarias de configuracionJwt para variables ausentes y vacías; configuración válida 1h firma HS256 y produce exp-iat=3600. No crear parser de duraciones: la biblioteca conserva su validación y un error de firma no devuelve un token.
- [x] Ejecutar npm test -- test/auth/types/token-payload.spec.ts test/auth/guards/jwt-auth.guard.spec.ts test/auth/config/configuracion-jwt.spec.ts; observar fallos por funcionalidad ausente antes de implementarla.
- [x] Implementar el predicado y la función de configuración; enlazarlos al módulo/guard. Validar datos externos sin any ni cast que sustituya validación. Para el predicado síncrono, comprobar el formato hexadecimal UUID de grupos 8-4-4-4-12 con expresión regular local, sin dependencia nueva ni llamada a un pipe asíncrono; comparar sub/userId en minúsculas.
- [x] Mantener verifyAsync y algorithms: ['HS256']; la biblioteca comprueba exp y nbf y el predicado exige exp. Conservar sub/userId en los tokens para compatibilidad. No modificar CurrentUser salvo que lo exija el tipo verificado.
- [x] Repetir las suites, compilar y revisar que no se publican claims parciales al fallar.

## Tarea 3: usuario actual, compatibilidad y documentación

**Interfaces:** AuthService.obtenerUsuarioActual(payload: TokenPayload): Promise<PublicUserDto>, invocado por GET /auth/me con usuario extraído por CurrentUser y JwtAuthGuard.

**Criterios cubiertos:** 4, 6 y 7.

- [x] Añadir al servicio el caso de rol/username actualizados en DB frente a claims antiguas y phone=null; comprobar respuesta pública exacta sin hash. Mantener usuario ausente -> 401 y propagar errores DB sin inventar usuario.
- [x] Ejecutar unitarias antes de modificar implementación; si obtenerUsuarioActual ya satisface esos casos, no reescribirlo.
- [x] Revisar /auth/register y los tests existentes de incidencias para detectar regresiones con la suite completa, sin crear llamadas HTTP ni activar DB.
- [x] Actualizar Swagger y las fichas login/me con claims obligatorias, Bearer, errores y límites reales. Mantener /auth/token retirado y la deuda de incidencias fuera del alcance.
- [x] Ejecutar npm test, npm run build y npm run lint; actualizar esta especificación y la confirmación de este mismo plan.

## Comprobaciones finales

| Comprobación | Comando desde backend salvo indicación | Resultado real |
| --- | --- | --- |
| Unitarias | npm test | 19 archivos y 252 pruebas correctas: 175 iniciales y 77 nuevas |
| Compilación | npm run build | Correcta |
| Lint | npm run lint | Sin errores; cuatro avisos heredados de ambas áreas |
| Documentación, desde raíz | Enlaces locales, git diff --check -- backend | Correcta: enlaces de especificación, plan y dos fichas (4 documentos), diff sin errores |

- [x] Cerrar revisión final de criterios 1 a 7 y sus pruebas; no afirmar verificación HTTP/DB no ejecutada.
- [x] Confirmar cero cambios frontend, sin migraciones, semillas, dependencias nuevas, commits o push.
- [x] Registrar hallazgos, decisiones, resultados y confirmación aquí; no crear otra documentación de deuda hasta que se aborde esa tarea posterior.

## Ejecución y decisiones

- El usuario aprobó especificación y plan el 2026-10-27. Se ejecuta en feature-login desde 147204f; los únicos cambios previos eran ambos documentos.
- Base real: npm test, 17 suites y 175 pruebas correctas antes del código.
- Context7: @nestjs/jwt, opciones de firma/verificación, algoritmo y expiración. No se instalan dependencias ni se modifica Prisma.
- Tarea 1: nuevas pruebas de credenciales, límites UTF-8, errores DB/firma y perfil actual pasan con el código existente. Se conservan AuthService, LoginPipe y CurrentUser sin reescribirlos.
- Rojo observado: el guard aceptaba 9 tokens firmados con claims incompletas/incorrectas y 2 cabeceras con segmentos extra. Las 37 pruebas del predicado fallaban porque aún no existía y la suite de configuración inicialmente no cargaba; tras crear su firma mínima, sus 4 pruebas fallaron por comportamiento ausente.
- Verde: las 6 suites de autenticación pasan con 99 pruebas tras la implementación; build correcto y lint sin errores. Nueva función configuracionJwt comparte opciones reales entre módulo y pruebas, sin iniciar la aplicación.
- Validador síncrono: UUID hexadecimal de grupos 8-4-4-4-12 y comparación sin distinguir mayúsculas, sin dependencia extra. La biblioteca sigue verificando firma, algoritmo, exp y nbf; el predicado exige forma y coherencia de claims. Se limpia request.user antes de validar para no conservar una identidad anterior ante fallo.
- Configuración: validar cadenas no vacías, conservar secreto exacto y delegar sintaxis de duración en la biblioteca. El cast a expiresIn solo representa su tipo de opciones; no sustituye validación de claims ni inventa una duración alternativa.
- No se conecta frontend ni DB, no se crean sesiones/tablas y no se aplican guardas a incidencias. Las tareas de deuda técnica posterior siguen fuera de alcance.
- Suite completa final: 19 archivos y 252 pruebas correctas; build correcto. Lint sin errores y con los mismos cuatro avisos heredados: dos de Unicode en create-incident.pipe.ts, variable sin usar en dev-seed y spread de instancia en una prueba anterior de auth. No se alteraron reglas para ocultarlos.
- Revisión estática independiente: sin hallazgos accionables en guard, predicado, configuración y contratos; el revisor no pudo consultar Git por restricciones de su sandbox. El agente principal verificó diff y estado del repositorio: todos los cambios están bajo backend, sin dependencias ni esquema modificados.
- Documentación final: 4 documentos con todos los enlaces locales existentes y git diff --check -- backend correcto. Sin archivos de informes/tareas adicionales ni documentación anticipada de deuda.

## Confirmación de implementación

- Estado final: implementado y verificado.
- Fecha: 2026-10-27.
- Resultado: login por credenciales y consulta de usuario actual conservados; validación JWT de claims en ejecución, HS256, expiración obligatoria, cabecera sin ambigüedad y configuración requerida no vacía. Sin endpoints nuevos.

| Criterio | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1: login y emisión | Token real verificable, seis claims públicas y duración de 1h comprobada | Cumplido |
| 2: entradas y credenciales | Pipe ampliado, límite UTF-8, mismo 401 para usuario/contraseña incorrectos | Cumplido |
| 3: JWT válido obligatorio | Predicado y guard; tokens firmados incompletos y cabeceras ambiguas rechazados | Cumplido |
| 4: datos actuales | Servicio devuelve nombre/rol actuales, phone=null y error si no existe | Cumplido |
| 5: configuración/fallos | Secretos ausentes/vacíos y error de duración; errores DB/firma sin respaldo | Cumplido |
| 6: compatibilidad | Suite de registro e incidencias conservada; cambios solo backend, sin esquema/dependencias nuevos | Cumplido |
| 7: verificación | 252 unitarias, build, lint, revisión estática y enlaces/diff correctos | Cumplido |

- Comprobaciones: npm test, npm run build y npm run lint ejecutados desde backend; sin e2e/integración. No se conectó DB ni se arrancó la API.
- Limitaciones: verificación unitaria con Prisma sustituido; no acredita conectividad HTTP o DB real. Persistencia, identidad y autorización de incidencias siguen fuera del alcance.
- Sin frontend, migraciones, semillas, dependencias nuevas, commit ni push.
- Siguiente trabajo separado: redactar otra especificación y plan de deuda técnica cuando se aborde esa fase, como pidió el usuario.
