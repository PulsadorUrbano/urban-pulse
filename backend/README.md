# Urban Pulse

Urban Pulse is a NestJS API foundation for urban-data services.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Getting started

```bash
npm install
copy .env.example .env
npm run start:dev
```

The API listens on `http://localhost:3000` by default. Set `PORT` in `.env` to use another port.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Starter response |
| `GET` | `/health` | Liveness check returning `{ "status": "ok" }` |

## Configuration

Copy `.env.example` to `.env` for local development. `.env` and other environment-specific files are intentionally ignored by Git; never commit credentials.

`OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are reserved for Nest Observe configuration. Add real values only to your local or deployed environment.

## Commands

```bash
npm run start:dev  # Run with file watching
npm run build      # Compile the application
npm run lint       # Lint TypeScript sources and tests
npm run test       # Run unit tests
npm run test:e2e   # Run end-to-end tests
```

## Production

```bash
npm run build
npm run start:prod
```
