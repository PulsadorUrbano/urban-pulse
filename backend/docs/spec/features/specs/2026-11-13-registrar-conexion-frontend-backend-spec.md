# 2026-11-13 — Especificación: registrar peticiones HTTP del backend

- Rama: `feat/logs`, desde `feature/asignaciones-backend` (`d33ba5d`).
- Responsable: equipo Urban Pulse; persona concreta no indicada. Asistente: Codex; versión exacta del modelo no disponible.
- Estado: código backend implementado; comprobación con frontend real pendiente.
- [Plan](../plans/2026-11-13-registrar-conexion-frontend-backend-plan.md).

## Objetivo

Al hacer una acción en el frontend web, poder comprobar en los logs del backend que llegó su petición y qué estado devolvió. El navegador y el backend se cotejan por método, ruta y momento. El log por sí solo no identifica de forma fiable qué cliente envió la petición.

## Comportamiento

- Usar el `Logger` de NestJS y un middleware Express registrado una vez en `main.ts`.
- Registrar al terminar cada ruta API reconocida una línea como `GET /incidents/:id 200 4ms`.
- Usar la plantilla de ruta de Express. No registrar URL concreta, query, cuerpos, cabeceras, tokens, IP ni datos personales.
- Omitir `/health`, documentación y rutas no reconocidas. No añadir cabeceras, dependencias, configuración ni cambios en el frontend.
- No cambiar endpoints, permisos, respuestas, modelos Prisma ni persistencia.

## Criterios de aceptación

1. Una respuesta de una ruta API reconocida produce una sola línea con método, plantilla, estado y duración.
2. La línea no contiene el UUID de la URL, parámetros de consulta ni credenciales.
3. Salud y rutas no reconocidas no generan esta línea.
4. Las pruebas unitarias, compilación y lint del backend siguen pasando.
5. En un entorno operativo, una acción real del frontend aparece en Network y deja una línea correlacionable en backend. Este criterio queda pendiente hasta disponer de PostgreSQL y configuración local.

## Verificación

Una prueba unitaria del middleware cubre los criterios 1–3. La comprobación del criterio 5 es manual y se documenta en el plan; no se presenta una prueba unitaria como evidencia de conexión real.
