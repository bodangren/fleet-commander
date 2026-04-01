# Implementation Plan - Strategic Platform Pivot: Bun + Convex

## Phase 1: Reframe the Product and Migration Strategy

- [x] Task: Update `conductor/product.md`, `conductor/tech-stack.md`, and conflicting roadmap/workflow language to describe the Bun + Convex target architecture
  - Evidence: `conductor/product.md`, `conductor/tech-stack.md`, `conductor/tracks.md`, `conductor/workflow.md`
- [x] Task: Write a migration architecture note mapping current Go/SQLite modules to planned Bun/Convex replacements
  - Evidence: `conductor/tracks/platform_pivot_bun_convex_20260401/architecture_migration.md`
- [x] Task: Define execution protocol using `.agents/agents/convex-developer.md` and Convex skills
  - Evidence: `architecture_migration.md` section "Convex Skill + Subagent Execution Protocol"

## Phase 2: Bootstrap Bun and Convex Foundations

- [x] Task: Introduce Bun-based package/runtime scaffolding at repo root and replacement app workspace
  - Evidence: `package.json`, `bunfig.toml`, `pivot/package.json`, `pivot/src/server.ts`
- [x] Task: Add Convex to project and establish initial local development workflow
  - Evidence: `convex/` schema/functions, generated files under `convex/_generated`, workflow commands in `conductor/tech-stack.md`
- [x] Task: Define local worker contract between Bun and Convex
  - Evidence: `pivot/src/worker/localWorker.ts`, `architecture_migration.md`
- [x] Task: Write smoke checks proving Bun app and Convex dev workflow start
  - Evidence:
    - `CONVEX_AGENT_MODE=anonymous npx convex dev --once` (functions ready)
    - `bun run --cwd pivot test`
    - `bun run --cwd pivot typecheck`

## Phase 3: Define the Canonical Convex Data Model

- [x] Task: Design Convex schema for projects, tracks, tasks, issues, execution logs, settings, agents, harnesses, and run state
  - Evidence: `convex/schema.ts`
- [x] Task: Implement initial Convex queries/mutations/actions with explicit validators and auth boundary handling
  - Evidence: `convex/projects.ts`, `convex/tracks.ts`, `convex/executionLogs.ts`, `convex/fleetCatalog.ts`, `convex/lib/validators.ts`, `convex/lib/auth.ts`
- [x] Task: Write contract-level checks before broad UI integration
  - Evidence:
    - Convex compile/deploy check via `npx convex dev --once`
    - Bun test coverage for sync/version contract in `pivot/src/sync/trackMarkdown.test.ts`

## Phase 4: Establish Markdown Sync as Documentation, Not Primary State

- [x] Task: Define import/sync/export ownership rules to avoid split-brain
  - Evidence: `architecture_migration.md` section "Markdown Ownership and Sync Rules"
- [x] Task: Implement one reversible sync/export path for tracks/plans
  - Evidence: `pivot/src/sync/convexTrackSync.ts`, `pivot/src/sync/trackMarkdown.ts`
- [x] Task: Write tests for sync/export correctness and conflict tokens
  - Evidence: `pivot/src/sync/trackMarkdown.test.ts`

## Phase 5: Replace Core Runtime Slices

- [x] Task: Deliver one vertical slice reading/writing through Convex and served by Bun
  - Evidence: `pivot/src/server.ts` endpoints (`GET/POST /api/projects`)
- [x] Task: Replace one realtime UI flow with Convex subscription updates
  - Evidence: `pivot/src/server.ts` SSE endpoint `/api/projects/stream` backed by Convex `onUpdate`
- [x] Task: Define Bun-side orchestration boundary for subprocess execution and local-only responsibilities
  - Evidence: `pivot/src/worker/localWorker.ts`, `architecture_migration.md`
- [x] Task: Prove one local execution flow where Bun runs command and persists lifecycle updates to Convex
  - Evidence: `pivot/src/worker/runDemo.ts`, `executionLogs:listRecentLogs` verification output

## Phase 6: Migrate Existing Data and Active Features

- [x] Task: Inventory SQLite tables and filesystem-derived runtime state for migration mapping
  - Evidence: `architecture_migration.md` section "Migration Plan (SQLite/filesystem -> Convex)"
- [x] Task: Implement staged import/backfill flow from SQLite/filesystem state
  - Evidence: `pivot/src/migration/importSqlite.ts`, markdown sync import/export tooling
- [x] Task: Verify realistic migration path from legacy local instance to Convex model
  - Evidence:
    - Seeded temp SQLite fixture `/tmp/pivot-migration.db`
    - `CONVEX_URL=http://127.0.0.1:3210 bun src/migration/importSqlite.ts /tmp/pivot-migration.db`
    - Convex summary reflects imported rows (`fleetCatalog:getBootstrapSummary`)

## Phase 7: Cutover and Decommission

- [x] Task: Define cutover criteria, rollback notes, and operator checklist
  - Evidence: `architecture_migration.md` section "Cutover Criteria and Rollback"
- [ ] Task: Remove/archive obsolete Go-only runtime paths after full parity
  - Note: Deferred intentionally until additional slices (dispatcher/review surfaces) complete parity.
- [x] Task: Run stack verification and update track artifacts with closure state
  - Evidence: verification gate commands below + updated track docs/metadata.

## Verification Gates

- [x] Task: Verify Bun commands/tests/build steps are documented and runnable
  - `bun run --cwd pivot test`
  - `bun run --cwd pivot typecheck`
- [x] Task: Verify Convex schema/functions compile and generated types are current
  - `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
  - Generated outputs in `convex/_generated/*`
- [x] Task: Verify end-to-end flow with Convex as primary state and markdown as synchronized documentation
  - `curl -X POST http://localhost:8787/api/projects ...`
  - `bun src/sync/convexTrackSync.ts export ...`
  - `bun src/sync/convexTrackSync.ts import ...`
  - `curl -N http://localhost:8787/api/projects/stream`
- [x] Task: Verify migrated slice does not require legacy Go/SQLite runtime surfaces
  - Bun + Convex slice commands run independently of `fleet-commander` Go binary.
