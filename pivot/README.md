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

Authenticated flow:

- `npx convex dev`

Headless/agent flow:

- `CONVEX_AGENT_MODE=anonymous npx convex dev --once`

If needed, override the deployment URL explicitly:

- `CONVEX_URL=http://127.0.0.1:3210 bun run --cwd pivot start`
