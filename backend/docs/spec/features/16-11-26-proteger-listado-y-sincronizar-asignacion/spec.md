# 2026-11-16 — Especificación: proteger el listado y sincronizar la asignación

- Desarrollador responsable: equipo UrbanPulse.
- Asistente de IA: Codex.
- Modelo de IA: GPT-6 (versión exacta no disponible).
- Rama: `codex/secure-incidents-list-and-assignment-status`.
- Estado: implementado y verificado mediante pruebas unitarias, compilación y lint.
- Plan: [Plan de implementación](plan.md).

## Objetivo y decisiones

El listado global de incidencias es de uso interno. Todo `GET /incidents`, con o sin `civicId`, requiere JWT. El móvil actual consulta con `civicId` y sin JWT en esta ruta, por lo que su listado dejará de funcionar hasta que envíe el token; el frontend queda fuera de alcance por decisión del usuario. Una incidencia pasa a `assigned` cuando tiene departamento y equipo válidos; el técnico puede asignarse más tarde. Solo departamento es una preparación parcial y conserva `validated`. Si una incidencia `assigned` pierde el equipo o departamento, vuelve a `validated` en la misma transacción. La asignación completa y los cambios de estado son atómicos.

Se reutilizan `JwtAuthGuard`, `AccesoIncidenciasGuard`, el filtro `civicId`, los modelos Prisma existentes y el cursor ligado al filtro. No hay cambios de esquema, migraciones, nuevos roles, frontend ni cambios de la respuesta paginada. La regla de dos niveles evita exigir un técnico cuando ya existe un equipo responsable. La alternativa de exigir los tres niveles retrasa innecesariamente `assigned`; la de marcarlo con solo departamento no identifica al equipo responsable.

## Contrato HTTP

| Ruta | Acceso y consulta | Respuesta |
| --- | --- | --- |
| `GET /incidents` sin `civicId` | JWT y rol actual `admin` o `administrative` | 200, array y cabeceras de paginación actuales |
| `GET /incidents?civicId=<UUID>` | JWT y rol `civic` vinculado a ese `civicId`, o rol `admin`/`administrative` | 200, solo incidencias del ciudadano indicado |
| `PATCH /incidents/:id/assignment` | JWT y rol `admin` o `administrative`; cuerpo parcial actual | 200, incidencia completa con estado resultante |

Para todo listado, JWT ausente o inválido devuelve 401. Un rol insuficiente devuelve 403. Un ciudadano sin `civicId` o con un `civicId` ajeno recibe 403 antes de consultar la base de datos; el identificador se contrasta con el vínculo ciudadano vigente en PostgreSQL, no con un claim sin verificar. Admin y administrative pueden filtrar por cualquier `civicId`. El filtro y el cursor mantienen su validación actual y los errores 400 existentes. `PATCH` sigue rechazando estados distintos de `validated` y `assigned`, jerarquías incompatibles, catálogos ausentes y cambios concurrentes. La omisión conserva niveles; `null` desasigna el nivel y sus descendientes. La transición `validated`/`assigned` se calcula del resultado final, incluso cuando el parche solo modifica un nivel. No se añade un registro `CambioEstado`: el estado deriva de la asignación, mientras ese historial registra la validación o el rechazo manual.

El móvil no se modifica. Su consulta actual `GET /incidents?civicId=...` recibe 401 porque no envía Bearer; esto debe advertirse en la descripción de la PR y resolverse posteriormente en el cliente.

## Modelo y diseño

`Incident` reutiliza `status`, `departmentId`, `teamId` y `technicianId` existentes en PostgreSQL; las tres claves siguen siendo anulables. El servicio calcula la cadena final, valida su jerarquía y escribe IDs y estado en el mismo `updateMany` condicionado por estado e IDs previos. El listado usa los guards JWT y de rol actual existentes. El controlador compara el filtro validado con el vínculo ciudadano cuando el solicitante tiene rol `civic`.

## Criterios de aceptación

1. Ninguna petición anónima ni rol distinto de admin/administrative obtiene el listado global.
2. La consulta con `civicId` requiere JWT; un ciudadano solo consulta su propio identificador.
3. Admin y administrative pueden listar globalmente o filtrar, con cabeceras y cursor actuales.
4. Departamento y equipo llevan a `assigned` con o sin técnico; solo departamento deja `validated`.
5. Al quitar equipo o departamento se vuelve a `validated`, sin guardar cambios parciales ante errores o conflictos.
6. No se modifica frontend; se documenta que el móvil actual recibirá 401 al listar.

## Verificación

Pruebas unitarias del controlador, guard y servicio. Ejecutar compilación, lint y pruebas unitarias de backend. No se ejecutan peticiones HTTP ni migraciones.
