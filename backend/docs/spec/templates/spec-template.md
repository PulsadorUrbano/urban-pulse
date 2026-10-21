# Especificación: {{nombre de la funcionalidad}}

- Desarrollador responsable: {{nombre del desarrollador humano que crea y asume la especificación}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA que creó la especificación: {{identificador y versión exactos o No utilizada; si no están disponibles, declararlo sin inventarlos}}.

> Crear únicamente esta especificación y su plan. Copiar a backend/docs/spec/specs/{{fecha}}-{{funcionalidad}}.md. Sustituir los marcadores y usar rutas relativas desde el documento. No copiar como vigentes decisiones o resultados de la referencia histórica de incidencias.

- Rama: {{rama de trabajo}}.
- Última actualización: {{AAAA-MM-DD}}.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](../plans/{{fecha}}-{{funcionalidad}}-plan.md).
- Referencias: {{petición, especificación previa o decisión aplicable}}.

## Objetivo y decisiones vigentes

{{Problema que resuelve, usuario del flujo y resultado observable esperado.}}

- Alcance confirmado: {{comportamientos incluidos}}.
- Decisiones confirmadas: {{decisión y motivo}}.
- Suposiciones por validar: {{suposición y efecto; indicar ninguna si corresponde}}.
- Fuera de alcance: {{límites explícitos, incluidos frontend y conexiones externas}}.

## Contexto verificado

- Implementación actual: {{archivos y comportamiento observado}}.
- Contratos y referencias del dominio: {{rutas existentes}}.
- Configuración y dependencias disponibles: {{versiones comprobadas y servicios activos}}.
- Diferencia entre estado actual y propuesto: {{cambio concreto}}.

## Contrato HTTP

Si no se crean ni modifican endpoints, indicarlo expresamente y justificarlo.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| {{método y ruta}} | {{JSON, multipart, parámetros o sin cuerpo}} | {{código, cuerpo y cabeceras}} | {{política real; no asumir autenticación implementada}} |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| {{campo de cuerpo, ruta o consulta}} | {{tipo}} | {{sí/no}} | {{límites, formato, trim, coerción permitida o rechazada}} | {{comportamiento definido}} |

- Campos desconocidos y campos controlados por servidor: {{aceptación o rechazo y valores generados}}.
- Recurso de respuesta: {{campos, tipos, fechas, anidación y ejemplos válidos de petición/respuesta}}.
- Errores: {{código por condición y mensaje o forma del error}}.
- Identidad y permisos: {{comprobaciones efectivas o ausencia explícita}}.
- Compatibilidad: {{cambios para consumidores, paginación o versionado si aplican}}.

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| {{modelo}} | {{campos del dominio}} | {{decisiones concretas}} |

{{Tipos generados utilizados y diferencia entre objeto interno y respuesta pública. Para cambios sin entidades de dominio, señalar qué modelos existentes se conservan y por qué no se añaden otros.}}

- Almacenamiento de esta fase: {{memoria o persistencia realmente incluida en el alcance}}.
- Ciclo de vida: {{pérdida al reiniciar, aislamiento entre procesos, limpieza y copias independientes}}.
- Relaciones: {{validación de formato o existencia; distinguirlas}}.
- Base de datos y migraciones: {{activación incluida o aplazada; los tipos Prisma no implican conexión}}.

## Diseño mínimo

{{Módulo, controlador, servicio y validación implicados; reutilizar código y dependencias existentes. Describir el flujo y los errores que puedan dejar datos parciales. No añadir capas especulativas.}}

## Criterios de aceptación

1. {{Entrada válida y resultado observable concreto}}.
2. {{Entrada inválida, límite o recurso ausente y comportamiento esperado}}.
3. {{Valores omitidos/null y campos propiedad del servidor}}.
4. {{Almacenamiento, aislamiento y ausencia de efectos parciales cuando apliquen}}.
5. {{Compatibilidad y documentación del contrato}}.

## Documentación de endpoints

- Carpeta por endpoint: [{{método y ruta}}](../endpoint/{{metodo}}-{{ruta-normalizada}}/README.md).
- Mantener método, ruta, validación, respuestas, errores y enlaces al código sincronizados con esta especificación.
- Documentar contratos sin realizar solicitudes en vivo ni conectar consumidores salvo que estén dentro del alcance solicitado.

## Estrategia de verificación

{{Casos unitarios y comprobaciones que demostrarán cada criterio de aceptación. Para cambios documentales, revisar rutas, enlaces y diff sin ejecutar la aplicación.}}

Solo pruebas unitarias por defecto, bajo backend/test/<funcionalidad>/<rol>/. No crear ni ejecutar e2e o integración salvo petición explícita. Un contrato HTTP documentado no equivale a una comprobación HTTP ejecutada.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](../plans/{{fecha}}-{{funcionalidad}}-plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
