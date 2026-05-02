# Tech Stack - Measure Fleet Commander

Fleet Commander runs on a **Bun runtime + Convex backend** architecture.

## 1. Application Runtime (Bun)

- **Runtime:** Bun 1.3+
- **Role:** Hosts HTTP API server, executes local CLI harness commands, manages filesystem synchronization with managed repositories, and provides WebSocket connections.
- **HTTP Server:** `Bun.serve()` with parameterized route dispatcher (`pivot/src/routes/router.ts`)
- **Process execution:** `Bun.spawn` for local task execution and lifecycle capture.
- **Port:** 8081 (replaces legacy Go server at same address)
- **Local migration/sync tooling:** Bun scripts handle SQLite import, markdown import, and local bootstrap checks.

## 2. Canonical Backend (Convex)

- **System of record:** Convex tables for projects, tracks, tasks, issues, execution logs, settings, agents, harnesses, sprints, and run state.
- **API boundary:** Convex queries/mutations/actions with explicit argument and return validators.
- **Realtime:** Convex subscriptions for live UI state.
- **Type generation:** `convex/_generated/*` is generated from schema/functions and checked into the repo.

## 3. Frontend Surfaces

- React dashboard served by Bun HTTP server or Vite dev server.
- All data sourced from Convex subscriptions or Bun API endpoints (`/api/*`).
- Realtime UI behavior consumes Convex subscription updates.

## 4. Archived Stack

The following were removed on 2026-04-02 (see `measure/archive/_go_runtime_final_20260402/`):

- Go HTTP daemon (23 handler files, 24 internal packages)
- SQLite-backed runtime stores
- Go WebSocket hub fanout
- Filesystem-only operational state model

## 5. Developer Workflow

1. Bootstrap local anonymous or authenticated Convex deployment:
   - `CONVEX_AGENT_MODE=anonymous npx convex dev --once` (agent/headless baseline)
   - or `npx convex dev` (interactive user-authenticated baseline)
2. Generate and verify Convex types/functions:
   - `npx convex codegen --init`
3. Run Bun server:
   - `bun --cwd pivot run dev` (starts HTTP server on :8081)
4. Run frontend dev server:
   - `bun --cwd frontend run dev` (proxies /api/* to :8081)
5. Run tests:
   - `bun --cwd pivot run test`
   - `bun --cwd frontend run build`
6. Validate sync/migration scripts:
   - `bun --cwd pivot run migrate:sqlite -- <path/to/sqlite.db>`
