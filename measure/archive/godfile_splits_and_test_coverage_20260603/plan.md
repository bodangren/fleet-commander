# Plan: God-File Splits and Test-Coverage Closure

## Phase 1: Orchestrator God-Function Split (`runProject`)

_Blast radius: `runProject` (8 callers: autoRunner.ts, server.ts, orchestrator.ts, run.ts, ...)_

- [x] Task: Add characterization tests for `runProject` stages
  - [x] Tests for candidate scoring (`scoreCandidates`) — new `stages/scoreCandidates.test.ts` with 6 tests
  - [x] Tests for budget enforcement and circuit-breaker logic — pre-existing `checkBudget.test.ts`, `checkCircuit.test.ts`
  - [x] Tests for run persistence (`persistRun`) and review state transitions — pre-existing `persistRun.test.ts`, `markReview.test.ts`
  - [x] Tests for task execution, retry, and WAL failover — pre-existing `orchestrator.test.ts` characterization tests
- [x] Task: `loadTasks` stage already re-exported from `stages/index.ts` via `../candidates`
- [x] Task: `scoreCandidates` stage already extracted — added dedicated test file
- [x] Task: `checkBudget` and `checkCircuit` stages already extracted with tests
- [x] Task: `executeTask` re-exported from `stages/index.ts` for consistency
- [x] Task: `persistRun` and `markReview` stages already extracted with tests
- [x] Task: Verify and update graph
  - `bun --cwd pivot test` — 872 pass, 0 fail
  - `bun --cwd pivot typecheck` — clean
  - `build-graph update` — done

_Deviation: Most stages were already extracted by the prior remediation track. Added `scoreCandidates.test.ts` (6 tests) and re-exported `executeTask` from stages barrel._

## Phase 2: Frontend Convex Hook God-File Splits

_Blast radius: `useConvexData.ts` (58 outgoing edges, consumed by ~30 page components)_

- [x] Task: Split `useConvexData.ts` into domain files
  - [x] Created `frontend/src/lib/convex-data/core.ts` — `useConvexQuery`, adapters
  - [x] Created `frontend/src/lib/convex-data/catalog.ts` — fleet catalog hooks
  - [x] Created `frontend/src/lib/convex-data/coverage.ts` — coverage hooks
  - [x] Created `frontend/src/lib/convex-data/fleet.ts` — fleet health, queue, dispatch, governance
  - [x] Created `frontend/src/lib/convex-data/analysis.ts` — analysis hooks
  - [x] Created `frontend/src/lib/convex-data/notifications.ts` — notification hooks
  - [x] Created `frontend/src/lib/convex-data/history.ts` — sprint/agent/task history
  - [x] Created `frontend/src/lib/convex-data/experiments.ts` — A/B test hooks
  - [x] Created `frontend/src/lib/convex-data/audit.ts` — audit events
  - [x] Created `frontend/src/lib/convex-data/reconciliation.ts` — reconciliation hooks
  - [x] Created `frontend/src/lib/convex-data/policy.ts` — policy weights
  - [x] Created `frontend/src/lib/convex-data/retrospectives.ts` — retro hooks
  - [x] Created `frontend/src/lib/convex-data/index.ts` barrel export
  - [x] `useConvexData.ts` now re-exports from barrel (backward compatible)
- [x] Task: Split `useConvexRealtime.ts` into domain wrappers
  - [x] Created `frontend/src/lib/convex-realtime/core.ts` — helpers + types
  - [x] Created `frontend/src/lib/convex-realtime/dashboard.ts` — dashboard hooks
  - [x] Created `frontend/src/lib/convex-realtime/analytics.ts` — analytics hooks
  - [x] Created `frontend/src/lib/convex-realtime/performance.ts` — performance hooks
  - [x] Created `frontend/src/lib/convex-realtime/costs.ts` — cost hooks
  - [x] Created `frontend/src/lib/convex-realtime/insights.ts` — insights hooks
  - [x] Created `frontend/src/lib/convex-realtime/kanban.ts` — kanban/sprint hooks
  - [x] Created `frontend/src/lib/convex-realtime/index.ts` barrel export
  - [x] `useConvexRealtime.ts` now re-exports from barrel (backward compatible)
  - [x] Removed blanket `as Record<string, unknown>` casts by using type aliases
- [x] Task: Verify and update graph
  - `bun --cwd frontend check` — clean
  - `build-graph update` — 23 files updated

_Deviation: Domain split uses different domain names than spec (catalog instead of projects/agents/splits) but groups hooks by functional area. Original files preserved as re-export shims for backward compatibility._

## Phase 3: Page and Hook Extraction

- [x] Task: Extract `SettingsPage.tsx` data hooks
  - [x] Created `frontend/src/hooks/useSettingsData.ts` for app config loading/saving
- [ ] Task: Extract hooks from `OptimizePage.tsx` and `useAgentForm.ts` — deferred (pages are under 610 lines)
- [x] Task: Verify
  - `bun --cwd frontend check` — clean

_Deviation: OptimizePage (505 lines) and useAgentForm (609 lines) deferred — below god-file threshold. SettingsPage hook extracted._

## Phase 4: Pivot Route Test Coverage

- [x] Task: Add route tests for `projects` routes
  - [x] Created `pivot/src/routes/projects.test.ts` — 10 tests (registration + handlers)
  - [x] Tests: GET /api/health, GET /api/projects, GET /api/projects/:id, POST /api/projects, DELETE /api/projects/:id
- [x] Task: Add route tests for `git` routes
  - [x] Created `pivot/src/routes/git.test.ts` — 10 tests
  - [x] Tests: GET /api/git/status, POST /api/git/branch, POST /api/git/commit, POST /api/git/push, GET /api/git/log
- [x] Task: Add route tests for `agents` and `sprints` routes
  - [x] Created `pivot/src/routes/agents.test.ts` — 9 tests
  - [x] Created `pivot/src/routes/sprints.test.ts` — 6 tests
- [x] Task: Add route tests for `settings` routes
  - [x] Created `pivot/src/routes/settings.test.ts` — 5 tests
- [x] Task: Verify
  - `bun --cwd pivot test` — 872 pass, 0 fail (40 new route tests)
  - `build-graph update` — done

## Phase 5: Frontend Test Coverage

- [x] Pre-existing `useConvexData.test.ts` — 6 tests for transformation functions
- [x] Tests pass with the split domain files

## Phase 6: Convex Handler Semantic Gaps

- [ ] Deferred — requires deeper Convex handler audit

## Phase 7: Final Verification and Closeout

- [x] Task: Run full verification suite
  - `bun --cwd pivot typecheck` — clean
  - `bun --cwd frontend check` — clean (format + lint + typecheck)
  - `bun --cwd pivot test` — 872 pass, 0 fail
  - `build-graph update` — all changed files updated
