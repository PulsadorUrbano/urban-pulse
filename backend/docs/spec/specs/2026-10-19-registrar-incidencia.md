# Especificación: módulo de registro de incidencias

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: No registrado en el documento original.
- Modelo de IA que creó la especificación: No registrado en el documento original; no se infiere retrospectivamente.

- Rama: `feat-registrar-incidencia`.
- Checkout: `C:\Users\joseg\Documents\urban_pulse\urban-pulse`.
- Última actualización: 2026-10-19.
- Estado: implementación completada en memoria; verificación registrada el 2026-10-19.
- Plan: [Plan de implementación](../plans/2026-10-19-registrar-incidencia-plan.md).

## Objetivo y decisiones vigentes

Crear únicamente el módulo backend para registrar una incidencia y consultarla como recurso propio de la API. El usuario confirma que la base de datos aún no está configurada y pide ignorar `civicId` por ahora.

La solución planificada utiliza memoria del proceso para probar el flujo sin base de datos. Esta es una suposición explícita de implementación: los reportes se conservan entre peticiones al mismo proceso y desaparecen al reiniciarlo. No se promete persistencia duradera ni sincronización entre instancias.

Se reutilizan NestJS, TypeScript, Vitest y Supertest, con una estructura sencilla conforme a Ponytail. No añadir dependencias ni ejecutar `npm install` o `pnpm install`.

Esta revisión sustituye la propuesta inicial de Prisma/PostGIS, transacciones, historial y ciudadanía. Estos elementos quedan aplazados.

## Contexto verificado

- Referencias del dominio: `backend/docs/migrations/001_base_diagram.sql` y `database/diagram.dbml`.
- El SQL define título, descripción, categoría, ubicación, prioridad y estado.
- Existen `PrismaModule` y `PrismaService`. Actualmente la raíz importa Prisma y exige `DATABASE_URL`, intentando conectar durante la inicialización.
- Para ejecutar esta fase sin base de datos, `AppModule` dejará de importar `PrismaModule`. Los archivos y dependencias Prisma se conservan para la futura integración.
- Swagger está en `/` y la ruta de salud es `/health`.
- El backend usa ESM con imports relativos `.js`; las suites unitarias y e2e de Vitest son independientes.

## Contrato HTTP

| Método y ruta        | Resultado                                                      |
| -------------------- | -------------------------------------------------------------- |
| `POST /incidents`    | `201 Created`, recurso creado y `Location: /incidents/{id}`.   |
| `GET /incidents/:id` | `200 OK` con el recurso; `404` para UUID válido no almacenado. |

### Entrada de registro

| Campo          | Validación                                                                               |
| -------------- | ---------------------------------------------------------------------------------------- |
| `title`        | Texto obligatorio, trim, entre 4 y 25 caracteres.                                        |
| `description`  | Texto obligatorio, trim, mínimo 10 caracteres.                                           |
| `categoryId`   | UUID obligatorio; solo se valida el formato.                                             |
| `latitude`     | Número finito obligatorio entre -90 y 90, incluidos los extremos.                        |
| `longitude`    | Número finito obligatorio entre -180 y 180, incluidos los extremos.                      |
| `urbanAssetId` | UUID opcional; omisión normalizada a `null` en respuesta. Si se envía, no admite `null`. |

El cuerpo debe ser un objeto JSON, no `null`, array ni primitivo. Rechazar campos desconocidos y tipos incorrectos, sin convertir cadenas numéricas en coordenadas. Validar longitud después de trim y contar puntos de código Unicode, no unidades UTF-16.

`civicId` no forma parte del contrato y no se crea una identidad ficticia. Rechazarlo como cualquier campo desconocido. Tampoco se admiten campos de servidor: `id`, `createdAt`, `status`, `priority`, ni asignaciones.

No comprobar existencia de categorías/activos sin base de datos; documentar expresamente que solo se validan sus UUID.

### Recurso de respuesta

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "Farola apagada",
  "description": "La farola no ilumina la calle.",
  "categoryId": "00000000-0000-4000-8000-000000000002",
  "urbanAssetId": null,
  "location": { "latitude": 36.7213, "longitude": -4.4214 },
  "status": "reported",
  "priority": "low",
  "createdAt": "2026-10-19T12:00:00.000Z"
}
```

El servidor genera UUID con `node:crypto`, fecha ISO y valores `reported`/`low`. No se crean asignaciones ni historial. GET devuelve datos equivalentes a POST; reportes con coordenadas iguales reciben UUID distintos. No exponer referencias mutables al objeto almacenado.

### Errores y acceso

- `400`: cuerpo/campo inválido, campo desconocido o UUID de ruta mal formado.
- `404`: UUID de incidencia válido pero inexistente.
- Los dos endpoints de este prototipo son accesibles sin autenticación. No implementar identidad, autorización ni respuestas `401`/`403` en esta fase.

## Diseño mínimo

Un `IncidentsModule` registra controlador y servicio. Un DTO y pipe validan la entrada usando Nest ya instalado. Un tipo `Incident` describe la respuesta. `IncidentsService` guarda recursos en un `Map<string, Incident>` de instancia con alcance singleton Nest.

No añadir repositorios, interfaces de almacenamiento, persistencia en disco ni configuración para elegir proveedores. Marcar el almacenamiento temporal con `ponytail:` indicando pérdida al reiniciar, límite de memoria del proceso y futura sustitución por persistencia cuando se configure la base de datos.

## Fuera de alcance

Configuración DB, modelos/generación Prisma, cambios SQL, migraciones, claves foráneas, transacciones, historial, autenticación, `civicId`, autorización, fotografías, frontend, listados, edición, borrado y asignaciones. No borrar ni simular la implementación Prisma.

## Criterios de aceptación

1. POST válido devuelve `201`, UUID, ISO `createdAt`, `Location`, estado `reported` y prioridad `low`.
2. GET devuelve el recurso creado dentro de la misma aplicación.
3. Validación rechaza datos incorrectos antes de crear registros y protege los campos de servidor.
4. Se aceptan cero y los límites válidos de coordenadas; se rechazan tipos incorrectos y valores fuera de rango.
5. UUID de ruta mal formado devuelve `400`; UUID válido ausente devuelve `404`.
6. Reportes en la misma ubicación reciben identificadores diferentes.
7. Una instancia nueva empieza vacía; el estado no es estático ni se comparte entre pruebas.
8. La aplicación inicializa y sirve POST/GET sin `DATABASE_URL`, Prisma ni PostgreSQL activos.
9. `/health` conserva su respuesta; Swagger explica memoria temporal y referencias sin comprobación de existencia.
10. Se registran resultados reales de build, lint, unitarias y e2e, separando fallos previos de regresiones.

## Seguimiento

- Código y pruebas: implementados en `backend/src/incidents/`, con pruebas unitarias de servicio y pipe, y pruebas e2e de módulo y raíz.
- Verificación: `npm run build` correcto; `npm run lint` correcto con tres avisos de Oxlint por el conteo explícito de puntos de código; `npm run test:e2e` correcto (3 pruebas); `npm test` mantiene un fallo previo en `src/prisma/prisma.service.spec.ts` porque no proporciona `ConfigService`.
- Smoke test de producción: `POST /incidents` y `GET /health` correctos sin `DATABASE_URL`; tras reiniciar el proceso, el identificador anterior devolvió `404`.
- Informe final: `backend/docs/spec/reports/2026-10-19-registrar-incidencia.md`, en español.
- Mantener esta especificación actualizada durante la ejecución y conservar su nombre.
- 2026-10-19: diseño inicial y convención de especificaciones bajo `docs/specs/`.
- 2026-10-19: adopción del checkout del IDE indicado por el usuario.
- 2026-10-19: el usuario solicita el plan, limita el alcance al módulo backend, aplaza DB y pide ignorar `civicId`. Se actualiza el alcance y se prepara el plan enlazado.
