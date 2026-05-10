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

**Note:** For long-running orchestration, we require Postgres as our local Convex backend instead of the default SQLite to handle high concurrency and polling without locking issues.

### Postgres Setup

1. Start the Postgres container:

   ```bash
   docker compose up -d postgres
   ```

2. Export the connection string (or rely on the default in the root dev script):

   ```bash
   export CONVEX_POSTGRES_URL=postgresql://convex:convex_local@localhost:5432/convex_local
   ```

3. Start Convex with Postgres:

   ```bash
   npm run dev          # starts convex + pivot + frontend
   # or just convex:
   npx convex dev
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
