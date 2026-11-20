# 2026-11-17 — Cierre del modelo e historial de asignaciones

## Decisiones

Categoría y ubicación obligatorias; título de 4 a 35 caracteres. Dirección opcional.
La categoría solo se almacena mediante FK; el nombre de la respuesta se obtiene de la relación.
El catálogo es controlado: no se crean categorías desde reportes. Se resuelve por UUID o nombre normalizado activo.
Categorías con códigos estables: alumbrado, limpieza, residuos, pavimentos, accesibilidad, senalizacion, zonas_verdes, mobiliario, agua_saneamiento y otros.
Los nombres anteriores se migran conservando sus UUID; las categorías históricas ajenas al catálogo se conservan inactivas.
UrbanAsset representa un tipo de elemento, sin ubicación ni inventario individual. Sigue siendo opcional.

## Usuarios y ámbito

DepartmentMember vincula un usuario a un departamento. Su rol department solo permite gestionar incidencias ya pertenecientes a ese departamento y asignarlas dentro del mismo.
TeamMember permite un único equipo por usuario. El indicador isTechnician y la membresía activa habilitan la actuación técnica.
El perfil citizens es independiente del rol municipal: un operario con perfil ciudadano puede registrar incidencias propias.
Usuarios, categorías, departamentos, equipos y membresías se desactivan mediante isActive. Los usuarios inactivos no autentican ni operan con JWT anteriores.
La pertenencia vigente no es el historial. Para cambiar de equipo hay que retirar previamente las asignaciones vigentes que bloqueen la FK; el historial conserva los valores anteriores.

## Estados

| Origen | Destino | Permiso |
| --- | --- | --- |
| reported | validated, rejected | admin o administrative |
| validated | assigned | administración o departamento propio, mediante asignación completa |
| assigned | in_progress | técnico asignado del equipo |
| in_progress | resolved | técnico asignado del equipo |
| resolved | closed, reopened | administración o departamento propio |
| closed | reopened | administración |
| reopened | assigned | administración o departamento propio, mediante asignación completa |

rejected es terminal. Los cambios explícitos de estado requieren motivo. La resolución usa cause para describir la actuación.
assigned exige departamento y equipo; el técnico es opcional hasta el comienzo de la intervención.
Las reasignaciones de assigned conservan el estado. No se permite reasignar mientras hay trabajo en curso.
El alta registra reported en el historial. Estado e historial se escriben atómicamente con comprobación optimista de concurrencia.

## Historial de asignaciones y conservación

assignment_changes guarda incidencia, actor autenticado, comentarios adicionales opcionales, fecha y UUID de departamento, equipo y técnico anteriores y nuevos.
Las referencias históricas apuntan a usuarios y catálogos, no a la membresía actual. Una retirada de membresía no borra la auditoría.
Cada PATCH /incidents/:id/assignment registra el cambio dentro de la misma transacción y admite cause como texto opcional. La primera asignación y la reasignación tras reapertura también registran assigned, con un motivo automático si se omiten los comentarios.
GET /incidents/:id/assignments devuelve el historial cronológico, protegido por el ámbito del detalle, solo para roles municipales.
Las incidencias se conservan permanentemente. Los historiales son inmutables; no se inventa auditoría para asignaciones anteriores a la migración.

## Migración y límites

20261118000000_close_model se aplica después de model_integrity. Se detiene ante categorías o ubicaciones ausentes y usuarios con varios equipos. No rellena ubicaciones ficticias ni elimina incidencias.
La migración 20261120000000_comentarios_asignacion_opcionales permite guardar asignaciones sin comentarios y conserva las entradas históricas.
La ubicación obligatoria se protege mediante triggers diferidos al commit para permitir el alta anidada de Prisma; por eso la relación inversa se expresa como opcional en Prisma.
Los permisos se verifican en la API; la base de datos protege referencias, transiciones y conservación.
El contexto urbano conserva sus campos opcionales; demography admite solo valores no negativos. Su vocabulario detallado no se define en este cambio.
No se ejecutan migraciones ni se puebla una base de datos real en este trabajo.
