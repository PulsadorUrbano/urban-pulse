# Incidencias con ubicación, categorías e imágenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the temporary incident API with civic identity, category resolution, precise locations, and local image uploads.

**Architecture:** `IncidentsModule` keeps in-memory incidents and categories, while a small upload-storage service writes accepted image buffers below `backend/uploads/incidents/<incident-id>/`. The controller accepts `multipart/form-data`, validates text fields and files at the HTTP boundary, then delegates a single create operation that persists files before exposing the incident in memory. `main.ts` serves the temporary upload directory under `/uploads`.

**Tech Stack:** NestJS 12 / Express platform, built-in Multer integration from `@nestjs/platform-express`, TypeScript ESM, Node `fs/promises`, Vitest, Supertest, Swagger.

**Spec:** [Feature specification](../specs/2026-10-19-incidencias-ubicacion-categorias-imagenes.md)

## Global Constraints

- Keep the feature temporary: categories and incident records are instance-local memory; uploaded files are local and non-durable.
- Accept `multipart/form-data`; do not add a package because `@nestjs/platform-express@12.1.2` already includes Multer 2.4.0.
- Require UUID-format `civicId`; do not implement authentication, authorization, or citizen lookup.
- Replace input `categoryId` with required `categoryName`, matched after trim and lowercasing against seeded categories; create a category if unmatched.
- Keep title at 4–25 Unicode code points; make description optional and, if present, at least 10 code points after trim.
- Validate form latitude/longitude as finite values in [-90, 90] and [-180, 180]; optional accuracy is finite and >= 0.
- Permit only 0–5 JPEG, PNG, or WebP images, each at most 5 MB; reject invalid fields and clean up files if persistence fails.
- Preserve ESM `.js` imports, strict TypeScript, existing unrelated working-tree changes, and the `feat-registrar-incidencia` branch.

## Review Focus

- A category name differing only by whitespace/case must reuse the seed category rather than create a duplicate (Task 1 test).
- A valid multipart request with no description and no images must create an incident with `description: null` and `images: []` (Task 2 e2e).
- Form values such as `NaN`, `Infinity`, an empty accuracy, or an invalid UUID must return `400` without writing files or storing an incident (Task 2 tests).
- A sixth image, a file over 5 MB, or an unsupported MIME type must return `400` and leave no incident directory (Task 2 e2e).
- If local storage fails after an incident ID is allocated, already-written files must be removed and the incident must not be retrievable (Task 1 unit test).

## File Map

| File | Responsibility |
| --- | --- |
| `backend/src/incidents/category.ts` | Category response type and normalized-name helper. |
| `backend/src/incidents/incident.ts` | Expanded incident, location, and image types. |
| `backend/src/incidents/categories.service.ts` | Seeded category catalog and create-or-reuse lookup. |
| `backend/src/incidents/upload-storage.service.ts` | Local image persistence and cleanup. |
| `backend/src/incidents/create-incident.dto.ts` | Multipart input shape and Swagger metadata. |
| `backend/src/incidents/create-incident.pipe.ts` | Controlled multipart field parsing and validation. |
| `backend/src/incidents/incidents.service.ts` | Coordinates category resolution, file save/cleanup, and in-memory incident creation. |
| `backend/src/incidents/incidents.controller.ts` | Multipart endpoint, file interceptor, HTTP/Swagger contract. |
| `backend/src/incidents/incidents.module.ts` | Registers categories and storage services. |
| `backend/src/main.ts` | Serves `backend/uploads` at `/uploads`. |
| `backend/src/incidents/*.spec.ts` | Unit coverage for category, parsing, storage orchestration, and cleanup. |
| `backend/test/incidents.e2e-spec.ts` | Multipart API, limits, returned URLs, and static serving. |
| `README.md`, `backend/AGENTS.md`, spec, report | Current contract and actual verification record. |

### Task 1: Domain, categories, and atomic local storage

**Files:**
- Create: `backend/src/incidents/category.ts`, `backend/src/incidents/categories.service.ts`, `backend/src/incidents/upload-storage.service.ts`, `backend/src/incidents/categories.service.spec.ts`.
- Modify: `backend/src/incidents/incident.ts`, `backend/src/incidents/incidents.service.ts`, `backend/src/incidents/incidents.service.spec.ts`, `backend/src/incidents/incidents.module.ts`.

**Interfaces:**

- `Category { id: string; name: string; createdAt: string }` and `normalizeCategoryName(name: string): string`.
- `CategoriesService.resolve(name: string): Category` seeds `Iluminación`, `Limpieza`, `Vía pública`, `Movilidad`, `Zonas verdes` and creates unmatched normalized names.
- `UploadStorageService.save(incidentId: string, files: Express.Multer.File[]): Promise<IncidentImage[]>`; `remove(incidentId: string): Promise<void>`.
- `IncidentsService.create(input: CreateIncidentInput, files: Express.Multer.File[]): Promise<Incident>` stores only after upload success; `Incident` contains nullable `description`, `civicId`, `category`, `location`, and `images`.

- [ ] **Step 1: Write failing category/service tests.** Assert seeded category reuse for ` iluminación `, a new category for `Señalización`, nullable description, server-generated location timestamps, and no leaked incident/files when a stubbed `save` rejects.

```ts
expect(categories.resolve(' iluminación ')).toEqual(categories.resolve('ILUMINACIÓN'));
await expect(service.create(input, [])).resolves.toMatchObject({ description: null });
await expect(service.create(input, [])).rejects.toThrow('disk unavailable');
expect(() => service.findOne(reservedId)).toThrow(NotFoundException);
```

- [ ] **Step 2: Confirm red.**

Run: `npm test -- src/incidents/categories.service.spec.ts src/incidents/incidents.service.spec.ts`

Expected: FAIL because category and upload-storage services/interfaces do not exist.

- [ ] **Step 3: Implement the category catalog, expanded types, upload-storage service, and orchestration.**

Use `fs/promises.mkdir`, `writeFile`, and `rm` under one incident-specific directory. Generate safe storage names from UUID plus a MIME-derived extension; never use client filenames as paths. On failure, `remove(incidentId)` before rethrowing; only then set the incident in the Map.

- [ ] **Step 4: Verify Task 1 green.**

Run: `npm test -- src/incidents/categories.service.spec.ts src/incidents/incidents.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1.**

```bash
git add backend/src/incidents
git commit -m "feat: add temporary incident categories and image storage"
```

### Task 2: Multipart request boundary and public endpoints

**Files:**
- Modify: `backend/src/incidents/create-incident.dto.ts`, `backend/src/incidents/create-incident.pipe.ts`, `backend/src/incidents/create-incident.pipe.spec.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/test/incidents.e2e-spec.ts`, `backend/src/main.ts`.

**Interfaces:**

- `CreateIncidentPipe.transform(value: unknown): CreateIncidentInput` accepts Multer text-field values, converts the three numeric fields explicitly, and returns no unknown keys.
- `POST /incidents` uses `FilesInterceptor('images', 5, options)` and `@UploadedFiles() files: Express.Multer.File[]`; it returns `Promise<Incident>`.
- `main.ts` exposes `<backend>/uploads` as `/uploads` using the Express Nest application API.

- [ ] **Step 1: Write failing pipe and multipart e2e tests.** Cover required `civicId`/`categoryName`, optional description and accuracy, text-number conversion, invalid fields, seed reuse/new category, image URL response, and no-image creation.

```ts
await request(app.getHttpServer())
  .post('/incidents')
  .field(validFields({ description: undefined, categoryName: ' iluminación ' }))
  .attach('images', pngBuffer, { filename: 'lamp.png', contentType: 'image/png' })
  .expect(201);
```

- [ ] **Step 2: Add limit/error tests before implementation.** Assert a sixth file, 5 MB + 1 byte file, invalid MIME type, `accuracy: '-1'`, `latitude: 'NaN'`, and a forged server field return `400`; assert the upload directory for the failed request is absent.

- [ ] **Step 3: Confirm red.**

Run: `npm test -- src/incidents/create-incident.pipe.spec.ts`

Run: `npm run test:e2e -- test/incidents.e2e-spec.ts`

Expected: FAIL because the existing JSON-only DTO, pipe, and controller neither accept multipart fields nor files.

- [ ] **Step 4: Implement strict multipart validation and routes.**

Use Multer memory storage, `fileSize: 5 * 1024 * 1024`, max count 5, and exact JPEG/PNG/WebP MIME filter. Translate Multer limit/filter errors to `400`, do not accept additional file fields, and set `Location` only after successful creation. Preserve only enough existing Swagger metadata for the routes; Task 3 owns the expanded schema.

- [ ] **Step 5: Configure static files in `main.ts`.**

Use an absolute uploads path derived from the backend process directory; expose it only at `/uploads`. Add the same static configuration to e2e setup before testing a returned URL with `GET`.

- [ ] **Step 6: Verify Task 2 green.**

Run: `npm test -- src/incidents/create-incident.pipe.spec.ts src/incidents/incidents.service.spec.ts`

Run: `npm run test:e2e -- test/incidents.e2e-spec.ts`

Expected: PASS, including static image retrieval and cleanup assertions.

- [ ] **Step 7: Commit Task 2.**

```bash
git add backend/src/incidents backend/src/main.ts backend/test/incidents.e2e-spec.ts
git commit -m "feat: accept incident locations and local images"
```

### Task 3: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`, `backend/AGENTS.md`, `backend/docs/features/specs/2026-10-19-incidencias-ubicacion-categorias-imagenes.md`, `backend/docs/reports/2026-10-19-registrar-incidencia.md`.

- [ ] **Step 1: Write the documentation expectations as an e2e Swagger assertion.** Assert the generated schema declares `multipart/form-data`, `civicId`, `categoryName`, location fields, binary `images`, and response location/category/images properties.

- [ ] **Step 2: Confirm red.**

Run: `npm run test:e2e -- test/incidents.e2e-spec.ts`

Expected: FAIL until Swagger documents the expanded multipart contract.

- [ ] **Step 3: Update Swagger and documentation.**

Document the `multipart/form-data` request with binary `images`, `civicId`, `categoryName`, latitude/longitude/accuracy, and the expanded response schema. Document seed/match/create category behavior, local temporary uploads, exact limits, no authentication, format-only civic/asset validation, and loss of records/files at restart. Update the Spanish report with actual commands and results; do not claim a full green suite if an existing Prisma test remains red.

- [ ] **Step 4: Run final verification.**

Run from `backend/`:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Expected: build, lint, focused feature tests, and e2e pass. Record the pre-existing `PrismaService` test failure separately if it persists.

- [ ] **Step 5: Smoke test the compiled backend.**

Start `npm run start:prod`, submit one multipart incident, fetch its returned image URL, restart the process, then verify the incident URL returns `404`. Stop only the test process and remove test upload artifacts.

- [ ] **Step 6: Review and commit documentation.**

Run: `git diff --check`

Confirm no Prisma schema/generated code, database migrations, frontends, or deployment files were changed. Commit only task-owned files:

```bash
git add README.md backend/AGENTS.md backend/docs/features backend/docs/reports
git commit -m "docs: document temporary incident uploads"
```

## Plan Self-Review

- The three tasks cover every accepted requirement: civic ID, optional description, category matching/creation, location accuracy/time, local image uploads, static URLs, validation, cleanup, Swagger and documentation.
- Task 2 consumes Task 1 signatures exactly; Task 3 consumes the multipart endpoint and generated Swagger document from Task 2.
- No persistence, cloud storage, identity lookup, new upload package, frontend work, or schema changes are included.
- Review-focus inputs each have an explicit owning test in Tasks 1–2.
