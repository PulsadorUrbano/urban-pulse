# 2026-11-16 — Plan de implementación: proteger el listado y sincronizar la asignación

> Implementar por tareas con pruebas de regresión antes de cada cambio y registrar aquí los resultados reales.

- Objetivo: aplicar la [especificación](../specs/2026-11-16-proteger-listado-y-sincronizar-asignacion-spec.md).
- Arquitectura: guards JWT y de rol existentes para todos los listados, comprobación de propiedad en el controlador; transición de estado en el `updateMany` transaccional de asignación.
- Herramientas: NestJS 12, Prisma 7, Vitest 4.
- Rama: `codex/secure-incidents-list-and-assignment-status`.
- Estado: implementado y verificado.

## Restricciones y focos de revisión

Conservar respuesta, paginación, filtro y cursor. Exigir JWT a ambos listados. No modificar frontend ni añadir dependencias, migraciones, conexiones en vivo o e2e. No incluir cambios ajenos del checkout original. Revisar especialmente el acceso global, el `civicId` ajeno, los parches parciales y el conflicto de escritura concurrente. Advertir que el móvil actual no envía JWT al listar.

## Mapa de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `backend/src/incidents/incidents.controller.ts` | Exigir JWT y rol actual; comprobar propiedad del filtro ciudadano. |
| `backend/src/incidents/incidents.service.ts` | Persistir estado e IDs de asignación juntos. |
| `backend/test/incidents/controllers/incidents.controller.spec.ts` | Metadatos y casos de listado autorizado y denegado. |
| `backend/test/incidents/services/asignar-incidencia.service.spec.ts` | Transiciones y concurrencia. |
| `backend/docs/spec/endpoint/get-incidents/README.md` | Contrato de listado. |
| `backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md` | Contrato de estado al asignar. |

## Tarea 1: listado protegido

- [x] Añadir pruebas de metadatos de guards y roles, filtro propio, rechazo de filtro ajeno y acceso global. Fallaron primero por metadatos y autorización ausentes.
- [x] Aplicar los guards existentes a todo el listado y comprobar la propiedad del filtro para ciudadanos.
- [x] Ejecutar las pruebas afectadas y actualizar la ficha `GET /incidents`.

## Tarea 2: estado de asignación

- [x] Añadir pruebas para solo departamento, departamento y equipo, técnico opcional, desasignación y conflicto. Las transiciones fallaron antes del cambio.
- [x] Calcular `status` desde la cadena final y escribirlo junto con los IDs en la transacción existente.
- [x] Ejecutar las pruebas afectadas y actualizar la ficha `PATCH /incidents/:id/assignment`.

## Comprobaciones finales

| Comprobación | Resultado real |
| --- | --- |
| `pnpm test` desde `backend/` | 24 archivos, 292 pruebas correctas sobre `dev`. |
| `pnpm run build` desde `backend/` | Código 0; Prisma Client generado y Nest compilado sobre `dev`. |
| `pnpm run lint` desde `backend/` | Código 0, sin errores; dos avisos preexistentes en pruebas de auth y dev-seed. |
| `git diff --check` | Código 0. |

## Confirmación de implementación

- Estado final: implementado y verificado mediante las comprobaciones anteriores.
- Fecha de revisión: 2026-11-16.
- Resultado entregado: todo el listado protegido por JWT y rol, con filtro propio para ciudadanos; estado de asignación derivado de departamento y equipo.
- Evidencia de criterios 1–3 y 6: metadatos del controlador, guard de roles vigentes, pruebas de filtro propio/ajeno y listado paginado; `git status` sin cambios de frontend.
- Evidencia de criterios 4–5: pruebas de asignación parcial, cadena completa, desasignación, errores y conflicto concurrente.
- Decisiones y desviaciones: el usuario limitó el alcance a backend y después exigió JWT para todo el listado, aceptando que el móvil deje de funcionar hasta su adaptación. La PR se trasladó a `dev` para independizarla de #167; se resolvió la ficha de asignación según el contrato sin integración de fotos S3 de esa base.
- Limitaciones y pendientes: sin prueba HTTP en vivo. El móvil actual llama al listado filtrado sin Bearer y recibirá 401. **Advertencia obligatoria para la descripción de la PR:** «`GET /incidents` exige JWT también con `civicId`. El frontend-mobile actual no envía Bearer en esa consulta, por lo que Mis incidencias dejará de cargar desde el backend hasta que se actualice el cliente». No crear la PR sin incluir esta advertencia.
