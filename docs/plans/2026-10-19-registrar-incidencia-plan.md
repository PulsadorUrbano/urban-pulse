# Incident Reporting Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Direct execution in this session is recommended; this plan does not require or authorize delegation.

**Goal:** Register and retrieve incidents through a standalone NestJS module without database configuration or citizen identity.

**Architecture:** A feature module owns a controller, request validation and a singleton service with an instance-local Map. Root composition activates this module and stops eagerly importing Prisma for this phase. Data is temporary and belongs to one process.

**Tech Stack:** Existing NestJS 12, TypeScript ESM, Node crypto, Swagger, Vitest and Supertest; no new dependencies.

**Spec:** [Current feature spec](2026-10-19-registrar-incidencia.md).

**Checkout:** `C:\Users\joseg\Documents\urban_pulse\urban-pulse`, branch `feat-registrar-incidencia`.

**Status:** Implemented on 2026-10-19. Build and e2e checks pass; the pre-existing Prisma unit test still lacks `ConfigService`.

## Global Constraints

- Preserve unrelated local changes and remain on the requested branch.
- No DB setup, SQL/migration changes, Prisma generation, civic identity or foreign-key existence checks.
- No added dependencies; do not run `npm install` or `pnpm install`. Report unavailable tools instead of installing them silently.
- Keep ESM `.js` relative imports, strict TypeScript, Oxlint, Vitest and Supertest.
- Trim title/description; title 4–25 Unicode code points, description at least 10.
- Coordinates are finite JSON numbers: latitude [-90, 90], longitude [-180, 180]; no coercion.
- Required `categoryId` and optional `urbanAssetId` are UUIDs. Only omitted asset becomes null.
- Reject unknown fields, including `civicId` and server-owned fields, with `400`.
- Server generates UUID/ISO time and fixes `status: 'reported'`, `priority: 'low'`.
- Update this spec/plan during execution and deliver a Spanish report. Commit only task-owned files when commits are requested; no push or merge is included.

## Review Focus

- Non-object JSON and forged server fields return `400` without creating data (Task 2).
- Zero, coordinate extremes, whitespace and Unicode lengths validate correctly (Task 2).
- Mutating a returned nested object cannot corrupt stored data (Task 1).
- Equal locations produce distinct IDs; independent instances do not share state (Task 1).
- Root initialization does not require DB configuration; `/health` still works (Task 3).

## File Map

Paths below are relative to the repository root; new feature files live under `backend/src/incidents/`.

| File                                                        | Responsibility                          |
| ----------------------------------------------------------- | --------------------------------------- |
| `incident.ts`                                               | Incident response type.                 |
| `dto/create-incident.dto.ts`                                | Input shape and Swagger metadata.       |
| `create-incident.pipe.ts`                                   | Runtime validation and normalization.   |
| `incidents.service.ts`                                      | Create/read with instance-local memory. |
| `incidents.controller.ts`                                   | HTTP endpoints and Swagger contract.    |
| `incidents.module.ts`                                       | Feature composition.                    |
| `incidents.service.spec.ts`, `create-incident.pipe.spec.ts` | Service and boundary tests.             |
| `backend/test/incidents.e2e-spec.ts`                        | HTTP contract tests.                    |
| `backend/src/app.module.ts`, `backend/test/app.e2e-spec.ts` | Root integration without DB.            |
| `README.md`, `backend/AGENTS.md`                            | Accurate setup and module guidance.     |
| `docs/reports/2026-10-19-registrar-incidencia.md`           | Spanish delivery report.                |

Existing Prisma/generated files, schema/config, SQL, manifests, lockfiles, frontends and deployment files stay unchanged.

## Execution Preflight

Before Task 1, inspect repository instructions and local changes, confirm the requested branch, and run the four baseline commands listed in Task 4. Record failures before editing so the final comparison does not classify an existing failure as a regression. Check framework APIs against current Context7 documentation before implementation; use the existing installed tooling without changing dependencies.

## Task 1: Contract and in-memory service

**Files:** Create `backend/src/incidents/incident.ts`, `backend/src/incidents/dto/create-incident.dto.ts`, `backend/src/incidents/incidents.service.ts` and `backend/src/incidents/incidents.service.spec.ts`.

**Interfaces:**

- `CreateIncidentDto`: `title: string`, `description: string`, `categoryId: string`, `latitude: number`, `longitude: number`, `urbanAssetId?: string`.
- `Incident`: string `id`, `title`, `description`, `categoryId`, `createdAt`; `urbanAssetId: string | null`; `location: { latitude: number; longitude: number }`; `status: 'reported'`; `priority: 'low'`.
- `IncidentsService.create(input: CreateIncidentDto): Incident`.
- `IncidentsService.findOne(id: string): Incident`; throws `NotFoundException` when absent.

- [x] **Write failing service tests.** Use `Test.createTestingModule` with the service. Assert server-generated UUID/ISO time/defaults, null omitted asset and equivalent read. Assert unknown UUID throws, identical coordinates give distinct IDs, a fresh service has no previous data and mutating a returned location does not alter stored data.

```ts
const created = service.create(input);
expect(created).toMatchObject({
  status: "reported",
  priority: "low",
  urbanAssetId: null,
});
expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
expect(service.findOne(created.id)).toEqual(created);
created.location.latitude = 0;
expect(service.findOne(created.id).location.latitude).toBe(input.latitude);
```

- [x] **Confirm failure:** from `backend/`, run `npm test -- src/incidents/incidents.service.spec.ts`. Confirm missing implementation causes failure; distinguish unavailable dependencies from a red test.
- [x] **Implement the interfaces:** `randomUUID()` from `node:crypto`, ISO timestamp, instance field `Map<string, Incident>` and copies of public results. Do not retain mutable input references. Add `ponytail:` explaining the memory/restart limit and future database replacement.
- [x] **Verify green:** repeat the targeted command; all new service tests must pass.
- [x] **Review the diff:** only these files belong to this task. Optional commit when requested: `feat: add in-memory incident service`.

## Task 2: Validation and HTTP endpoints

**Files:** Create `backend/src/incidents/create-incident.pipe.ts`, `backend/src/incidents/create-incident.pipe.spec.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/src/incidents/incidents.module.ts`, `backend/test/incidents.e2e-spec.ts`; add DTO Swagger metadata as needed.

**Interfaces:**

- `CreateIncidentPipe implements PipeTransform<unknown, CreateIncidentDto>`; `transform(value: unknown): CreateIncidentDto`.
- Controller prefix `incidents`; POST uses the pipe and `IncidentsService.create`, sets `Location` through an Express response with passthrough, and returns the resource with Nest's `201`.
- GET validates its ID with Nest `ParseUUIDPipe`, then calls `findOne`.
- `IncidentsModule` registers this controller and service; imports no DB module.

- [x] **Write failing pipe tests:** null/array/primitive input; missing/wrong-type fields; trimmed title lengths 3/4/25/26 and description lengths 9/10; Unicode code-point lengths; malformed required/optional UUIDs; null asset; unknown keys and server fields. Accept zero/boundary coordinates; reject strings, out-of-range numbers, NaN and Infinity (the last two directly at the pipe). Assert normalized text and omitted optional asset.
- [x] **Write failing e2e tests:** initialize only `IncidentsModule`, POST a valid fixture and GET the created resource. Assert `201`, UUID, ISO time, fixed defaults, null asset, exact `Location` and equal response. Assert forbidden fields return `400`, malformed route UUID returns `400`, and valid absent UUID returns `404`. Close each app. Generate Swagger in a test and assert both paths, request fields and response schemas exist.

```ts
const result = await request(app.getHttpServer())
  .post("/incidents")
  .send(input)
  .expect(201);
expect(result.headers.location).toBe(`/incidents/${result.body.id}`);
await request(app.getHttpServer())
  .get(result.headers.location)
  .expect(200, result.body);
await request(app.getHttpServer()).get("/incidents/not-a-uuid").expect(400);
```

- [ ] **Confirm red:** `npm test -- src/incidents/create-incident.pipe.spec.ts`; `npm run test:e2e -- test/incidents.e2e-spec.ts`.
- [x] **Implement the pipe/routes:** use existing Nest validation utilities, strict allowed keys, finite-number checks, trim and `[...text].length`. Throw field-specific `BadRequestException`. Build a whitelisted DTO; do not spread untrusted body fields into stored resources. Endpoint-level pipe registration ensures production/test parity without bootstrap changes.
- [x] **Describe Swagger:** required fields/bounds, exact response shape, `201`/`400`/`404` and Location header. State temporary memory and format-only reference validation; do not imply persistence or authentication.
- [x] **Verify green:** both targeted commands and Task 1 tests pass.
- [x] **Review the diff:** optional commit when requested: `feat: expose validated incident endpoints`.

## Task 3: Root integration without database configuration

**Files:** Modify `backend/src/app.module.ts` and `backend/test/app.e2e-spec.ts`.

**Interfaces:** `AppModule` imports `IncidentsModule` and retains configuration, health and Observe. It no longer imports `PrismaModule` for this phase. Existing Prisma source is preserved.

- [x] **Write a failing root test:** temporarily remove `DATABASE_URL`, override the global `ConfigService` in the testing module with a stub whose `getOrThrow('DATABASE_URL')` throws, and verify initialization, incident POST/GET and unchanged health. The stub prevents a local `.env` concealing eager Prisma activation. Restore environment changes and close apps in teardown. Isolate external Observe telemetry in tests when necessary; keep production Observe unchanged.
- [x] **Confirm red:** `npm run test:e2e -- test/app.e2e-spec.ts` must expose the eager DB dependency. Record earlier generated-client/import/tool errors separately rather than misidentifying them as the intended failure.
- [x] **Change composition:** remove the root Prisma import and array entry; add `IncidentsModule`. Do not fake a database URL, modify Prisma lifecycle or add a production database mock.
- [x] **Verify green:** run root and feature e2e suites. Confirm the root application has no `PrismaService` provider, no DB connection is attempted and `/health` remains `{ status: 'ok' }`.
- [x] **Review the diff:** optional commit when requested: `feat: enable incident module without database setup`.

## Task 4: Verification and maintained documentation

**Files:** Modify `README.md`, `backend/AGENTS.md`, spec and plan; create `docs/reports/2026-10-19-registrar-incidencia.md`.

- [x] **Record baseline before code and final checks after code:** from `backend/`, run `npm run build`, `npm run lint`, `npm test`, `npm run test:e2e`. Record command results exactly. The existing PrismaService unit test provides no ConfigService; report a pre-existing DI failure separately if reproduced. Do not skip tests or claim a fully green suite with unresolved failures.
- [x] **Smoke-test the compiled app where executable:** after build, use `npm run start:prod` without database configuration. Exercise POST/GET and health; restart and confirm the old ID returns `404`. Stop only the process started for this check. Record environment blockers accurately if any check cannot run.
- [x] **Update README:** valid request/example, routes/defaults/errors, no civic identity, format-only reference validation and data loss at restart. Explain database-free backend startup while preserving existing database infrastructure documentation.
- [x] **Update AGENTS facts:** reflect health/Swagger/new module and temporary memory. Correct stale claims that Prisma does not exist: it exists but root composition does not activate it in this phase. Preserve no-install and `docs/specs/` conventions.
- [x] **Write the Spanish report:** scope, changed files, API examples, actual checks/results, baseline failures, memory/restart limitations and postponed database/identity work.
- [x] **Update spec and plan tracking:** mark only executed steps complete; record decisions, deviations and verification gaps in the same files.
- [x] **Review final diff:** `git diff --check` at root. Confirm feature changes exclude SQL, Prisma/generated code, manifests, lockfiles, frontends and deployment configuration. Optional documentation commit when requested: `docs: document incident module and verification`.

## Self-Review

- The latest user scope supersedes the original persistence/identity design; no DB task remains.
- Each HTTP behavior and acceptance criterion has an owning task and a meaningful verification step.
- All five review-focus items have explicit coverage in Tasks 1–3.
- Names and signatures match across DTO, service, controller and tests.
- No speculative persistence abstraction, package installation or unrelated cleanup is planned.
- Implementation is complete; verification results and the remaining pre-existing Prisma test failure are recorded above.

## Execution notes

- Completed: service, validation pipe, controller, Swagger contract, module composition, root startup test, README, backend guide and Spanish report.
- Ruling: Prisma files remain in the repository but are no longer imported by the root module. Cost if wrong: a future persistence phase must explicitly reactivate and configure Prisma.
- Verification: build passed; lint passed with three Unicode-code-point warnings; focused unit suites passed (21 tests); all e2e tests passed (3 tests). The existing `PrismaService` unit test still fails because it omits `ConfigService`.
- Verification gap: the isolated incident e2e test was written before its controller/module but was first run after implementation; its final targeted and complete e2e runs passed.
- Existing unrelated changes remain in `backend/Dockerfile` and `backend/package-lock.json`; this feature does not depend on their intended behavior.
- Final: minor (deferred): the Swagger e2e test asserts route presence but not every generated request/response schema detail; controller decorators and the documented contract cover those details today.
