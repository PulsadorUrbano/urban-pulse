# Guía del backend

Estas instrucciones se aplican a backend/. Ejecutar los comandos desde esa carpeta, salvo indicación contraria. Leer el código y la configuración antes de modificar nada; mantener esta guía alineada con el repositorio.

## Contexto y alcance

UrbanPulse es un proyecto universitario para comunicar y gestionar incidencias urbanas de Málaga. El backend proporciona los contratos y la lógica de dominio que consumen la aplicación móvil de ciudadanía y la aplicación web. La visión del producto incluye seguimiento, gestión municipal y análisis; no presentar esas capacidades futuras como implementadas.

El stack del backend es NestJS con TypeScript estricto, Prisma para modelos y tipos, PostgreSQL como base de datos prevista y Vitest para pruebas unitarias. Consultar las versiones instaladas en package.json antes de usar APIs concretas.

## Idioma y forma de trabajar

- Programar y documentar en español: nombres propios del dominio, variables, funciones, comentarios, mensajes, descripciones de pruebas, especificaciones y planes nuevos.
- Conservar los nombres exigidos por TypeScript, NestJS, Prisma y otras dependencias. Mantener los identificadores, rutas HTTP y campos públicos existentes para no romper consumidores; cualquier traducción de un contrato requiere un cambio acordado y documentado.
- No usar emojis en respuestas, código propio, comentarios, mensajes ni documentación.
- Mantener las soluciones simples. Reutilizar lo existente antes de añadir dependencias, capas, repositorios o abstracciones.
- Mantener el alcance solicitado. No cambiar frontend, conectar servicios, desplegar, crear commits ni hacer push sin que se haya solicitado.

## Herramientas y comandos

Usar npm y package-lock.json. package.json declara Node.js >=22 y npm >=10. El Dockerfile actual usa Node 20 en la etapa de construcción; comprobar esa discrepancia si se modifica el despliegue.

| Comando | Uso |
| --- | --- |
| npm ci | Restaurar las dependencias del lockfile cuando sea necesario y esté dentro del alcance. |
| npm run start:dev | Iniciar el backend en desarrollo. |
| npm run build | Compilar el código de producción en dist/. |
| npm run start:prod | Iniciar dist/main después de compilar. |
| npm run lint | Analizar src/ y test/ con Oxlint y comprobación de tipos. |
| npm test | Ejecutar las pruebas unitarias con Vitest. |
| npm run test:cov | Obtener cobertura de las pruebas unitarias. |
| npm exec -- prisma generate --config prisma7.config.ts | Regenerar los tipos después de modificar modelos Prisma. |

No ejecutar npm install ni npm i, con o sin argumentos; tampoco pnpm install. No cambiar dependencias o el lockfile para resolver un problema ajeno al trabajo. npm run format reescribe todos los archivos de código y pruebas; limitar el formato a los archivos modificados cuando sea posible.

No hay un workspace npm ni un comando de pruebas en la raíz. No ejecutar herramientas del frontend como si pertenecieran al backend.

## Consultar documentación actual

Antes de usar o cambiar una API, configuración o comando dependiente de una biblioteca, consultar Context7: resolver primero la biblioteca y después consultar el concepto concreto, preferiblemente para la versión instalada. No asumir que una API recordada sigue siendo válida. La revisión estática, la lógica de negocio y los cambios puramente documentales no requieren una consulta por sí mismos.

## Código y organización

- No introducir any en código propio; usar tipos explícitos o unknown con validación y estrechamiento. Elegir nombres autodescriptivos: PascalCase para clases y tipos, camelCase para funciones y variables, y kebab-case para archivos, respetando los sufijos de NestJS.
- Mantener TypeScript estricto, ESM, resolución NodeNext y sufijos .js en imports relativos. No introducir require, nuevos alias ni imports sin extensión en código propio sin adaptar compilación y pruebas.
- Organizar por funcionalidad y después por responsabilidad: controllers/, services/, pipes/, dto/ y types/ cuando existan archivos que lo justifiquen. Dejar el módulo de cada funcionalidad en su raíz. No crear carpetas vacías.
- Conservar los decoradores y la emisión de metadatos de NestJS. La compilación de producción excluye las pruebas y escribe en dist/.
- Mantener los controladores centrados en HTTP; colocar la lógica de negocio en servicios inyectables y registrar explícitamente proveedores e imports en su módulo.
- Validar las entradas en el límite HTTP. Los tipos TypeScript y los modelos Prisma no sustituyen la validación de datos externos.
- Usar excepciones HTTP de NestJS para errores esperados; no exponer trazas ni configuración interna.
- Tratar las rutas, campos y códigos de respuesta como contratos compartidos con los consumidores. Documentar sus cambios y consecuencias de compatibilidad antes de conectarlos.

## Modelos y objetos Prisma por funcionalidad

- Al implementar cada funcionalidad, crear o actualizar los modelos Prisma que representan sus entidades en prisma/schema.prisma. Reutilizar modelos compartidos cuando corresponda, sin duplicarlos.
- Regenerar el cliente y utilizar sus tipos para los objetos de dominio almacenados. No mantener una copia manual independiente del modelo persistible ni editar a mano src/generated/prisma/.
- Documentar campos, relaciones, identificadores, valores iniciales, nulabilidad y almacenamiento en la especificación de la funcionalidad. Contrastar las decisiones con el diagrama; no deducir permisos ni transiciones del orden de un enum.
- Mientras la base de datos no esté configurada, conservar los objetos tipados en memoria y declarar que se pierden al reiniciar. Prisma proporciona modelos y tipos; no es una base de datos ni aporta persistencia por sí solo.
- Crear modelos o generar tipos no autoriza a conectar PostgreSQL, activar PrismaModule, aplicar migraciones ni ejecutar db push. Esas acciones deben formar parte del alcance solicitado.
- Separar el objeto interno de la respuesta pública cuando difieran: serializar fechas, ocultar datos internos y evitar devolver referencias que permitan modificar el almacenamiento.
- No introducir por defecto identidades, autenticación, permisos o relaciones todavía no implementadas. Si se solicitan operaciones protegidas, validar identidad y permisos en el servidor.

## Estructura de las pruebas

Por defecto, crear y ejecutar exclusivamente pruebas unitarias. No crear ni ejecutar pruebas e2e o de integración salvo petición explícita del usuario, aunque exista un script test:e2e.

Las pruebas van en test/, separadas por funcionalidad y rol, reflejando la ubicación del código:

~~~text
backend/
  src/
    <funcionalidad>/
      <funcionalidad>.module.ts
      controllers/
      services/
      pipes/
      dto/
      types/
  test/
    <funcionalidad>/
      controllers/
        <funcionalidad>.controller.spec.ts
      services/
        <funcionalidad>.service.spec.ts
      pipes/
        <funcionalidad>.pipe.spec.ts
~~~

- Crear solo las carpetas y suites necesarias. No colocar pruebas nuevas junto al código de producción ni dentro de src/generated/.
- Usar Vitest, no Jest; vi para dobles de prueba y Test.createTestingModule cuando sea necesario comprobar inyección de NestJS.
- Probar comportamiento observable y errores relevantes. Sustituir acceso a base de datos, red, archivos y telemetría por dobles cuando corresponda; una prueba unitaria no debe necesitar servicios externos.
- Cerrar los módulos y recursos abiertos, y restaurar los dobles y variables de entorno modificados.
- Estado actual: la suite del servicio de incidencias está en test/incidents/services/incidents.service.spec.ts; otras unitarias siguen en src/**/*.spec.ts y hay dos archivos e2e heredados en test/. No moverlos ni ampliarlos en un cambio ajeno a su reorganización. Si los archivos e2e se encuentran en test/test-e2e/ en otra rama, conservar esa ubicación acordada.
- vitest.config.ts descubre **/*.spec.ts. Las e2e usan **/*.e2e-spec.ts mediante vitest.config.e2e.ts y no deben entrar en la ejecución unitaria. Revisar ambas configuraciones si se reorganizan las pruebas.

## Documentación

Guardar la documentación en backend/docs/. Las rutas siguientes parten de la raíz del repositorio.

- Crear la especificación en backend/docs/spec/features/specs/ usando backend/docs/spec/templates/spec-template.md.
- Crear el plan en backend/docs/spec/features/plans/ usando backend/docs/spec/templates/plan-template.md.
- Registrar el progreso, las comprobaciones y la confirmación de implementación en ese mismo plan, sin archivos adicionales de tareas o informes.
- Usar nombres y títulos con fecha y descripción de la acción: AAAA-MM-DD-descripcion-del-cambio-spec.md y AAAA-MM-DD-descripcion-del-cambio-plan.md; encabezados como «AAAA-MM-DD — Plan para describir la acción». Evitar títulos genéricos como spec.md o plan.md.
- Escribir en español y mantener los documentos alineados con el comportamiento real.

## Catálogo de endpoints

El catálogo está en **backend/docs/spec/endpoint/**. Antes de consultar o modificar un contrato, listar sus carpetas y leer la ficha correspondiente.

Desde la raíz del repositorio:

~~~sh
ls backend/docs/spec/endpoint
~~~

Desde backend/:

~~~sh
ls docs/spec/endpoint
~~~

En PowerShell puede usarse Get-ChildItem con las mismas rutas.

- Una carpeta por método y ruta dentro de backend/docs/spec/endpoint/: por ejemplo, post-incidents/ para POST /incidents y get-incidents-id/ para GET /incidents/:id. Son ejemplos de organización, no evidencia de implementación.
- Cada carpeta contiene un README.md con estado y fecha de revisión, método/ruta, finalidad, acceso, entrada, validaciones, respuesta, cabeceras, errores, límites de almacenamiento y enlaces a la especificación, plan y código.
- Crear o actualizar la ficha al implementar, modificar o retirar el endpoint. No describir un endpoint propuesto como activo; si falta la ficha, consultar el código y documentar su estado real.
- endpoint/ contiene documentación; no implica mover controladores ni cambiar rutas HTTP.
- Consultar el catálogo no autoriza a iniciar servicios, enviar peticiones en vivo ni conectar frontends.

## Configuración y seguridad

- Para ejecución local, usar backend/.env a partir de backend/.env.example. Para Compose, usar el .env de la raíz a partir de su ejemplo. No versionar credenciales reales.
- Documentar variables nuevas en el ejemplo correspondiente y en la documentación afectada. No registrar contraseñas, cabeceras de autorización ni datos personales de incidencias o ubicaciones.
- AppModule incorpora AuthModule y PrismaModule: autenticación requiere PostgreSQL, DATABASE_URL, JWT_SECRET y JWT_EXPIRES_IN al arrancar. Incidencias conserva almacenamiento en memoria y no queda protegida por importar auth. DB_SYNC está vacío en el ejemplo; no activar dbpush/deploy ni ejecutar semillas fuera del alcance solicitado.
- Observe se configura en app.module.ts y main.ts. Las credenciales vacías no garantizan un modo sin conexión; aislar la telemetría en las pruebas unitarias.
- Si se solicitan contraseñas, almacenar hashes y excluirlos de respuestas y registros. Si se solicitan cambios con auditoría, guardar el cambio y su historial de forma atómica.
- No borrar volúmenes de base de datos para verificar un cambio.

## Verificación y entrega

- Para cambios de código o dependencias, ejecutar npm run build, npm run lint y npm test. Añadir solo las pruebas unitarias pertinentes; no debilitar validaciones para conseguir un resultado correcto.
- Para cambios únicamente documentales, comprobar rutas, comandos, coherencia con la rama y git diff --check. No añadir pruebas ni ejecutar servicios para verificar texto.
- Si una comprobación está bloqueada por el entorno, informar del comando y la causa; no presentarla como correcta ni cambiar políticas del sistema para sortear el bloqueo.
- Entregar un resumen en español con lo modificado, las comprobaciones reales y las limitaciones. Confirmar el resultado y las comprobaciones en el mismo plan.
