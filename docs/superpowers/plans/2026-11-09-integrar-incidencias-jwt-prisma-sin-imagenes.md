# Incidencias JWT y Prisma sin imágenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver la PR 113 conservando su contrato JWT, migrando las operaciones de incidencias a Prisma asíncrono y eliminando el almacenamiento local y Cloudinary sin romper todavía el campo de respuesta `images`.

**Architecture:** `IncidentsController` conserva las rutas y permisos de la PR 113 y delega en un `IncidentsService` asíncrono respaldado exclusivamente por `PrismaService`. No habrá servicio de archivos ni proveedor remoto; Prisma no tendrá relación de imágenes y el serializador devolverá siempre `images: []` como compatibilidad temporal.

**Tech Stack:** NestJS 12, TypeScript estricto, Prisma 7, PostgreSQL, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md`

## Global Constraints

- No modificar login, emisión de JWT ni su formato.
- El actor y el ciudadano proceden exclusivamente del usuario autenticado; ningún cuerpo o query puede elegirlos.
- No aceptar, ignorar ni almacenar imágenes.
- Mantener `images: []` en cada respuesta de incidencia y documentarlo como deuda técnica.
- No añadir proveedor, interfaz o abstracción de almacenamiento sustituta.
- Conservar Prisma asíncrono, transacciones e historial persistente.
- Retirar los endpoints de asignación y de descarga de imágenes conforme al controller de la PR 113.

## Review Focus

- Un ciudadano intenta leer una incidencia ajena: debe recibir 404 sin revelar que existe; se prueba en Task 3.
- Un usuario autenticado sin ciudadano vinculado intenta listar o crear: debe recibir 403; se prueba en Task 3.
- Un cliente envía `images` o multipart a `POST /incidents`: debe rechazarse, nunca ignorarse; se prueba en Task 3.
- Falla una transacción Prisma al cambiar estado o prioridad: no debe quedar historial parcial; se prueba en Task 4.
- Una incidencia antigua conserva filas de imagen antes de migrar: la migración debe eliminar la tabla y el contrato debe responder `images: []`; se prueba estáticamente y en Task 2.

---

### Task 1: Integrar `dev` como línea base

**Files:**
- Resolve with `origin/dev`: `README.md`
- Resolve with `origin/dev`: `backend/docs/spec/endpoint/get-incidents-id/README.md`
- Resolve with `origin/dev`: `backend/docs/spec/endpoint/get-incidents/README.md`
- Resolve with `origin/dev`: `backend/docs/spec/endpoint/patch-incidents-id-priority/README.md`
- Resolve with `origin/dev`: `backend/docs/spec/endpoint/patch-incidents-id-status/README.md`
- Resolve with `origin/dev`: `backend/docs/spec/endpoint/post-incidents/README.md`
- Resolve with `origin/dev`: `backend/src/incidents/incidents.controller.ts`
- Resolve with `origin/dev`: `backend/src/incidents/incidents.module.ts`
- Resolve with `origin/dev`: `backend/src/incidents/incidents.service.ts`
- Resolve with `origin/dev`: `backend/src/incidents/upload-storage.service.ts`
- Resolve with `origin/dev`: five conflicted tests under `backend/test/incidents/`
- Resolve with `origin/dev`: `docs/deployment.md`
- Resolve with `origin/dev`: `docs/development.md`

**Interfaces:**
- Consumes: `origin/dev` en `cee0ad3` o posterior, sin cambios remotos concurrentes no revisados.
- Produces: un merge confirmado cuya base funcional es Prisma/asignaciones de `dev`, mientras los archivos de auth/JWT no conflictivos de la PR permanecen presentes.

- [ ] **Step 1: Fusionar `origin/dev` sin confirmar automáticamente**

Run: `git merge --no-commit origin/dev`
Expected: los 17 conflictos ya inventariados.

- [ ] **Step 2: Resolver los 17 conflictos con la versión de `origin/dev`**

Esta resolución es deliberadamente mecánica: deja una línea base compilable antes de portar el controller de la PR. No elegir `theirs` para archivos no conflictivos ni descartar los archivos de autenticación de la PR.

- [ ] **Step 3: Confirmar el merge de integración**

Run: `git add <los 17 archivos> && git commit`
Expected: merge commit con `origin/dev` como segundo padre.

- [ ] **Step 4: Verificar la línea base**

Run: `pnpm run build && pnpm test`
Expected: PASS con el comportamiento de incidencias de `dev`; esta prueba separa fallos previos de los introducidos por Tasks 2–4.

### Task 2: Retirar la persistencia de imágenes

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261109000000_retirar_imagenes/migration.sql`
- Modify: `backend/src/incidents/incident.ts`
- Modify: `backend/src/incidents/incidents.module.ts`
- Modify: `backend/src/incidents/incidents.service.ts`
- Delete: `backend/src/incidents/cloudinary.service.ts`
- Delete: `backend/src/incidents/upload-storage.service.ts`
- Delete: `backend/src/incidents/upload-storage.service.spec.ts`
- Delete: `backend/test/incidents/services/cloudinary.service.spec.ts`
- Delete: `backend/test/incidents/services/upload-storage.service.spec.ts`
- Test: `backend/test/incidents/services/incidents.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` y los modelos Prisma de incidencia, ubicación e historiales incorporados desde `origin/dev`.
- Produces: `IncidentsService.create(input: CreateIncidentInput): Promise<Incident>` y `Incident.images: []` con serialización pública siempre vacía.

- [ ] **Step 1: Escribir la prueba fallida del contrato sin imágenes**

En `backend/test/incidents/services/incidents.service.spec.ts`, crear/ajustar casos que construyan el servicio solo con el fake de Prisma, llamen `create(input)` sin archivos y comprueben que Prisma no recibe escrituras de imágenes y que la respuesta contiene `images: []`.

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `pnpm test -- test/incidents/services/incidents.service.spec.ts`
Expected: FAIL porque el servicio aún requiere `UploadStorageService` o intenta incluir imágenes.

- [ ] **Step 3: Retirar el modelo y servicios de imágenes**

Eliminar `IncidentImage` y `Incident.images` del schema; añadir `DROP TABLE "IncidentImage"` en la migración hacia delante; eliminar helpers y tipos de imagen internos, pero declarar `Incident.images` como el array vacío `[]`; registrar únicamente `PrismaService` y las guardas JWT necesarias en el módulo.

- [ ] **Step 4: Adaptar creación y serialización**

Implementar `create(input: CreateIncidentInput): Promise<Incident>` mediante transacción Prisma de incidencia y ubicación, sin parámetros de archivos, compensaciones remotas ni includes de imágenes. `serializar(...)` debe asignar literalmente `images: []`.

- [ ] **Step 5: Ejecutar prueba y generación Prisma**

Run: `pnpm exec prisma generate --config prisma7.config.ts && pnpm test -- test/incidents/services/incidents.service.spec.ts`
Expected: PASS y cliente generado sin `IncidentImage`.

- [ ] **Step 6: Commit**

Run: `git add backend/prisma backend/src/incidents backend/test/incidents/services && git commit -m "refactor(backend): retirar almacenamiento de imágenes"`

### Task 3: Aplicar el controller JWT de la PR a Prisma asíncrono

**Files:**
- Modify: `backend/src/incidents/incidents.controller.ts`
- Modify: `backend/src/incidents/create-incident.pipe.ts`
- Modify: `backend/src/incidents/incidents.module.ts`
- Delete: `backend/src/incidents/controllers/uploads.controller.ts`
- Delete: `backend/test/incidents/controllers/uploads.controller.spec.ts`
- Delete: `backend/src/incidents/asignar-incidencia.pipe.ts`
- Delete: `backend/src/incidents/guards/acceso-asignaciones.guard.ts`
- Delete: `backend/test/incidents/pipes/asignar-incidencia.pipe.spec.ts`
- Delete: `backend/test/incidents/guards/acceso-asignaciones.guard.spec.ts`
- Delete: `backend/test/incidents/services/asignar-incidencia.service.spec.ts`
- Test: `backend/test/incidents/controllers/incidents.controller.spec.ts`
- Test: `backend/test/incidents/guards/acceso-incidencias.guard.spec.ts`

**Interfaces:**
- Consumes: métodos asíncronos de `IncidentsService` y `UsuarioIncidenciasActual` de la PR 113.
- Produces: las cinco rutas de incidencias descritas en el diseño, todas protegidas por `JwtAuthGuard` y `AccesoIncidenciasGuard`.

- [ ] **Step 1: Escribir pruebas fallidas del contrato HTTP**

Cubrir: listado sin `civicId`; creación JSON que toma `civicId` del usuario; 403 sin ciudadano vinculado; 404 al leer incidencia ajena; cuerpos de estado/prioridad sin `civicId`; rechazo de propiedad `images`; ausencia de rutas de uploads y asignaciones en los metadatos del controller.

- [ ] **Step 2: Ejecutar las pruebas y confirmar el fallo**

Run: `pnpm test -- test/incidents/controllers/incidents.controller.spec.ts test/incidents/guards/acceso-incidencias.guard.spec.ts`
Expected: FAIL por firmas síncronas/multipart, rutas adicionales o falta de autorización integrada.

- [ ] **Step 3: Resolver el controller con el contrato de la PR**

Mantener `GET /incidents`, `POST /incidents`, `GET /incidents/:id`, `PATCH /incidents/:id/status` y `PATCH /incidents/:id/priority`; convertir retornos a `Promise`; eliminar `FilesInterceptor`, `UploadedFiles`, filtros MIME, multipart, rutas, métodos, tipos y pruebas de asignación, y uploads; documentar Swagger con JSON y `images` solo en respuesta.

- [ ] **Step 4: Ejecutar las pruebas del controller**

Run: `pnpm test -- test/incidents/controllers/incidents.controller.spec.ts test/incidents/guards/acceso-incidencias.guard.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/src/incidents backend/test/incidents && git commit -m "feat(backend): proteger incidencias Prisma con JWT"`

### Task 4: Persistir actor, propiedad e historiales de forma atómica

**Files:**
- Modify: `backend/src/incidents/incidents.service.ts`
- Modify: `backend/src/incidents/cambiar-estado-incidencia.pipe.ts`
- Modify: `backend/src/incidents/cambiar-prioridad-incidencia.pipe.ts`
- Modify: `backend/test/incidents/services/cambiar-estado-incidencia.service.spec.ts`
- Modify: `backend/test/incidents/services/cambiar-prioridad-incidencia.service.spec.ts`
- Modify: `backend/test/incidents/services/listar-incidencias.service.spec.ts`
- Modify: `backend/test/incidents/services/prisma-incidencias.fake.ts`

**Interfaces:**
- Consumes: `UsuarioIncidencias`, `PrismaService` y pipes sin `civicId` en el cuerpo.
- Produces: `findOne(id: string, usuario: UsuarioIncidencias): Promise<Incident>`, `cambiarEstado(id, entrada, idActor): Promise<Incident>` y `cambiarPrioridad(id, entrada, idActor): Promise<Incident>`.

- [ ] **Step 1: Escribir pruebas fallidas de autorización y atomicidad**

Comprobar actor JWT persistido, ciudadano propietario, 404 para propiedad ajena, roles de operador, ausencia de `civicId` en inputs y rollback lógico cuando falla la creación del historial dentro de la transacción.

- [ ] **Step 2: Ejecutar las pruebas y confirmar el fallo**

Run: `pnpm test -- test/incidents/services/cambiar-estado-incidencia.service.spec.ts test/incidents/services/cambiar-prioridad-incidencia.service.spec.ts test/incidents/services/listar-incidencias.service.spec.ts`
Expected: FAIL porque el servicio de `dev` toma actor del cuerpo y no aplica propiedad JWT.

- [ ] **Step 3: Implementar firmas y transacciones objetivo**

Pasar `idActor` por separado a estado/prioridad; usarlo en `CambioEstado.actorId` y `CambioPrioridad.actorId`; aplicar propiedad en `findOne`; conservar las transacciones, errores de persistencia y ordenación de `dev`.

- [ ] **Step 4: Ejecutar todas las pruebas de incidencias**

Run: `pnpm test -- test/incidents`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add backend/src/incidents backend/test/incidents && git commit -m "feat(backend): persistir auditoría de incidencias autenticada"`

### Task 5: Actualizar documentación y configuración

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/README.md`
- Modify: `backend/AGENTS.md`
- Modify: `backend/docs/spec/endpoint/README.md`
- Modify: `backend/docs/spec/endpoint/get-incidents/README.md`
- Modify: `backend/docs/spec/endpoint/get-incidents-id/README.md`
- Modify: `backend/docs/spec/endpoint/post-incidents/README.md`
- Modify: `backend/docs/spec/endpoint/patch-incidents-id-status/README.md`
- Modify: `backend/docs/spec/endpoint/patch-incidents-id-priority/README.md`
- Delete: `backend/docs/spec/endpoint/get-uploads-incidents-id-archivo/README.md`
- Delete: `backend/docs/spec/endpoint/get-incidents-assignment-options/README.md`
- Delete: `backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md`
- Modify: `backend/docs/spec/features/specs/2026-11-01-imagenes-cloudinary-spec.md`
- Modify: `backend/docs/spec/features/plans/2026-11-01-imagenes-cloudinary-plan.md`
- Modify: `docs/deployment.md`
- Modify: `docs/development.md`

**Interfaces:**
- Consumes: contrato HTTP y comportamiento final verificados en Tasks 2–4.
- Produces: documentación completa y coherente, sin presentar imágenes, Cloudinary, almacenamiento local ni asignaciones como activos.

- [ ] **Step 1: Actualizar catálogo y fichas de endpoints**

Documentar método/ruta, JWT, roles, identidad, entrada JSON, respuestas con `images: []`, errores 400/401/403/404/409/503, persistencia Prisma y límites. Retirar fichas de rutas eliminadas.

- [ ] **Step 2: Registrar retirada y deuda técnica**

Marcar los documentos históricos de Cloudinary como retirados el 2026-11-09 y enlazar el diseño aprobado; documentar que `images: []` se mantiene solo hasta migrar los frontends.

- [ ] **Step 3: Limpiar configuración**

Eliminar variables `CLOUDINARY_*`, referencias a uploads locales y afirmaciones de multipart; mantener configuración real de Prisma, JWT, pnpm y puertos.

- [ ] **Step 4: Verificar texto y referencias**

Run: `git diff --check && rg -n -i "cloudinary|UPLOADS_DIRECTORY|multipart/form-data|GET /uploads|assignment-options|/assignment" backend docs`
Expected: solo documentos históricos marcados como retirados y migraciones históricas; ninguna referencia los presenta como funcionalidad activa.

- [ ] **Step 5: Commit**

Run: `git add backend docs && git commit -m "docs: documentar incidencias Prisma sin imágenes"`

### Task 6: Verificación integral y actualización de la PR

**Files:**
- Verify only: repository and PR 113.

**Interfaces:**
- Consumes: Tasks 1–5 completas.
- Produces: rama limpia, comprobada y publicada en `feature-login`.

- [ ] **Step 1: Ejecutar comprobaciones completas**

Run: `pnpm run build && pnpm run lint && pnpm test`
Expected: build y pruebas con exit 0; lint sin errores.

- [ ] **Step 2: Comprobar el merge y el alcance**

Run: `git diff --check && git status --short && git merge-tree --write-tree HEAD origin/dev`
Expected: árbol limpio, sin cambios sin confirmar y merge sin conflictos porque `origin/dev` ya es ancestro.

- [ ] **Step 3: Auditar imágenes y JWT**

Run: `rg -n -i "cloudinary|UploadStorageService|FilesInterceptor|UploadedFiles" backend/src backend/test backend/.env.example`
Expected: sin coincidencias; las pruebas de auth/JWT permanecen y pasan.

- [ ] **Step 4: Publicar con protección de concurrencia**

Actualizar `feature-login` con `--force-with-lease` solo si el remoto continúa en el SHA esperado y ajustar la descripción de la PR 113 al contrato final.
