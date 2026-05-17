# Bun + Convex Pivot Workspace

This workspace contains the first migration slice for Fleet Commander's Bun + Convex platform pivot.

## Commands

- `bun run --cwd pivot test`
- `bun run --cwd pivot typecheck`
- `bun run --cwd pivot start`
- `bun run --cwd pivot sync:export -- <projectSlug> <trackId> <outputDir>`
- `bun run --cwd pivot sync:import -- <projectSlug> <trackDir>`
- `bun run --cwd pivot migrate:sqlite -- <sqlitePath>`
- `bun run --cwd pivot worker:demo -- <projectSlug> <trackId>`

## Convex Bootstrap

Convex local deployments store state in `.convex/local/` for this checkout.
The installed Convex CLI starts that local backend from `npx convex dev`; it
does not use `CONVEX_POSTGRES_URL` for local deployment storage.

If `npx convex dev` reports schema validation errors for data from another
project, back up or remove `.convex/local/default/` and rerun `npx convex dev`
so the checkout gets a clean local deployment state.

```bash
npm run dev          # starts convex + pivot + frontend
# or just convex:
npx convex dev
```

### Optional Postgres Service

The Compose Postgres service is available for local experiments or future
self-hosted flows. It maps to host port `55432` by default so Fleet Commander
does not collide with other local Postgres-backed projects on `5432`.

```bash
docker compose up -d postgres
```

### Other Flows

Headless/agent flow:

- `CONVEX_AGENT_MODE=anonymous npx convex dev --once`

Override deployment URL explicitly:

- `CONVEX_URL=http://127.0.0.1:3210 bun run --cwd pivot start`

## OpenCode SDK Server

The pivot backend initializes a persistent OpenCode server alongside the HTTP server. This replaces ephemeral `opencode` CLI process spawning with a programmatic Client-Server model via `@opencode-ai/sdk`.

- **Default port:** `8083` (configurable via `OPENCODE_PORT`)
- **Lifecycle:** Server starts automatically during pivot startup and shuts down gracefully on SIGTERM/SIGINT
- **Sessions:** Agent tasks create and reuse OpenCode sessions transparently; session IDs are persisted on task/run records for continuation
- **No orphaned processes:** The server is owned by the pivot process and closed during graceful shutdown
