# Tech Stack - Fleet Commander

Fleet Commander runs on a Bun + Convex + React architecture.

## Runtime

- **Package manager:** Bun (`bun.lock`, `bunfig.toml`). Do not use `npm install` or `npm ci`.
- **Backend runtime:** Bun 1.3+ HTTP server in `pivot/`.
- **HTTP API:** `Bun.serve()` on port 8081, with routes registered from `pivot/src/routes/`.
- **Orchestrator:** `pivot/src/orchestrator/autoRunner.ts` and `pivot/src/orchestrator/orchestrator.ts`.
- **Process execution:** Bun subprocess APIs and configured harness commands.

## Canonical State

- **Backend:** Convex is the system of record for projects, tasks, sprints, agents, settings, budgets, quality runs, and history. Operator truth is retained in Alerts, task state/history, recovery evidence, and execution logs.
- **Generated API:** `convex/_generated/*` is checked in and consumed through typed `api.*` references.
- **Source of truth:** Runtime state lives in Convex. Measure markdown is planning, documentation, and audit history.

## Frontend

- **Framework:** React 19 + Vite 7.
- **Router:** React Router 7 data-router (`frontend/src/router.tsx`).
- **UI:** Tailwind CSS **v3** (`frontend/tailwind.config.js`) + local shadcn-style primitives. Tailwind v4 migration is TD-242 / `tailwind_css_4_migration_20260625`.
- **Data access:** Domain hooks under `frontend/src/lib/convex-data/` and `convex-realtime/` (compat barrels: `useConvexData.ts`, `useConvexRealtime.ts`). Convex subscriptions/queries for canonical data; Bun API routes for local side effects and orchestration actions.

## Quality And Governance

- **Quality profiles:** Convex-backed profile selection for `none`, `standard`, and `strict`.
- **Production wiring:** AutoRunner receives `qualityWorkflowHooks: createProductionQualityWorkflowHooks()` from `pivot/src/server.ts` and CLI `runAutoRunner()`. Fail-closed without hooks remains covered by tests. UI visibility residual: TD-261 / `quality_workflow_visibility_ui_20260807`.
- **Executor backend:** Pi measure harness only (OpenCode path removed on `chore/scalpel`).
- **Graph:** `graph.db` is the local build-graph database. Use incremental `build-graph update` after source changes. Full rebuilds must scan into a temporary DB first.
- **Deprecated:** `measure/automation-script.sh` and `measure/automation-supervisor.py` are behavioral references, not production schedulers.

## Known gate caveats

- Frontend tests: `bun run --cwd frontend test` (Vitest via package script). Do **not** use bare `bun --cwd frontend test`.
- Convex unit tests are **quarantined** in `measure/verify.sh` (TD-263: ~157 fail). They still run; set `VERIFY_REQUIRE_CONVEX=1` to enforce. Pivot + frontend gates are the merge green bar.

### E2E Testing

- **Command:** `npx playwright test frontend/e2e/smoke.spec.ts` (bounded smoke spec; full suite: `npx playwright test`)
- **Environment:** Requires a running Vite dev server with mock adapter env vars:
  - `VITE_CONVEX_URL` — Convex deployment URL for the E2E test environment
  - `VITE_SOURCE_*=bun` — source flags routing API calls through the mock data adapter
- **Profile-aware gate:** `bash measure/doctor.sh e2e --dry-run` prints the command; `QUALITY_PROFILE=none` skips the explicit E2E gate. `bash measure/doctor.sh all` stays bounded to the six governance checks and does not run Playwright.

## Commands

```bash
bun install
npm run dev
bun --cwd pivot test
bun --cwd pivot typecheck
bun run --cwd frontend test
bun run --cwd frontend check
bash measure/doctor.sh all
```
