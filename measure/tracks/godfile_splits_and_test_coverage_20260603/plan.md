# Plan: God-File Splits and Test-Coverage Closure

## Phase 1: Orchestrator God-Function Split (`runProject`)

_Blast radius: `runProject` (8 callers: autoRunner.ts, server.ts, orchestrator.ts, run.ts, ...)_

- [ ] Task: Add characterization tests for `runProject` stages
  - [ ] Add tests for task loading (`loadTasks`, `loadTrackStatuses`) with mock Convex responses.
  - [ ] Add tests for candidate scoring (`selectBestCandidate`, `getBestTask`) with fixture data.
  - [ ] Add tests for budget enforcement and circuit-breaker logic.
  - [ ] Add tests for task execution (`executeTask`), retry with exponential backoff, and WAL failover.
  - [ ] Add tests for run persistence (`persistRun`), review state transitions, and timing telemetry.
- [ ] Task: Extract `loadTasks` stage
  - [ ] Create `pivot/src/orchestrator/stages/loadTasks.ts` with the task-loading logic from `runProject`.
  - [ ] Import and call from `runProject`. Verify characterization tests still pass.
  - [ ] Add JSDoc and update graph.db.
- [ ] Task: Extract `scoreCandidates` stage
  - [ ] Create `pivot/src/orchestrator/stages/scoreCandidates.ts` with candidate evaluation logic.
  - [ ] Import and call from `runProject`. Verify characterization tests still pass.
- [ ] Task: Extract `checkBudget` and `checkCircuit` stages
  - [ ] Create `pivot/src/orchestrator/stages/checkBudget.ts` and `checkCircuit.ts`.
  - [ ] Import and call from `runProject`. Verify characterization tests still pass.
- [ ] Task: Extract `executeTask` stage
  - [ ] Create `pivot/src/orchestrator/stages/executeTask.ts` with execution, retry, and WAL logic.
  - [ ] Import and call from `runProject`. Verify characterization tests still pass.
- [ ] Task: Extract `persistRun` and `markReview` stages
  - [ ] Create `pivot/src/orchestrator/stages/persistRun.ts` and `markReview.ts`.
  - [ ] Import and call from `runProject`. Verify characterization tests still pass.
  - [ ] Keep `runProject` as the orchestrator that composes stages. Delete legacy branches if any.
- [ ] Task: Verify and update graph
  - [ ] Run `bun --cwd pivot test` — all tests pass.
  - [ ] Run `bun --cwd pivot typecheck`.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 2: Frontend Convex Hook God-File Splits

_Blast radius: `useConvexData.ts` (58 outgoing edges, consumed by ~30 page components)_

- [ ] Task: Add smoke tests for existing useConvexData hooks
  - [ ] Add tests for the 3-5 most-used hooks (e.g., `useProjects`, `useSprints`, `useAgents`) using `renderHook` + `vi.stubGlobal('fetch', ...)`.
  - [ ] Verify hooks return expected shapes and handle loading/error states.
- [ ] Task: Split `useConvexData.ts` into domain files
  - [ ] Create `frontend/src/lib/convex-data/catalog.ts` — fleet catalog hooks (agents, harnesses, templates).
  - [ ] Create `frontend/src/lib/convex-data/projects.ts` — project list, detail, CRUD hooks.
  - [ ] Create `frontend/src/lib/convex-data/sprints.ts` — sprint list, planning, status hooks.
  - [ ] Create `frontend/src/lib/convex-data/agents.ts` — agent form, workload, performance hooks.
  - [ ] Create `frontend/src/lib/convex-data/costs.ts` — cost tracking, budget, ROI hooks.
  - [ ] Create `frontend/src/lib/convex-data/retrospectives.ts` — retro data and insights hooks.
  - [ ] Create `frontend/src/lib/convex-data/settings.ts` — app config, notification preferences hooks.
  - [ ] Create `frontend/src/lib/convex-data/index.ts` barrel export re-exporting all domain hooks.
  - [ ] Update page imports to use barrel export. Verify no component breaks.
  - [ ] Delete original `useConvexData.ts` after all imports migrated.
- [ ] Task: Split `useConvexRealtime.ts` into domain wrappers
  - [ ] Create `frontend/src/lib/convex-realtime/` domain files matching the useConvexData split.
  - [ ] Remove blanket `(args as Record<string, unknown>)` casts by propagating generics.
  - [ ] Preserve barrel exports. Verify components still work.
- [ ] Task: Verify and update graph
  - [ ] Run `bun --cwd frontend test` — all tests pass.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 3: Page and Hook Extraction

- [ ] Task: Extract `SettingsPage.tsx` data hooks
  - [ ] Create `frontend/src/hooks/useSettingsData.ts` for app config and notification preferences.
  - [ ] Fix the local/Convex preferences race (dual source-of-truth).
  - [ ] Add tests for the extracted hook.
- [ ] Task: Extract hooks from `OptimizePage.tsx` and `useAgentForm.ts`
  - [ ] Create `frontend/src/hooks/useOptimizeData.ts` for A/B test and policy data.
  - [ ] Refactor `useAgentForm.ts` to separate form state from API calls.
  - [ ] Add tests for extracted hooks.
- [ ] Task: Replace copy-paste JSDoc on touched exports
  - [ ] Replace placeholder `Renders a page component` summaries with useful one-line JSDoc.
  - [ ] Correct JSDoc that claims Express Router when code uses Bun router.
- [ ] Task: Verify and update graph
  - [ ] Run `bun --cwd frontend test` — all tests pass.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 4: Pivot Route Test Coverage

- [ ] Task: Add route tests for `projects` routes
  - [ ] Test `POST /api/projects` — valid body creates project, missing name returns 400.
  - [ ] Test `POST /api/projects/scan` — valid rootDir scans, missing rootDir returns 400.
  - [ ] Test `GET /api/projects/:id` — existing project returns data, missing returns 404.
  - [ ] Test `DELETE /api/projects/:id` — deletes project.
- [ ] Task: Add route tests for `git` routes
  - [ ] Test `POST /api/git/branch` — valid body creates branch, missing fields return 400.
  - [ ] Test `POST /api/git/commit` — valid body commits, no changes returns message.
  - [ ] Test `POST /api/git/push` — valid body pushes.
- [ ] Task: Add route tests for `agents` and `sprints` routes
  - [ ] Test `PUT /api/agents/:name` — valid body upserts agent.
  - [ ] Test `POST /api/agents/:name/clone` — clones agent.
  - [ ] Test `POST /api/projects/:slug/sprints` — valid name creates sprint.
- [ ] Task: Delete empty test files or fill with assertions
  - [ ] Find test files with zero meaningful assertions and either fill or delete.
- [ ] Task: Verify
  - [ ] Run `bun --cwd pivot test` — all tests pass.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 5: Frontend Test Coverage

- [ ] Task: Add tests for split useConvexData domain hooks
  - [ ] Test each domain hook file created in Phase 2 for loading, error, and data states.
- [ ] Task: Add tests for useConvexRealtime wrappers
  - [ ] Test Convex unavailable states.
  - [ ] Test realtime subscription lifecycle.
- [ ] Task: Add smoke tests for key pages
  - [ ] Test canonical kanban renders with mock data.
  - [ ] Test markdown viewer/editor renders with content.
  - [ ] Test settings page loads and saves.
  - [ ] Test project view routing.
- [ ] Task: Verify
  - [ ] Run `bun --cwd frontend test` — all tests pass.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 6: Convex Handler Semantic Gaps

- [ ] Task: Replace `.collect().then(filter)` with indexed queries
  - [ ] Audit analytics, notifications, fleet catalog, portfolio, kanban, and task timeline handlers.
  - [ ] Replace full-table-scan-then-filter patterns with `withIndex().order().take(n)` or `.first()`.
  - [ ] Add regression tests for the replaced queries.
- [ ] Task: Add index-ordering and query-limit tests
  - [ ] Test that analytics handlers use indexes correctly.
  - [ ] Test that notification queries are bounded.
  - [ ] Test that fleet catalog queries don't scan full tables.
- [ ] Task: Verify
  - [ ] Run `bun --cwd pivot test` and `bun --cwd frontend test` — all pass.
  - [ ] Run `build-graph update ./graph.db <changed-files>`.

## Phase 7: Final Verification and Closeout

- [ ] Task: Run full verification suite
  - [ ] Run `bun --cwd pivot typecheck`.
  - [ ] Run `bun --cwd frontend check`.
  - [ ] Run `bun --cwd pivot test`.
  - [ ] Run `bun --cwd frontend test`.
  - [ ] Run `build-graph update ./graph.db <changed-files>` for all touched source files.
  - [ ] Update this plan with final status, deviations, and validation evidence.
