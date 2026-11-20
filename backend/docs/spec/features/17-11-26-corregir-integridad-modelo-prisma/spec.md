# 2026-11-17 — Especificación: corregir la integridad del modelo Prisma

> Documento de la primera fase. Las decisiones y comprobaciones finales de esta PR se actualizan en [cierre del modelo](../17-11-26-cerrar-modelo-asignaciones/spec.md) y su [plan](../17-11-26-cerrar-modelo-asignaciones/plan.md).

- Desarrollador responsable: equipo Urban Pulse.
- Asistente de IA: Codex.
- Modelo exacto: no disponible en el entorno.
- Rama: `fix/prisma-model-integrity`.
- Estado: implementado; migración pendiente de comprobación contra PostgreSQL.
- Plan: [Plan de implementación](plan.md).
- Referencias: issues #178, #179 y #180.

## Objetivo y alcance

Impedir que se guarden incidencias con referencias inexistentes o combinaciones incoherentes y hacer estable el catálogo de categorías antes de poblar datos de prueba.

- Persistir categorías y activos urbanos; relacionar sus identificadores con `Incident`. Las categorías iniciales conservan nombres y reciben identificadores persistentes.
- Relacionar `Incident.civicId` con `citizens.user_id` y los actores de los historiales con `users.id`.
- Permitir cambios de prioridad automáticos sin usuario, con una restricción que relacione `is_manual` y `user_id`; el servicio ofrece operaciones manual y automática atómicas.
- Proteger la coherencia de departamento, equipo y técnico; validar pares de coordenadas y rangos; aplicar a título la longitud admitida por la API.
- Incorporar los estados restantes del diagrama, una dirección reutilizable y un contexto urbano opcional por ubicación.
- Conservar rutas y campos públicos. La categoría y el activo siguen siendo opcionales al crear la incidencia. La dirección es un campo nuevo y opcional.

Los nuevos estados quedan disponibles en el modelo y en las lecturas; sus transiciones HTTP requieren reglas funcionales propias. El contexto urbano puede poblarse desde procesos internos, sin endpoint público en esta fase.

## Contratos y persistencia

`GET /categories` conserva su respuesta y orden inicial y lee categorías persistidas. `POST /incidents` conserva sus campos; los UUID de categoría y activo, si se proporcionan, deben existir. Si solo llega el nombre de la categoría, se crea o reutiliza su registro en la misma transacción. Si llegan nombre e ID, deben coincidir. Una incidencia sin ubicación sigue siendo válida; no se crea una fila de ubicación vacía. Si llegan coordenadas, llegan ambas y están en rango. La dirección opcional requiere coordenadas, calle, código postal de cinco dígitos y distrito admitido; se reutiliza por su clave compuesta y aparece en la respuesta. Una descripción enviada tiene al menos 10 caracteres.

Las migraciones son incrementales. Los activos históricos sin nombre conservan su UUID con nombre nulo. Se eliminan únicamente filas históricas de ubicación totalmente vacías, creadas por el código anterior; antes de activar las demás restricciones se comprueban referencias existentes. Los datos incompatibles requieren corrección explícita, sin nombres ficticios. No se aplica la migración a una base de datos real en esta tarea.

## Criterios de aceptación

1. Categorías estables entre procesos y referencias válidas para incidencias; activos urbanos referenciados si se usan.
2. Propietario y actores existentes; cambio automático sin actor y manual con actor, comprobados por pruebas de servicio.
3. Asignaciones coherentes incluso después de cambios en equipos y membresías.
4. Coordenadas completas y válidas; ubicación ausente sin fila vacía; título entre 4 y 35 caracteres y descripción opcional de al menos 10.
5. Estados, dirección y contexto urbano del diagrama representados en Prisma; dirección opcional persistida y recuperada con la incidencia.
6. Esquema Prisma, SQL, código afectado y contratos documentados coherentes; pruebas unitarias y comprobaciones de compilación y lint.
