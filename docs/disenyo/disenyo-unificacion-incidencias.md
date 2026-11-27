# DD-003 — Unificación de reportes de incidencias

| Metadato | Valor |
|---|---|
| Estado | Propuesto, pendiente de revisión |
| Autoría | Equipo 13 |
| Fecha / última revisión | 2026-11-27 |
| Iteración | Pendiente de asignar |
| Revisores | Pendientes |
| Enlaces | [ADR 0008](../adr/0008-unificacion-incidencias.md); [arquitectura del proyecto](../architecture.md) |

## 1. Resumen ejecutivo

**Problema**

Varios ciudadanos pueden comunicar el mismo problema en la vía pública. Si cada reporte se gestiona por separado, el equipo municipal puede terminar revisando o resolviendo varias veces la misma incidencia.

**Solución propuesta**

Relacionar los reportes que se refieren al mismo problema con una única incidencia normalizada. Cada reporte conservará sus datos y quedará asociado a esa incidencia, de forma que se pueda consultar de dónde procede y quién lo comunicó.

**Razón principal**

La incidencia normalizada permite gestionar el problema una sola vez, manteniendo la información que ha aportado cada ciudadano.

**Principal riesgo**

Dos problemas cercanos o parecidos podrían confundirse. Por eso, se propone que una persona del equipo municipal confirme la unión antes de relacionar los reportes. Esta decisión está pendiente de validación.

## 2. Contexto y problema

Actualmente, el modelo `Incident` representa tanto el reporte del ciudadano como la incidencia que gestiona el personal municipal. Cada registro tiene un ciudadano, ubicación, estado e historial propios. La base de datos impide borrar las incidencias y modificar sus historiales existentes.

Todavía no se ha implementado la unificación descrita en este documento. Se propone separar el concepto de reporte del de incidencia normalizada para conservar lo que ha enviado cada ciudadano y, al mismo tiempo, disponer de un único caso para su gestión.

## 3. Objetivos, no objetivos y alcance

**Objetivos**

- Relacionar los reportes de varios ciudadanos que describen el mismo problema con una única incidencia normalizada.
- Conservar cada reporte y poder consultar la relación en ambos sentidos: de la incidencia a sus reportes y del reporte a su incidencia.
- Gestionar el estado y la evolución del problema desde la incidencia normalizada.
- Registrar quién ha unido o separado reportes y cuándo lo ha hecho.

**No objetivos**

- Borrar los reportes originales o sus historiales.
- Confirmar uniones automáticamente sin la revisión propuesta del equipo municipal.
- Crear un sistema de notificaciones o de inteligencia artificial como parte necesaria de este diseño.

**Dentro del alcance:** modelo de datos, relaciones, gestión municipal, consulta de la trazabilidad y adaptación de los contratos afectados. **Fuera del alcance:** cambios de apariencia de los frontends y cualquier sistema de notificaciones, salvo que se acuerden por separado.

## 4. Requisitos y drivers arquitectónicos

| ID | Tipo | Necesidad | Cómo comprobarlo | Prioridad |
|---|---|---|---|---|
| RF-1 | Funcional | Relacionar varios reportes con una incidencia | Unir dos reportes y comprobar que apuntan a la misma incidencia normalizada | Alta |
| RF-2 | Funcional | Conservar la trazabilidad | Consultar los reportes desde la incidencia y la incidencia desde cada reporte | Alta |
| RF-3 | Funcional | Mantener la información original | Comprobar que los datos e historiales de ambos reportes siguen disponibles tras la unión | Alta |
| RF-4 | Funcional | Corregir una unión equivocada | Separar o reasignar un reporte y comprobar que queda constancia del cambio | Alta |
| RF-5 | Funcional | Limitar quién puede unificar | Comprobar que un usuario sin permiso no puede unir ni separar reportes | Alta |
| RQ-1 | Calidad | Evitar relaciones inconsistentes | Probar peticiones simultáneas y comprobar que un reporte no queda asociado a dos incidencias activas | Alta |
| RQ-2 | Seguridad | Proteger los datos de los ciudadanos | Comprobar qué información puede consultar cada rol | Alta |

Los criterios exactos para detectar posibles coincidencias, los roles autorizados y la información visible para cada usuario quedan pendientes de acordar.

## 5. Arquitectura actual y dependencias

El móvil permite comunicar incidencias y la web se utiliza para su gestión municipal. Ambos clientes se comunican con el backend, que guarda los datos en PostgreSQL. El modelo actual relaciona cada `Incident` con un ciudadano y mantiene sus cambios de estado, prioridad y asignación.

La unificación afectaría al backend, la base de datos y a los contratos consumidos por los frontends. También habría que revisar las imágenes, ubicaciones, listados, permisos y métricas que actualmente apuntan a cada incidencia. El [esquema actual](../../backend/prisma/schema.prisma) y la [arquitectura](../architecture.md) sirven como referencia del punto de partida.

## 6. Alternativas consideradas

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Borrar duplicados y conservar una incidencia | Deja un único registro para consultar | Se perderían reportes e historial; además, la base actual impide borrar incidencias |
| Mantener los registros actuales y enlazarlos entre sí | Reutiliza los registros existentes | Hay que identificar cuál es el principal y evitar cadenas o relaciones contradictorias |
| Separar reportes e incidencia normalizada | Cada reporte conserva su origen y todos se relacionan con un caso común | Requiere adaptar el modelo, los contratos y los datos existentes |

Se propone la tercera alternativa porque permite distinguir lo que comunica cada ciudadano del problema que gestiona el Ayuntamiento. La estructura concreta y la transición desde el modelo actual deben revisarse antes de implementar. La decisión propuesta se recoge en el [ADR 0008](../adr/0008-unificacion-incidencias.md).

## 7. Diseño propuesto

### 7.1. Visión y flujo

1. Un ciudadano envía un reporte con los datos del problema.
2. El sistema conserva el reporte y su autor. Se propone que inicialmente tenga una incidencia normalizada propia.
3. Si hay otros reportes que podrían describir el mismo problema, se muestran al personal municipal para que los revise. Cómo se obtienen esos posibles reportes queda por decidir.
4. Una persona autorizada confirma cuáles corresponden al mismo problema y los relaciona con una incidencia normalizada.
5. El equipo municipal gestiona el estado del problema desde esa incidencia. Los reportes originales siguen consultables según los permisos de cada usuario.

La creación de la incidencia al recibir el primer reporte y la confirmación por una persona municipal son propuestas pendientes de validación. No hay todavía diagramas específicos de este flujo.

### 7.2. Interfaces y contratos

Se necesitarán operaciones para consultar los reportes de una incidencia, consultar la incidencia asociada a un reporte y unir o separar reportes. Los nombres de rutas y el formato de las respuestas se definirán durante la implementación, después de acordar los roles y el comportamiento con los clientes actuales.

Los endpoints existentes de creación, listado, detalle y gestión de incidencias deberán revisarse para evitar que los clientes pierdan el acceso a sus reportes o reciban información de otros ciudadanos sin permiso.

### 7.3. Modelo y gestión de datos

Se propone mantener por separado:

- **Reporte:** información original aportada por un ciudadano, su autor, ubicación, fecha y fotografías.
- **Incidencia normalizada:** el problema común que gestiona el equipo municipal, con su estado, prioridad y asignación.
- **Relación e historial:** asociación entre cada reporte y su incidencia, junto con los cambios de unión o separación, actor y fecha.

Un reporte tendrá como máximo una asociación activa a una incidencia normalizada; una incidencia podrá tener varios reportes. La relación histórica permitirá reconstruir los cambios sin borrar la información anterior. El reparto definitivo de campos y la adaptación del modelo actual quedan pendientes de diseño detallado.

### 7.4. Fallos, concurrencia y resiliencia

La unión o separación deberá actualizar la relación y registrar el cambio en una misma operación. Si falla, no debe quedar una relación a medias. Las peticiones simultáneas sobre un mismo reporte deben resolverse sin que este quede asociado a dos incidencias activas. Una unión incorrecta deberá poder corregirse sin eliminar el reporte ni su historial.

### 7.5. Seguridad

Se propone limitar la unión y separación al personal municipal autorizado y guardar el usuario que realiza cada cambio. El ciudadano debe poder consultar sus propios reportes y el estado de la incidencia relacionada, sin que la unión exponga automáticamente los datos personales de otros ciudadanos. Los permisos y campos visibles por rol están pendientes de concretar.

### 7.6. Operación y despliegue

Antes del despliegue habrá que revisar los datos existentes, preparar su adaptación y comprobarla en un entorno de pruebas. La propuesta es conservar los identificadores y el historial existentes, pero la correspondencia exacta entre registros actuales, reportes e incidencias normalizadas debe definirse antes de migrar.

La migración y la reversión deberán ensayarse con una copia de los datos. También habrá que revisar que los listados y métricas cuenten incidencias normalizadas o reportes según corresponda, evitando contar un mismo problema varias veces.

## 8. Decisiones y trade-offs

| Decisión propuesta | Beneficio | Coste o consecuencia | ADR |
|---|---|---|---|
| Separar reportes e incidencia normalizada | Se conserva la trazabilidad y se gestiona un solo problema | Cambios en datos, backend y clientes | [ADR 0008](../adr/0008-unificacion-incidencias.md) |
| Confirmación municipal de las uniones | Reduce el riesgo de unir problemas distintos | Requiere revisión manual | Pendiente de validación |
| Conservar historial de las relaciones | Permite corregir y explicar las uniones | Hay que gestionar cambios y permisos | Incluido en la propuesta |

## 9. Plan de implementación y migración

1. Confirmar quién decide las uniones, cuándo se crea la incidencia normalizada y qué información puede ver cada rol.
2. Definir el modelo, las operaciones y la adaptación de los contratos existentes.
3. Preparar y probar la migración de los registros actuales, conservando sus identificadores e historiales cuando sea viable.
4. Implementar la consulta, unión, separación e historial, con las comprobaciones de permisos y concurrencia.
5. Adaptar los clientes, listados y métricas, y comprobar el flujo completo antes del despliegue.
6. Desplegar después de ensayar la migración y la recuperación con una copia de los datos.

La forma de identificar automáticamente posibles coincidencias, si se desea, se decidirá antes de incluirla en el alcance de implementación.

## 10. Estrategia de verificación y evaluación

| Requisito | Prueba | Resultado esperado |
|---|---|---|
| RF-1 y RF-2 | Unir reportes de dos ciudadanos y consultar desde ambos lados | Ambos apuntan a una incidencia y esta muestra los dos reportes |
| RF-3 | Comparar datos e historiales antes y después | Se conservan los reportes y sus datos originales |
| RF-4 | Separar o reasignar un reporte unido por error | La relación actual cambia y queda registrado quién la modificó y cuándo |
| RF-5 y RQ-2 | Probar con ciudadano y personal con y sin permisos | Solo el personal autorizado puede modificar relaciones y no se exponen datos ajenos |
| RQ-1 | Intentar unir el mismo reporte a dos incidencias simultáneamente | Solo queda una relación activa y no se pierde el historial |
| Migración | Ensayar con copia representativa de datos existentes | Se conservan registros e historiales y los clientes pueden seguir consultando lo que les corresponde |
| Métricas | Comparar recuentos de reportes e incidencias normalizadas | Cada medida cuenta el tipo de registro que corresponde |

## 11. Riesgos, hipótesis y cuestiones abiertas

| ID | Tipo | Descripción | Impacto | Acción |
|---|---|---|---|---|
| H-1 | Propuesta | Una persona municipal confirma las uniones | Evita uniones automáticas erróneas, pero requiere revisión | Validar el flujo con el equipo |
| H-2 | Propuesta | El primer reporte crea su propia incidencia normalizada | Todos los reportes tendrían un caso desde el principio | Confirmar cuándo debe crearse |
| R-1 | Riesgo | Se unen problemas distintos | El equipo puede gestionar información equivocada | Permitir corregir la unión y conservar el historial |
| R-2 | Riesgo | Una migración o cambio de contrato afecta a datos existentes | Pérdida de acceso o resultados incorrectos | Ensayar migración y compatibilidad con datos de prueba |
| R-3 | Riesgo | Se muestran datos de otros ciudadanos | Pérdida de privacidad | Definir y probar los permisos y campos visibles |
| Q-1 | Pregunta | ¿Quién confirma las uniones y cómo se encuentran posibles coincidencias? | Cambia el flujo municipal | Decidir con el equipo |
| Q-2 | Pregunta | ¿Cuándo se crea la incidencia normalizada? | Cambia la relación inicial de cada reporte | Decidir con el equipo |
| Q-3 | Pregunta | ¿Qué ocurre con estados, asignaciones y fotos si se unen casos ya gestionados? | Puede haber información contradictoria | Acordar reglas antes de implementar |
| Q-4 | Pregunta | ¿Qué información pueden ver los ciudadanos y qué roles municipales pueden unir o separar? | Afecta a privacidad y permisos | Acordar con el equipo |

## 12. Revisión y resultado

El diseño y el [ADR 0008](../adr/0008-unificacion-incidencias.md) son propuestas pendientes de revisión. La funcionalidad todavía no está implementada. Las decisiones sobre el flujo y las reglas de unificación deben confirmarse antes de iniciar el desarrollo.

## Checklist de aprobación

- [x] Problema, objetivos y alcance documentados.
- [x] Alternativas y riesgos recogidos.
- [ ] Flujo de unificación y roles acordados.
- [ ] Modelo, contratos y reglas de migración revisados.
- [ ] Tratamiento de estados, fotos y privacidad acordado.
- [ ] Pruebas realizadas tras la implementación.
- [ ] Diseño y ADR revisados por el equipo.
