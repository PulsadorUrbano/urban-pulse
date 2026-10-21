# Backend agent guide

Applies to `backend/`. Run commands below from this directory unless stated otherwise. Read the relevant implementation and configuration before editing; keep this guide aligned with the repository when those facts change.

## Project map and current capabilities

- `src/main.ts`: HTTP bootstrap, Observe instrumentation, and `PORT` (default `3000`).
- `src/app.module.ts`: root module, global `ConfigModule`, Observe setup, health and incidents. Prisma is intentionally not imported during the temporary in-memory incident phase.
- `src/incidents/`: standalone incident module. `POST /incidents` accepts strict multipart fields plus temporary local images; `GET /incidents/:id` returns process-local data; `/uploads/` exposes the temporary image files.
- `src/app.controller.ts` / `src/app.service.ts`: `GET /` returns `Hello World!`; `GET /health` returns `{ "status": "ok" }`.
- `GET /categories`: returns the existing in-memory category catalog as an array of `{ id, name, createdAt }`, documented in Swagger.
- `src/**/*.spec.ts`: unit tests; `test/**/*.e2e-spec.ts`: HTTP integration tests.
- `../frontend-web/` and `../frontend-mobile/`: separate consumers of this API, currently starter applications.
- `../database/diagram.dbml`: proposed incident-reporting domain, including users, roles, incidents, assignments, location, and change history. It is a design reference, not an executable migration.
- `../docker-compose.yml`: PostgreSQL 16/PostGIS 3.5 and the backend. Compose publishes the API on port `4000` and keeps PostgreSQL internal.
- `docs/adr/`: decision placeholders; the files are currently empty and establish no implemented architecture.

The backend has a temporary unauthenticated incident API with local temporary uploads, but no active persistence, migration runner, authorization, or identity model. Prisma defines Incident, IncidentLocation and IncidentImage models and generates the types used by the in-memory incident aggregate. It is not active database persistence: do not instantiate PrismaClient or import PrismaModule into root startup for this temporary phase. Records use Date internally and ISO strings in API responses; all records are lost on restart. Generate the models with `npm exec -- prisma generate --config prisma7.config.ts`; no migration or database connection is required.

## Toolchain and commands

Use npm and the committed `package-lock.json`. `package.json` declares Node.js `>=22` and npm `>=10`; check the locked tools' engine requirements when choosing a concrete Node release. The current Dockerfile uses Node 20 and does not match the declared backend requirement.

```sh
npm ci
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

- `start:prod` requires a successful build and starts `dist/main`.
- Lint uses type-aware **Oxlint**, not ESLint. Preserve `.oxlintrc.json` and check async work for unhandled promises.
- Tests use **Vitest**, not Jest; `describe`, `it`, and `expect` are configured as globals. Use `vi` for Vitest mocks when needed.
- Unit discovery is `**/*.spec.ts`; e2e discovery is `**/*.e2e-spec.ts` using `vitest.config.e2e.ts`. Run only unit tests by default. Do not create or run e2e/integration unless explicitly requested.
- `npm run format` rewrites all source and test files. For a focused formatting check, use `npm exec -- prettier --check <changed-files>`; avoid unrelated formatting changes.
- There is no root npm workspace or root test command. Do not use frontend tooling inside the backend.

## TypeScript and Nest conventions

- Preserve ESM: `"type": "module"`, NodeNext module resolution, and `.js` suffixes on relative TypeScript imports. Do not introduce CommonJS `require`, extensionless relative imports, or new aliases without configuring build and tests together.
- Keep strict TypeScript checking, decorators, and emitted decorator metadata enabled. Production compilation excludes tests and writes application files directly to `dist/`.
- Keep controllers focused on HTTP contracts; put business behavior in injectable services with constructor injection. Register providers and imports explicitly in their owning modules.
- Add a feature module when implementing a real feature. Reuse existing code before introducing shared layers, repositories, interfaces, or new dependencies.
- Use Nest HTTP exceptions for expected request failures. Do not return stack traces or internal configuration to clients.
- Before changing version-sensitive framework or tool APIs, resolve the library with Context7 and query the relevant documentation. Prefer a version matching `package.json`/the lockfile; explicitly note missing version coverage. Static code review and business-logic analysis do not require a documentation lookup.

## Configuration and external services

- For direct local startup, copy `backend/.env.example` to `backend/.env`; never commit real credentials. Document new variables in the relevant example file and README.
- For Compose, run from the repository root with a root `.env` based on root `.env.example`. Root database variables and `backend/.env` serve different startup paths. Compose sets `PORT=4000` and `DATABASE_URL` explicitly.
- `DATABASE_URL` is supplied by Compose but is not consumed by the current root application. Starting PostgreSQL does not create the DBML tables.
- Observe is initialized unconditionally in `app.module.ts`, and production bootstrap passes `ObserveInstrument`. Blank example credentials do not establish an offline mode. Check the installed Observe API before changing enablement; isolate external telemetry in tests when necessary.
- Preserve `/health` as a lightweight liveness check. It currently proves neither database connectivity nor application readiness. Add a separate readiness contract if dependencies later require one.
- Do not log credentials, authorization headers, passwords, or personal incident/location data.
- Dont use npm install or pnpm install

## When implementing domain features

- Always create a feature specification in `docs/features/specs/` before implementation. Keep that same specification updated as requirements, decisions, API contracts, implementation status, and verification results change. Put refactor specifications in `docs/refactors/specs/` and bug-fix specifications in `docs/bugs/specs/`; keep implementation plans in the matching category's `plans/` directory.
- Use the specification as the source of truth for the feature. Clearly distinguish proposed behavior, approved decisions, open questions, and verified implementation; do not mark unresolved decisions or unrun checks as complete.

- Treat the DBML as a starting point. Confirm role permissions, incident transitions, assignment rules, identifiers, and nullability before encoding them; enum order is not a transition policy.
- Prisma is installed and supplies model types, but no database persistence is active. The Prisma incident schema is a temporary subset aligned with the current API, not the complete DBML. Introduce migrations and database access only in a separately requested persistence task.
- Validate request data at the HTTP boundary. TypeScript types alone do not validate JSON. Add server-side authentication and authorization before exposing protected user or incident operations; never trust client-supplied identity or role fields.
- The current incident endpoint requires UUID-format `civicId`, a category name, latitude/longitude, and optional non-negative accuracy. It resolves or creates temporary categories and accepts up to eight JPEG/PNG/WebP files of 5 MB each under `/uploads/`. It uses an in-memory `Map` plus local files, so data is lost at restart; do not add persistence or identity work without a separate approved scope.
- When adding password handling, store password hashes and exclude them from responses and logs.
- When implementing incident status or priority changes with audit history, commit the state update and history entry atomically and test rejection paths.
- Treat API changes as shared contracts for web and mobile. Document request/response shapes, status codes, and compatibility implications in the backend README.
- Generate a report in spanish about the feature implemmented

## Verification and completion

For backend runtime or dependency changes, run `npm run build`, `npm run lint`, and `npm test`. Do not create or run e2e/integration unless explicitly requested. Add focused regression coverage for changed behavior, including invalid input and permission failures where relevant. Do not weaken checks to make a change pass.

Use `Test.createTestingModule` for Nest unit tests and Supertest against an initialized application for HTTP tests. Close applications and resources in teardown. E2e tests construct their own application and do not execute `main.ts`; if adding global pipes, guards, prefixes, or other bootstrap behavior, ensure tests exercise the same configuration.

For documentation-only changes, verify paths, scripts, and claims against the actual repository and inspect the diff. Do not add tests that merely duplicate prose.

If changing deployment files, verify the declared Node requirements, both Docker stages, environment handling, and the production startup command together. There is currently no `.dockerignore`; exclude secrets and local dependencies before relying on `COPY . .` for a production image. Do not delete database volumes as a verification step.

Report checks actually run, their results, and any environment limitations. Separate pre-existing failures from regressions. Keep changes within the requested scope; do not silently fix unrelated frontend or schema issues.

## Incident model work and test policy

- Feature spec and plan: docs/spec/features/incidencia/spec.md and plan.md, as requested by the user. Keep them current for this feature.
- New or changed unit suites belong under test/<feature>/<role>/; the touched incident service suite is test/incidents/services/incidents.service.spec.ts. Existing untouched source suites remain legacy locations.
- Only create and run unit tests unless the user explicitly requests e2e or integration. Leave existing legacy e2e files in place.
- Frontend compatibility was inspected statically; do not describe that inspection as a verified connection. Frontend changes and live connection tests were excluded.
