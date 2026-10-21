# Plan: objetos Prisma para incidencias

Fecha: 2026-10-21.
Especificacion: spec.md, en este directorio.
Ejecucion: directa en esta sesion, sin agentes adicionales.

## Restricciones

Sin base de datos, migraciones, dependencias nuevas, cambios frontend, e2e o integracion. Conservar los contratos HTTP y los limites existentes. No commit ni push. Usar imports .js y tipos generados Prisma.

## Tareas

- [x] Definir Incident, IncidentLocation e IncidentImage con IDs UUID, fechas DateTime y relaciones minimas. Generar y validar el cliente usando Prisma instalado y prisma7.config.ts, sin acceso a una base de datos.
- [x] Derivar StoredIncident de los modelos generados en src/incidents/incident.ts. Mantener las interfaces publicas HTTP y de subida.
- [x] Tipar el Map de IncidentsService con StoredIncident. Convertir fechas ISO de las subidas a Date y asignar incidentId. Serializar fechas y ocultar claves internas al devolver cada respuesta.
- [x] Reubicar la suite modificada a test/incidents/services/incidents.service.spec.ts. Preservar sus casos y comprobar imagenes y ubicacion aisladas, fechas ISO, opcionales null, 404, instancias independientes y limpieza de fallo de subida. Usar dobles de UploadStorageService; sin servidor ni base de datos.
- [x] Ejecutar npm test, npm run build y npm run lint desde backend. Verificar que se puede generar sin DATABASE_URL y revisar el diff. No ejecutar test:e2e.
- [x] Actualizar spec y plan con resultados y limitaciones. Documentar el almacen en backend/AGENTS.md. Conservar el analisis estatico frontend sin cambios de conexion.

## Revision

Comprobar que las fechas internas no se filtran como objetos Date en el contrato de servicio; no aparecen incidentId internos en imagenes/ubicacion; las respuestas no mutan el almacen; los opcionales no adquieren requisitos nuevos; no se importa PrismaClient en el flujo de incidencias.

## Resultado

Tareas implementadas y comprobaciones ejecutadas. Build y 39 pruebas unitarias correctos; lint no pudo analizar el codigo por bloqueo del binario nativo mediante Windows Application Control. Ver detalles en spec.md. Sin conexion DB/frontend, migraciones, e2e, integracion, commits o push.
