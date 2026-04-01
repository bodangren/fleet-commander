# Architecture + Migration Note (Bun + Convex Pivot)

## 1. Scope

This track establishes the replacement architecture where:

- Convex is the canonical operational state store.
- Bun is the local runtime boundary for machine-local execution and filesystem interaction.
- `conductor/` markdown artifacts are synchronized documentation outputs, not the only runtime database.

## 2. Module Mapping (Go/SQLite -> Bun/Convex)

| Outgoing Module | Current Responsibility | Target Replacement |
|---|---|---|
| `internal/database/*` | SQLite persistence for projects/tracks/tasks/issues/logs/settings | Convex schema + queries/mutations in `convex/` |
| `internal/watcher/service.go` | Filesystem polling/watch and parser-triggered state updates | Bun sync/import/export scripts in `pivot/src/sync/*` and worker-side watcher bridge |
| `internal/hub/hub.go` | WebSocket fanout for live updates | Convex subscriptions (`onUpdate`) exposed to UI via Bun SSE bridge |
| `internal/runner/command_runner.go` | Subprocess lifecycle and output capture | Bun worker contract in `pivot/src/worker/localWorker.ts` |
| `api_*.go`, `project_*.go`, `settings_routes.go` | HTTP read/write APIs over SQLite-backed stores | Convex functions as primary API + Bun thin HTTP bridge in `pivot/src/server.ts` |

## 3. Convex Canonical Data Model

Implemented in `convex/schema.ts`:

- `projects`
- `tracks`
- `tasks`
- `issues`
- `executionLogs`
- `settings`
- `agents`
- `harnesses`
- `workRuns`

Supporting functions:

- Project vertical slice: `convex/projects.ts`
- Track sync + version conflict control: `convex/tracks.ts`
- Local run lifecycle logs: `convex/executionLogs.ts`
- Bootstrap coverage for core entities: `convex/fleetCatalog.ts`

## 4. Markdown Ownership and Sync Rules

1. Convex is canonical for runtime state.
2. Markdown export/import is explicit via sync tooling:
   - export: `bun --cwd pivot run sync:export -- <projectSlug> <trackId> <outputDir>`
   - import: `bun --cwd pivot run sync:import -- <projectSlug> <trackDir>`
3. Track conflict handling uses `X-Fleet-Version` version token and Convex `expectedVersion` checks.
4. Markdown artifacts are treated as documentation/audit exports and bootstrap imports, not concurrent primary writers.

## 5. Local Worker Contract (Bun <-> Convex)

Defined in `pivot/src/worker/localWorker.ts`:

- Bun receives `{ projectSlug, trackId, command[], runId }`.
- Bun executes local command with `Bun.spawn`.
- Bun writes lifecycle entries (`running` -> terminal status) to `executionLogs:appendLog`.
- UI observes updates through Convex-backed state and subscription stream.

## 6. Migration Plan (SQLite/filesystem -> Convex)

### Inventory

SQLite source tables:

- `projects`
- `tracks`
- `tasks`
- `issues`
- `execution_logs`

Filesystem-derived source state:

- `conductor/tracks/*.md` / `plan.md` / `spec.md`
- `conductor/broker/open|resolved/*.md`
- `conductor/logs/**/*.jsonl`

### Staged Migration

1. **Widen stage**
   - Keep Go/SQLite paths available.
   - Start writing new Bun+Convex slices for selected surfaces.
2. **Backfill stage**
   - Run SQLite import script:
     - `bun --cwd pivot run migrate:sqlite -- <path/to/fleet.db>`
   - Run markdown import for active tracks.
3. **Dual-read verification stage**
   - Compare legacy API outputs with Convex query outputs for chosen slices.
4. **Narrow stage**
   - Freeze SQLite writes for migrated slices.
   - Move UI reads/writes to Convex-backed paths.
5. **Cutover stage**
   - Retire SQLite/Go slices once cutover checklist is satisfied.

## 7. Cutover Criteria and Rollback

### Cutover Criteria

- Convex schema + generated types are current and deployed.
- Bun project-registry slice is operational for read/write.
- One realtime flow is served from Convex subscription updates.
- One local command execution lifecycle is persisted to Convex logs.
- SQLite import has been run and spot-validated for target projects.

### Rollback Notes

- Keep last known-good SQLite DB snapshot before final narrow stage.
- Preserve Go API binaries/scripts until post-cutover acceptance.
- Rollback trigger: failed migration integrity checks, critical dispatcher regressions, or runtime auth blocking production use.
- Rollback action: switch read/write paths back to Go/SQLite for affected slices; keep Convex data for forensic comparison.

## 8. Convex Skill + Subagent Execution Protocol

This track follows `.agents/agents/convex-developer.md` and installed Convex skills as:

1. `convex-best-practices` for function/API/schema baseline.
2. `convex` umbrella routing.
3. `convex-quickstart` for bootstrap and local dev setup.
4. `convex-migration-helper` for widen-migrate-narrow migration design.
5. `convex-setup-auth` for production auth hardening (next slice).
6. `convex-create-component` if future extraction into reusable Convex components is needed.
7. `convex-performance-audit` for hot-path tuning after parity slices land.
