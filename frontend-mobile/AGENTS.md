# Project Overview: UrbanPulse (frontend-mobile)

## Context

**UrbanPulse** is a university project designed to streamline urban incident reporting and management. While the overall platform allows citizens to report incidents across the city and city hall staff to manage and resolve them, this **mobile application is strictly citizen-facing for its initial scope**.

### Scope & Constraints

- **Target Audience:** Citizens / General public only.
- **Out of Scope:** City council/staff management dashboards, triage tools, or administrative flows (these belong strictly to the web or backend services).
- **Core Mobile Capabilities:** Creating new incident reports with location/media and tracking personal report status.
- **Mocked Data via json-server:** Do not attempt to connect to or read live NestJS backend endpoints yet. All API interaction and integration testing must rely strictly on local mock data (e.g., using `json-server`).


---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Tech Stack

- **Platform:** React Native + Expo (SDK target specified in `package.json`)
- **Language:** TypeScript (Strict mode, zero `any`)
- **Routing:** Expo Router (File-based navigation)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State & Data Fetching:** Local mock server (`json-server`) via `db.json`

## Overall Architecture Context

- **Language:** TypeScript
- **Mobile Frontend Framework:** React Native + Expo // NativeWind
- **Web Frontend Framework:** React
- **Backend Framework:** NestJS
- **Database:** PostgreSQL

---

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

---

## Commands

### For Front-end

Run all commands from `urbanPulse/frontend-mobile/`

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
# Package management (ALWAYS use expo install for native compatibility)

npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions. Use bunx if bun.lock exists
npm run start               # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

### For running Backend+DB
 
To spin up backend services and database for testing only for explicitly needed by user:

```bash
docker compose -f ../docker-compose.yml up -d
```

### Mock Server

```bash
npm run mock
```

---

## Project Structure

- `assets/` — Static assets including images, fonts, icons, and splash screens.
- `src/app/` — Expo Router file-based navigation only; contains screen files and `_layout.tsx` navigators.
- `src/components/` — Reusable and modular UI components decoupled from navigation logic.
- `src/hooks/` — Custom React hooks encapsulating stateful logic and device capabilities.
- `src/services/` — HTTP client functions and communication layer with the NestJS backend.
- `src/types/` — Shared TypeScript definitions, interfaces, and API contracts.
- `src/constants/` — Global configuration, design tokens, and theme palettes.
- `src/utils/` — Pure helper functions, date parsers, and input validators.
- `db.json` — Local database fixture file for `json-server` mock endpoints.

---

## Conventions

- **React Native Primitives:** Never output HTML elements (`<div>`, `<p>`, `<span>`). All text must be enclosed inside `<Text>`
- **Safe Area**: Always use `react-native-safe-area-context` instead of the legacy `SafeAreaView` from `react-native`.
- **Styling with NativeWind:** Use `className="..."` with valid React Native utility classes. Avoid unsupported web utilities (e.g., CSS grid, raw vw/vh). Avoid heavy inline `style={{ ... }}` objects.
- **Naming Conventions:** 
  - PascalCase for React components (`Button.tsx`)
  - camelCase for hooks (`useLocation.ts`), functions, and variables. 
  - Routes inside `src/app/` follow kebab-case or Expo Router file conventions (`[id].tsx`, `_layout.tsx`)
- **Test Placement:** Colocate tests side-by-side with source files using `.test.ts` / `.test.tsx` (e.g., `Button.tsx` + `Button.test.tsx`, `useAuth.ts` + `useAuth.test.ts`).
- **Error Handling:** Route-level crashes handled via Expo Router `+error.tsx` boundaries. API errors caught and transformed at `src/services/`, exposing user-friendly feedback through UI state or toast notifications.
- **Patterns & Best Practices:** Validate form inputs and payload shapes (e.g., Zod) before API dispatch; enforce typed props with TypeScript; show explicit loading states during async actions to prevent double submissions.
- **Intuitive & Self-Descriptive Naming:** Use clear, intention-revealing names that make intent obvious without requiring comments. Avoid generic or cryptic abbreviations (e.g., use `incidentList` instead of `data`/`arr`, `isSubmittingReport` instead of `flag`, `fetchIncidentsByStatus` instead of `getData`).
- **Expo Go only includes its bundled native modules**. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- **Prefer recommended Expo modules over third-party libraries**, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

## Don't Do

- **No unapproved dependencies:** Do not install new third-party packages or native libraries without prior explicit approval; always prioritize built-in Expo SDK modules.
- **Do not commit secret files:** Never commit `.env` or files containing private credentials/tokens to version control.
- **No untyped code:** Avoid using `any` in TypeScript; explicitly define interfaces or use `unknown` with runtime type narrowing.
- **Do not mix business logic into routing:** Never place UI components, custom hooks, or API requests inside `src/app/` unless they are page screens or `_layout.tsx` navigators.
- **Do not edit native folders manually:** Never touch or modify generated `ios/` or `android/` directories directly; handle all native configuration strictly through `app.json` and config plugins.
- **No unoptimized lists:** Do not render dynamic or unbounded collections using `.map()` inside a standard `<ScrollView>`; always use `<FlatList>` or virtualization for list performance.
- **No hardcoded inline styles:** Avoid bulky inline `style={{ ... }}` objects; style components using NativeWind utility classes (`className="..."`) or theme tokens.
- **Do not modify files outside frontend-mobile:** All file edits must be strictly confined to `frontend-mobile/`. Other directories (like `backend/` or `database/`) are strictly read-only for inspecting API endpoints, DTO contracts, or executing root-level docker commands.
- **No live backend inspection:** Do not analyze or query backend endpoints until explicitly requested; assume and build against local mocked REST data via `json-server`.

---

## Workflow

- **Plan before non-trivial tasks:** Propose a step-by-step plan and wait for my explicit approval before making changes.
- **One task at a time:** Focus on a single task at a time; once finished, summarize the exact files and lines modified for review.
- **Ask when uncertain:** If you are not at least 80% confident in an implementation detail, ask for clarification instead of guessing or hallucinating.
- **Minimal and targeted changes:** Only touch code strictly related to the current task. Do not reformat or refactor unrelated files.
- **Mandatory Quality Verification:** Always run `npx expo lint` and `npx tsc --noEmit` to ensure there are no linting or type errors before declaring any task complete.
- **No autonomous git commits:** Do not create git commits or push to remote branches unless explicitly asked.
- **Mock Data & Schema Workflow:** When interacting with `db.json`:
  1. Verify if the required entity or mock data already exists.
  2. If missing, define the new contract/interface in `src/types/` first.
  3. Add the mock entity/record into `db.json` and ask the user for confirmation before proceeding with UI integration.
- **Local media & Image Handling Strategy**:
  - **No cloud storage yet**: Do not propose, configure, or wait for S3, MinIO, or backend upload endpints
  - **Captured/Selected photoes**: Use the temporary local URI `(file://...)` returned directly by `expo-image-picker` or camera modules. Store this local URI directluy in `photoURL` when persisting to `db.json`. 
  - **Seed Mock Data**: Use placeholder image URLs (e.g., `https://picsum.photos/...`) for initial fixtures in `db.json`
  - **Storage service encapsulation**: Isolate image handling inside `src/services/storage.service.ts` with simulated network delay (`setTimeout`) to test UI loading/error states without touching external services
---

## Native & Build Constraints

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md