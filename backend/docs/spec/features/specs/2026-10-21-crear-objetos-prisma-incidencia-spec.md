# 2026-10-21 — Especificación: Crear objetos Prisma para incidencias

> Referencia histórica: conserva las decisiones y resultados de su fecha. Las instrucciones antiguas de pruebas e2e, informes o commits no son obligaciones actuales. Consultar la [especificación vigente](../specs/2026-10-21-adaptar-documentacion-registro-incidencias-spec.md), el [plan de adaptación](../plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md) y las fichas de [endpoints](../../endpoint/README.md).

- Desarrollador responsable original: no registrado.
- Asistente de IA original: no registrado en el documento.
- Modelo de IA que creó la especificación: no registrado; no se infiere retrospectivamente.

Fecha: 2026-10-21.
Estado: implementado; build y unitarias correctos; lint bloqueado por el entorno.

## Objetivo y decision

El usuario confirma modelos Prisma con almacenamiento temporal en memoria, sin conexion a base de datos. Prisma aporta el esquema y los tipos generados; el Map del servicio sigue actuando como almacen del proceso. Los datos desaparecen al reiniciar o crear otra instancia. Las imagenes siguen siendo archivos locales, no blobs en memoria ni registros duraderos.

## Diseno

Definir Incident, IncidentLocation e IncidentImage en backend/prisma/schema.prisma y generar sus tipos con la dependencia Prisma existente. Guardar un agregado tipado con esos modelos en IncidentsService: fechas Date internas, ubicacion y metadatos de imagenes relacionados por incidentId. Importar los modelos solo como tipos; no instanciar PrismaClient ni activar PrismaModule. Conservar el contrato HTTP: POST /incidents devuelve 201 y Location; GET /incidents/:id devuelve el mismo documento o 404; fechas ISO y estructura publica sin claves relacionales internas.

Conservar titulo de 4 a 35 caracteres, ocho imagenes JPEG/PNG/WebP de 5 MB cada una, descripcion/categoria/ubicacion opcionales y civicId como UUID de formato, sin identidad ni relaciones de usuario. Categorias continúan en su servicio temporal. No se generan migraciones, no se configura PostgreSQL, no se ejecuta db push y no se implementan estados futuros ni autenticacion. El esquema es un subconjunto temporal adaptado al contrato actual, no una implementacion completa del DBML.

## Criterios de aceptacion

- Los registros guardados usan los tipos de los tres modelos generados, sin copiar manualmente su definicion persistible.
- Crear y consultar no requiere DATABASE_URL ni conexion Prisma.
- Las respuestas mantienen fechas ISO, valores null, status reported, priority low y copias independientes de ubicacion e imagenes.
- Un fallo al guardar imagenes limpia los archivos y no publica una incidencia parcial.
- Solo pruebas unitarias bajo test/incidents/services/; no crear ni ejecutar e2e/integracion.
- Build, lint y unitarias verificados; limites del almacen documentados.

## Compatibilidad frontend: inspeccion estatica, sin conectar

Mobile ya intenta POST /incidents con multipart y usa el mock si hay error de red. CreatedIncident coincide con la respuesta publica del backend: fechas ISO, ubicacion anidada, imagenes y campos opcionales como null. Envia civicId temporal valido; esto no acredita identidad. El titulo coincide en 4-35, aunque mobile cuenta unidades UTF-16 y backend puntos de codigo, con diferencia en caracteres suplementarios.

El backend admite ocho imagenes; frontend-mobile/src/services/incident.service.ts limita a cinco. Las categorias mobile vienen de API_BASE_URL (mock), no de GET /categories del backend. Los IDs proceden de catalogos distintos; el backend actual solo valida formato UUID y no resuelve el nombre desde categoryId. Antes de integrar debe acordarse un catalogo y la politica de fallback para no dividir datos entre servidores. Las URLs /uploads son relativas: el consumidor debe resolverlas contra BACKEND_API_URL para mostrarlas.

Mobile usa EXPO_PUBLIC_BACKEND_URL o puerto 4000; el bootstrap local usa PORT o 3000. Deben coincidir y el dispositivo debe alcanzar el host. No se modifica configuracion ni se realiza solicitud HTTP. main.ts no habilita CORS; un consumidor web en otro origen precisara una politica CORS o un proxy, fuera de este alcance. frontend-web/src/App.jsx sigue siendo la plantilla Vite sin flujo de incidencias.

Conclusion: el contrato permite la futura integracion mobile, con los ajustes descritos. No se ha probado conectividad ni conectado, modificado o iniciado ningun frontend.

## Verificacion

- Prisma 7.10.1 valida el esquema y genera los modelos correctamente, tambien con DATABASE_URL eliminado del entorno y dotenv apuntando a una ruta inexistente. No se abre ninguna conexion ni se ejecutan migraciones.
- npm --prefix backend run build: correcto.
- npm --prefix backend test: 5 suites, 39 pruebas unitarias correctas (37 existentes y 2 casos adicionales de serializacion/aislamiento y opcionales).
- Prettier: archivos de codigo y suite modificados correctos.
- npm --prefix backend run lint: bloqueado antes de analizar codigo. Windows Application Control rechaza el binario nativo de @oxlint/binding-win32-x64-msvc; la alternativa WASI no esta instalada. No se ha cambiado la politica del sistema ni instalado dependencias.
- Revision manual: imports Prisma solo de tipos en el flujo de incidencias; fechas ISO y relaciones internas ocultas; sin cambios frontend, endpoints, dependencias o migraciones. No se ejecutan e2e/integracion.
- Los modelos generados se actualizan porque src/generated/prisma ya esta versionado. Se normalizan automaticamente espacios finales y comentarios con emojis generados para respetar las convenciones del repositorio, sin alterar su logica.
- No se crean commits ni se hace push.

## Informe de implementacion

El backend crea objetos tipados por los modelos Incident, IncidentLocation e IncidentImage y los conserva en el Map privado del servicio. Este Map sigue actuando como almacen temporal. No existe persistencia entre reinicios ni almacenamiento compartido entre procesos. Las imagenes permanecen en el directorio local de subidas y sus metadatos se guardan en memoria. La API publica mantiene su formato anterior y no expone incidentId internos en objetos anidados. El frontend solo ha sido inspeccionado; la integracion queda pendiente de resolver los puntos de compatibilidad anteriores.

Revision final: git diff --check sin errores de espacios; sin diferencias en frontend-mobile ni frontend-web.
