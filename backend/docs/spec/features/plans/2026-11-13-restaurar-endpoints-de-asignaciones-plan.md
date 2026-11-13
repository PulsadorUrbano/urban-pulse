# 2026-11-13 — Plan para restaurar los endpoints de asignaciones

## Objetivo y alcance

Recuperar `GET /incidents/assignment-options` y `PATCH /incidents/:id/assignment` en `feature/asignaciones-backend`, sobre el `dev` actual. Conservar el contrato de la [especificación existente](../specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md), la persistencia Prisma y los permisos vigentes. No modificar el frontend ni aplicar migraciones.

## Trabajo realizado

- [x] Avanzar `feature/asignaciones-backend` hasta `dev` sin reescribir historial.
- [x] Recuperar pruebas de validación y del servicio; comprobar que fallan por los métodos ausentes.
- [x] Restaurar el pipe, la consulta de catálogos y el PATCH transaccional con comprobación de concurrencia.
- [x] Registrar ambas rutas con JWT y `AccesoIncidenciasGuard`, restringidas a `admin` y `administrative` vigentes.
- [x] Volver a incluir los tres identificadores anulables en el recurso de incidencia y en Swagger.
- [x] Actualizar el catálogo de endpoints y el ejemplo de respuesta.

## Comprobaciones

Ejecutadas desde `backend/` el 2026-11-13:

| Comprobación | Resultado |
| --- | --- |
| `pnpm run build` | Correcto; Prisma Client 7.10.1 generado. |
| `pnpm run lint` | Código 0; dos avisos preexistentes en `test/dev-seed` y `test/auth`. |
| `pnpm test -- --reporter=dot` | 23 archivos y 286 pruebas correctas. |
| `git diff --cached --check`, desde la raíz | Correcto. |

Confirmación: las rutas, el servicio, el pipe y las respuestas quedan restaurados en la rama; la migración y el catálogo se mantienen sin cambios. La validación es unitaria y de compilación, sin servidor ni PostgreSQL en vivo.

## Límites

La migración `20261103000000_asignaciones` ya existe; no se aplica en esta tarea. Las pruebas son unitarias y no verifican una base de datos ni peticiones HTTP en vivo. El frontend web todavía llama a `GET /incidents/:id` sin enviar el JWT; esa integración queda fuera de esta PR de backend.
