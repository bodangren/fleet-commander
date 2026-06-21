# Tech Stack - Fleet Commander

Fleet Commander runs on a Bun + Convex + React architecture.

## Runtime

- **Package manager:** Bun (`bun.lock`, `bunfig.toml`). Do not use `npm install` or `npm ci`.
- **Backend runtime:** Bun 1.3+ HTTP server in `pivot/`.
- **HTTP API:** `Bun.serve()` on port 8081, with routes registered from `pivot/src/routes/`.
- **Orchestrator:** `pivot/src/orchestrator/autoRunner.ts` and `pivot/src/orchestrator/orchestrator.ts`.
- **Process execution:** Bun subprocess APIs and configured harness commands.

## Canonical State

- **Backend:** Convex is the system of record for projects, tasks, sprints, agents, settings, budgets, notifications, quality runs, and history.
- **Generated API:** `convex/_generated/*` is checked in and consumed through typed `api.*` references.
- **Source of truth:** Runtime state lives in Convex. Measure markdown is planning, documentation, and audit history.

## Frontend

- **Framework:** React 19 + Vite.
- **Router:** React Router 7 data-router (`frontend/src/router.tsx`).
- **UI:** Tailwind CSS + local shadcn-style primitives.
- **Data access:** Convex subscriptions/queries for canonical data plus Bun API routes for local side effects and orchestration actions.

## Quality And Governance

- **Quality profiles:** Convex-backed profile selection exists for `none`, `standard`, and `strict`.
- **Known wiring gap:** Production AutoRunner currently lacks a real `QualityWorkflowRunner`; tracked by `quality_workflow_hot_path_wiring_20260618`.
- **Graph:** `graph.db` is the local build-graph database. Use incremental `build-graph update` after source changes. Full rebuilds must scan into a temporary DB first.
- **Deprecated:** `measure/automation-script.sh` and `measure/automation-supervisor.py` are behavioral references, not production schedulers.

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
bun --cwd frontend test --run
bun --cwd frontend check
bash measure/doctor.sh all
```
