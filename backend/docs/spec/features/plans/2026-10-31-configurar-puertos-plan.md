# 2026-10-31 — Plan 2: arranque con puertos libres

Estado: aprobado e implementado; verificación web pendiente por dependencias locales ausentes.
Especificación: [puertos automáticos](../specs/2026-10-31-configurar-puertos-spec.md).
Rama: fix/unificar-login. Ejecutar todos los comandos desde la raíz salvo indicación explícita.

## Resultado obligatorio

- `node scripts/desarrollo.mjs`: arranca backend, web y Expo.
- `node scripts/desarrollo.mjs --mock`: añade json-server.
- `--host 192.168.1.20`: indica la IP LAN que recibirá el móvil; no indica un puerto.
- Elegir puertos libres automáticamente. No preguntar puertos, editar .env ni instalar dependencias.
- No modificar Docker, PostgreSQL, autenticación, código móvil, package.json ni lockfiles. No hacer commits ni push.
- Conservar POST /auth/login. Conservar los comandos individuales actuales.

## Reparto

| Agente | Archivos que puede escribir | Depende de |
| --- | --- | --- |
| A | backend/src/main.ts; backend/src/configuracion/arranque-coordinado.ts; backend/test/configuracion/arranque-coordinado.spec.ts | Ninguno |
| B | frontend-web/vite.config.js; frontend-web/src/__tests__/config/vite.config.test.ts | Ninguno |
| C | scripts/desarrollo.mjs; scripts/desarrollo.test.mjs | Contratos de este documento; puede usar dobles mientras A y B trabajan |
| D | docs/development.md | A, B y C terminados |

A, B y C pueden trabajar en paralelo. Cada agente modifica exclusivamente sus archivos. Solo el coordinador edita este plan y la especificación. Si un paso no puede cumplirse, informar del paso y el error; no elegir otra arquitectura ni añadir archivos.

## Valores compartidos: copiar exactamente

| Dato | Valor |
| --- | --- |
| Modo backend coordinado | URBAN_PULSE_COORDINADO=1 |
| Puerto solicitado al backend | PORT=0 |
| Mensaje IPC backend → lanzador | { tipo: 'backend-listo', puerto: PUERTO_REAL } |
| Destino del proxy web | URBAN_PULSE_PROXY_URL=http://127.0.0.1:PUERTO_BACKEND |
| URL usada por el navegador | VITE_BACKEND_URL=/api |
| URL backend del móvil | EXPO_PUBLIC_BACKEND_URL=http://HOST_LAN:PUERTO_BACKEND |
| URL mock del móvil, solo con --mock | EXPO_PUBLIC_API_URL=http://HOST_LAN:PUERTO_MOCK |
| Límite de compilación | 120000 ms |
| Límite por arranque | 60000 ms |
| Intentos por colisión | 3, incluido el primero |
| Espera de cierre normal | 5000 ms |

No escribir puertos en archivos. No relanzar procesos después de que la sesión esté lista: si uno termina, cerrar los demás y terminar con código 1. Backend sin watch; para recargarlo se reinicia el comando completo. Vite y Expo conservan su recarga habitual dentro del mismo proceso.

## Tarea A — Backend

Leer AGENTS.md y backend/AGENTS.md. Crear los archivos nuevos de la tabla; modificar solo main.ts.

1. Crear `anunciarArranqueCoordinado(puerto: number): void` en backend/src/configuracion/arranque-coordinado.ts.
2. Si URBAN_PULSE_COORDINADO no es '1', retornar sin hacer nada.
3. En modo coordinado, exigir puerto entero entre 1 y 65535 y process.send disponible. Si falta cualquiera, lanzar Error en español.
4. Enviar exactamente `{ tipo: 'backend-listo', puerto }` por process.send. No usar console.log para comunicar el puerto.
5. En main.ts convertir PORT con Number; usar 3000 cuando PORT sea undefined. Rechazar valores vacíos, no enteros, negativos y mayores de 65535. Permitir 0.
6. Llamar a app.listen con ese número y host '0.0.0.0'. Tras resolver listen, obtener el puerto real del servidor HTTP y llamar al helper. No cambiar configuración Swagger, módulos ni rutas.
7. Crear las unitarias antes del helper: modo normal no envía; modo coordinado envía puerto 49152; falta IPC lanza Error; puertos 0, -1, 65536 y NaN lanzan Error. Sustituir process.send y restaurar entorno y dobles al terminar cada prueba. No importar main.ts ni iniciar NestJS en las pruebas.
8. Desde backend ejecutar `npm test`, `npm run build`, `npm run lint`. Informar salida y código de cada comando. No instalar dependencias.

Entrega A: tres archivos, mensaje IPC exacto y resultados de los tres comandos.

## Tarea B — Proxy web

1. En frontend-web/vite.config.js sustituir únicamente el valor target por `process.env.URBAN_PULSE_PROXY_URL || 'http://localhost:3000'`.
2. Mantener '/api', changeOrigin y rewrite existentes.
3. Crear frontend-web/src/__tests__/config/vite.config.test.ts con Vitest. Usar vi.resetModules y restaurar variables después de cada prueba. Importar dinámicamente vite.config.js tras establecer el entorno.
4. Comprobar: sin variable target es localhost:3000; con variable http://127.0.0.1:49152 target coincide exactamente; rewrite('/api/auth/login') devuelve '/auth/login'.
5. Desde frontend-web ejecutar `npm test -- src/__tests__/config/vite.config.test.ts`, `npm run build`, `npm run lint`. Si faltan vite o vitest, registrar el bloqueo; no instalarlos.

Entrega B: dos archivos y resultados de los tres comandos.

## Tarea C — Lanzador

Crear scripts/desarrollo.mjs y scripts/desarrollo.test.mjs. Usar únicamente módulos node:. No crear un package.json raíz.

### C1. Argumentos y precomprobación

1. Resolver la raíz desde import.meta.url; no depender del directorio del terminal.
2. Aceptar solo --mock y --host seguido de IPv4. Rechazar opción desconocida o valor ausente con código 1 antes de crear procesos.
3. Sin --host, recoger las IPv4 no internas de os.networkInterfaces y eliminar duplicados. Una candidata: usarla. Cero o varias: mostrar candidatas y pedir --host; terminar sin crear procesos.
4. Comprobar estos archivos antes de arrancar: backend/node_modules/@nestjs/cli/bin/nest.js; backend/node_modules/prisma/build/index.js; frontend-web/node_modules/vite/bin/vite.js; frontend-mobile/node_modules/expo/bin/cli. Con --mock comprobar también frontend-mobile/node_modules/json-server/lib/bin.js y frontend-mobile/db.json. Si falta uno, imprimir su ruta y salir con código 1.
5. Ejecutar compilación backend con npm run build y cwd backend. En Windows usar npm.cmd con el mecanismo de shell necesario para ese comando fijo; no interpolar argumentos del usuario en el shell. Si falla o supera 120 segundos, terminar; no iniciar consumidores.

### C2. Backend y puertos

1. Usar child_process.fork para backend/dist/main.js, cwd backend, con stdio heredado y canal IPC. Pasar copia del entorno más URBAN_PULSE_COORDINADO='1' y PORT='0'.
2. Esperar el mensaje backend-listo de ese hijo. Validar puerto entero 1..65535. Mensaje inválido de ese tipo: cerrar sesión y fallar. Otros mensajes: ignorar.
3. Si backend sale o pasan 60 segundos sin mensaje, cerrar sesión y fallar.
4. Para cada CLI siguiente elegir candidato con net.createServer().listen(0, '0.0.0.0'), leer address().port y cerrar el servidor de sondeo antes de arrancar el CLI. Excluir puertos ya usados en la sesión. Este sondeo no reserva el puerto.

### C3. Comandos de hijos

Ejecutar binarios JavaScript con process.execPath, argumentos separados y shell:false. Heredar entorno y añadir las variables de la tabla compartida. Mostrar stdout/stderr con prefijo del servicio.

| Orden | cwd | Binario relativo al cwd | Argumentos |
| --- | --- | --- | --- |
| 1, solo --mock | frontend-mobile | node_modules/json-server/lib/bin.js | db.json --port PUERTO --host 0.0.0.0 |
| 2 | frontend-web | node_modules/vite/bin/vite.js | --host 0.0.0.0 --port PUERTO --strictPort |
| 3 | frontend-mobile | node_modules/expo/bin/cli | start --lan --port PUERTO |

- Expo recibe CI='1' para no preguntar otro puerto. No establecer EXPO_NO_DOTENV: conservar las demás variables locales. Las URLs explícitas inyectadas deben prevalecer.
- Sin --mock no arrancar json-server, no seleccionar su puerto y no inyectar EXPO_PUBLIC_API_URL. Conservar cualquier valor heredado.
- Esperar escucha TCP en 127.0.0.1:PUERTO cada 100 ms, hasta 60 segundos, comprobando también que el hijo siga vivo. Esa comprobación acredita escucha, no funcionamiento completo de la aplicación.
- Si el hijo termina antes de escuchar, reintentar solo si su salida contiene EADDRINUSE o el error explícito de puerto ocupado del CLI instalado. Conservar salida para el diagnóstico. Máximo 3 intentos con candidatos nuevos. Cualquier otro error o timeout: cerrar sesión y fallar. Si el mensaje de colisión del CLI no puede identificarse, informar del bloqueo al coordinador; no implementar reintentos para errores genéricos.
- Una vez todos escuchan, mostrar URLs backend, web y Expo con host LAN y sus puertos; mostrar URL mock solo si está activo. Sin mock mostrar 'Mock desactivado; el fallback móvil puede fallar si no hay un servidor externo'.

### C4. Cierre

1. Mantener una lista de hijos creados por esta ejecución. Registrar SIGINT y SIGTERM una sola vez.
2. Cerrar al recibir señal, error, timeout o salida inesperada de un hijo. El cierre debe ser idempotente.
3. Solicitar terminación, esperar hasta 5 segundos y forzar el cierre de los procesos propios restantes. En Windows cerrar el árbol por PID propio con taskkill /PID PID /T /F; en otros sistemas gestionar el grupo propio de procesos. No buscar procesos por nombre ni terminar al propietario de un puerto ocupado.
4. Cancelar temporizadores y escuchas. Salir con 0 por cierre solicitado y 1 por fallo.

### C5. Pruebas

Exportar `iniciarDesarrollo(opciones, dependencias)` y proteger la ejecución directa para que importar el archivo no arranque nada. Inyectar únicamente operaciones de SO/procesos necesarias para sustituirlas con dobles. No exportar APIs de aplicación ni añadir archivos auxiliares.

Escribir pruebas node:test antes de implementar. Probar exactamente:

| Entrada/situación | Aserción |
| --- | --- |
| Sin --mock | backend, web y Expo; ningún proceso ni puerto mock |
| Con --mock | cuatro servicios y URL mock correcta en Expo |
| Backend anuncia 49152 | proxy localhost:49152 y móvil HOST_LAN:49152 |
| Backend anuncia puerto inválido | ningún consumidor y cierre con error |
| Opción inválida o LAN ambigua | ningún hijo creado |
| Candidato repetido | no asignarlo a dos servicios |
| Colisión explícita | nuevo candidato, como máximo 3 intentos |
| Error de configuración | no reintentar |
| Backend no anuncia o CLI no escucha | timeout y cierre de hijos propios |
| Ctrl+C o hijo termina | cierre del resto; segunda llamada de cierre no repite terminaciones |

Ejecutar `node --test scripts/desarrollo.test.mjs` y `node --check scripts/desarrollo.mjs`. No iniciar servicios reales en estas pruebas.

Entrega C: dos archivos, resultados y lista de comandos efectivamente usados.

## Tarea D — Documentación y comprobación final

Esperar las entregas A, B y C.

1. En docs/development.md añadir sección 'Arranque conjunto con puertos automáticos'. Incluir exactamente los tres ejemplos del inicio del plan.
2. Indicar: dependencias instaladas previamente, PostgreSQL preparado, backend sin watch, reinicio completo si un hijo termina, LAN necesaria para móvil, túnel Expo no publica backend, mock opcional y URLs visibles al arrancar.
3. No presentar TCP como prueba de login ni de acceso desde teléfono.
4. Ejecutar git diff --check y revisar que solo cambiaron los nueve archivos de implementación/documentación de la tabla.
5. El coordinador registra abajo los resultados A/B/C y el diff; actualiza estado en la especificación. No crear informes adicionales.

## Referencias comprobadas al redactar

- Expo CLI: --port elige puerto; CI=1 evita diálogos. https://docs.expo.dev/more/expo-cli/
- Vite: --port, --strictPort y server.proxy. https://vite.dev/config/server-options
- Binarios Expo y json-server contrastados con sus package.json locales.
- Consultar Context7 antes de cambiar una API de biblioteca, como exige AGENTS.md. Si contradice un paso, detener ese paso y reportar la discrepancia; no delegar una decisión de diseño al implementador.

## Resultados

Implementación completada con tres subagentes ligeros (backend, web y lanzador). El coordinador revisó, corrigió e integró las entregas y ejecutó las comprobaciones. Revisión independiente de backend/web sin hallazgos; revisión del lanzador detectó un reintento TCP tras cancelación con hijos lentos en cerrar: se reprodujo con prueba fallida (2 conexiones frente a 1 esperada), se corrigió y ahora pasa.

| Comprobación ejecutada por el coordinador | Resultado |
| --- | --- |
| Backend npm test | 18 suites, 182 pruebas pasan |
| Backend npm run build | Correcto; generación de cliente sin conectar PostgreSQL |
| Backend npm run lint | Correcto, cuatro advertencias en archivos ajenos |
| Móvil: configuración, Jest --runInBand | 13 pruebas pasan |
| Lanzador: node --test --test-timeout=15000 scripts/desarrollo.test.mjs | 14 pruebas pasan |
| node --check scripts/desarrollo.mjs | Correcto |
| Web: prueba configuración, build y lint | Bloqueados: faltan vitest, vite y eslint locales |
| git diff --check | Correcto |

Primeras ejecuciones del lanzador detectaron un doble de red sin once y problemas de cancelación; se corrigieron antes del resultado final. Se añadieron casos de colisiones agotadas, dependencias ausentes y Ctrl+C durante arranque. Una ejecución de pruebas que quedó esperando se cerró por sus PIDs concretos; no se terminaron servicios ajenos.

Decisión de implementación: se fija también REACT_NATIVE_PACKAGER_HOSTNAME para que Expo use el host LAN indicado. Se preservan .env y las URLs explícitas heredadas cuando el mock no se activa. Sin commits, push ni dependencias instaladas. No se han iniciado servicios reales ni comprobado el conjunto con PostgreSQL o un teléfono; las pruebas del lanzador usan dobles de procesos/red. El arranque completo requiere instalar las dependencias web ausentes. No presentar la verificación pendiente como correcta.
