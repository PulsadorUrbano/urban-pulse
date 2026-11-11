---
name: estilo-codigo-web
description: Code style and architecture rules of frontend-web (React 19, strict TypeScript, Vite) as actually used in the project. Use before writing, reviewing or refactoring any code in frontend-web, or when asked "como programamos", "estilo de codigo", "convenciones", "donde pongo esto", "añade un servicio, hook o componente", "conecta con el backend".
---

# Estilo de codigo web

Extracted from `frontend-web/src` (branch of PR #129, 2026-11-09). Structure and names mirror `frontend-mobile/src`. For visual rules, use the `diseno-web` skill. For documentation, use `trazabilidad`.

## Hard rules
- Change only `frontend-web/`. `backend/`, `frontend-mobile/` and `database/` are read-only.
- Strict TypeScript only (`.ts`, `.tsx`). Only `eslint.config.js` and `postcss.config.js` stay in JavaScript.
- No `any`, no `@ts-ignore`, no `eslint-disable`, and no `as` on external data. The code has none today.
- No new dependencies without explicit approval.
- Mock data lives in `src/mocks/` and is reachable only behind `import.meta.env.DEV`, so it never reaches the production bundle.

## Language
- Identifiers in English. Comments and user-facing text in Spanish. No emojis.
- Comments are short and explain why, not what. Reference the backend or mobile equivalent when it clarifies a contract.

## Layers
Dependencies go one way: `components` -> `hooks` -> `services` -> `services/http.ts`. Components never call `fetch`.

| Folder | Holds | File name |
| --- | --- | --- |
| `src/components/` | Rendering and local UI state | `login-form.tsx` |
| `src/hooks/` | Screen state and orchestration | `use-auth.ts` |
| `src/services/` | Backend calls, storage, response guards | `incident.service.ts` |
| `src/types/` | Domain contracts | `incident.ts` |
| `src/constants/` | Configuration and shared labels | `incident-labels.ts` |
| `src/utils/` | Small pure functions | `display-name.ts` |
| `src/mocks/` | Simulated data, development only | `auth-mock.ts` |
| `src/__tests__/` | Vitest, mirroring the `src/` path | `services/incident.service.test.ts` |

## Naming and format
- Files in kebab-case. Components in PascalCase with named export (`export function LoginForm`). Only `App.tsx` uses a default export.
- Props interface `<Component>Props`, callbacks `onX`, internal handlers `handleX`, booleans `isX` or plain state (`loading`).
- Module constants in `UPPER_SNAKE_CASE`.
- 2 spaces, single quotes, semicolons, trailing commas in multi-line lists. Config files at the package root omit semicolons. Lines up to about 120 characters.
- Imports: external packages, blank line, then internal modules alphabetically. Type-only imports use `import type` or inline `type`, required by `verbatimModuleSyntax`.

## TypeScript
- `interface` for object shapes, `type` for unions and aliases.
- Statuses and roles are string unions, mapped with `Record<Union, string>`.
- Discriminate variants with a field (`source: 'backend' | 'mock'`) and exhaustive `switch`.
- Shared lists are `readonly T[]`. `noUnusedLocals` and `noUnusedParameters` are on.
- Check external data at runtime with a guard (`value is T`) and `readJson`; `isRecord` is in `services/http.ts`.

## React
- Function components and hooks only. Pass props directly; no context or state library unless the team agrees.
- `useAuth` and `useTheme` are created once in `App.tsx` and passed down.
- To type a prop from a hook, use `ReturnType<typeof useX>`.
- Business logic and API calls go in hooks and services, not in components.
- Do not call `setState` synchronously inside an effect; derive the value instead (see `loading` in `use-incident-validation.ts`).
- Effects that load data use an `active` flag and set it to false on cleanup.
- Async handlers in JSX: `onClick={() => void handleSubmit()}`. Non-submit buttons need `type="button"`.
- Keep a component to one responsibility. If it passes about 250 lines, extract parts.

## Backend calls

```ts
const incidentsEndpoint = (): string => `${resolveBackendApiUrl()}/incidents`;

export async function fetchIncidentById(id: string): Promise<IncidentDetail> {
  const response = await sendToBackend(`${incidentsEndpoint()}/${encodeURIComponent(id)}`, { method: 'GET' });

  if (response.status === 404) throw new IncidentNotFoundError();
  if (!response.ok) {
    throw new Error(await buildBackendRejectionMessage(response, 'No se pudo obtener la incidencia.'));
  }
  return readJson(response, isIncidentDetail, 'GET /incidents/:id');
}
```

- URLs come from `resolveBackendApiUrl()`, read on each call. Default is `/api`, proxied by Vite or nginx. Images use `resolveBackendAssetUrl()`.
- Always use `fetchWithTimeout`, directly or through a wrapper.
- Status 502, 503 and 504 mean the backend is unavailable (`isBackendUnavailable`), the same as a network error.
- Expected failures are named `Error` subclasses (`IncidentNotFoundError`). Messages in Spanish; include the backend reason with `buildBackendRejectionMessage`.
- Login is real-first. Only a lack of connection may fall back to the mock, only in development and with a visible notice. A 401 or any other rejection never does.
- Keep function and error names aligned with `frontend-mobile/src/services/` when an equivalent exists. Types follow the backend contract, not the mobile additions.

## Tests
- Vitest, one file per service or config module, test names in Spanish.
- Stub network with `vi.stubGlobal('fetch', ...)` and restore in `afterEach` with `vi.unstubAllGlobals()` and `vi.unstubAllEnvs()`.
- Cover observable behaviour and error mapping. No e2e or integration tests unless requested.

## Before finishing
Run from `frontend-web/`; all must pass without weakening rules:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Then:
- [ ] Record the change with the `trazabilidad` skill.
- [ ] Branch from `dev` as `feature/...`, `fix/...`, `docs/...` or `refactor/...`, and open the PR against `dev`.
- [ ] Commit as `<tipo>: <descripción en minúsculas>` (feat, fix, docs, style, refactor, test, chore, ci, build), atomic.
- [ ] No AI attribution on GitHub: no `Co-Authored-By` or "Generated with" lines.
- [ ] Never commit `.env` files or secrets.
