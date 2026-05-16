# Implementation Plan: Tech Debt Remediation

## Phase 1: Test Infrastructure Foundation

Fix the missing fixtures and type mismatches that block proper test authoring.

- [ ] **Task: Create frontend Convex test fixture**
    - [ ] Create `frontend/src/__fixtures__/convex-provider.tsx`
    - [ ] Implement `MockConvexProvider` that wraps children with a mock Convex context
    - [ ] Implement `renderWithProviders` helper combining MockConvexProvider + render
    - [ ] Write test for the fixture itself (renders children, provides Convex context)
    - [ ] Export from `frontend/src/__fixtures__/index.ts`

- [ ] **Task: Extend pivot Convex mock client**
    - [ ] Add mock Convex client class to `pivot/src/__fixtures__/convex-mock.ts`
    - [ ] Implement `query()`, `mutation()`, `withIndex()`, `collect()` stubs with configurable return values
    - [ ] Write tests for mock client behavior (query returns data, mutation calls handler, withIndex chains)

- [ ] **Task: Align fixture Task type with orchestrator Task type**
    - [ ] Update `Task` interface in `pivot/src/__fixtures__/convex-mock.ts` to include `projectSlug`, `trackId`, `taskKey`, `dependencies` fields from `orchestrator/types.ts`
    - [ ] Remove incompatible fields (`projectId`, `columnId`, `priority`) or make optional
    - [ ] Update `createTask()` factory defaults to match new shape
    - [ ] Update `scheduler.test.ts` imports/usage if needed
    - [ ] Verify `bun --cwd pivot typecheck` passes

- [ ] **Task: Verify Phase 1**
    - [ ] Run `bun --cwd pivot test` — all pass
    - [ ] Run `bun --cwd frontend test` — all pass
    - [ ] Run `bun --cwd pivot typecheck` — passes
    - [ ] Run `bun --cwd frontend check` — passes

## Phase 2: Test Reliability

Fix tests that hang or fail due to missing Convex mocking.

- [ ] **Task: Fix ProjectViewPage.test.tsx hang (TD-038)**
    - [ ] Read test file and identify unresolvable fetch paths
    - [ ] Add mock handlers for all hooks used by the page (`useIssuePreview`, `useOrchestratorRun`, `useTaskReview`, `useTaskStatus`)
    - [ ] Add `afterEach` cleanup for fetch mock
    - [ ] Run test 10 times in full suite to verify no hangs

- [ ] **Task: Add Convex mocking to E2E setupMockApp (TD-059)**
    - [ ] Read `frontend/e2e/helpers/mockApp.ts` and identify Convex hook call sites
    - [ ] Add route interception for Convex WebSocket/HTTP connections (intercept `*.convex.cloud` or mock at page level)
    - [ ] Alternative: make `useConvexData` return fallback data when Convex is unavailable (graceful degradation)
    - [ ] Verify E2E test count that passes increases from 19/35 to ≥30/35

- [ ] **Task: Verify Phase 2**
    - [ ] Run `bun --cwd frontend test` — all pass
    - [ ] Run `bun --cwd frontend test:e2e` — pass rate improved
    - [ ] No test hangs in full Vitest run

## Phase 3: Schema & Type Correctness

Fix schema mismatches and manual update burden.

- [ ] **Task: Document offline api.d.ts workaround (TD-024)**
    - [ ] Create `convex/scripts/regenerate-api-dts.sh` that runs `npx convex dev` or copies types from schema
    - [ ] Add README comment in `convex/_generated/` explaining the regeneration workflow
    - [ ] Verify script runs successfully

- [ ] **Task: Fix rollup.ts stub metrics (TD-032)**
    - [ ] Read `pivot/src/policy/rollup.ts` and `convex/schema.ts` to understand required fields
    - [ ] Option A: Implement real `medianLatencyMs`/`averageTokens` from `workRuns` table data
    - [ ] Option B: Remove fields from schema if not needed (preferred if no downstream consumer)
    - [ ] Write tests for the chosen approach
    - [ ] Verify schema and rollup output match

- [ ] **Task: Verify Phase 3**
    - [ ] Run `bun --cwd pivot typecheck` — passes
    - [ ] Run `bun --cwd pivot test` — all pass

## Phase 4: Performance

Optimize expensive queries and add benchmarks.

- [ ] **Task: Fix getBootstrapSummary full table scans (TD-029)**
    - [ ] Read `convex/fleetCatalog.ts` `getBootstrapSummary` function
    - [ ] Replace 9x `.collect().length` with `.count()` (Convex built-in) or index-based counting
    - [ ] Write test asserting counts match expected values
    - [ ] Verify no full-table `.collect()` calls remain in the function

- [ ] **Task: Add analytics query performance benchmark (TD-035)**
    - [ ] Create test that generates synthetic 90-day dataset (or uses fixture)
    - [ ] Assert analytics query completes in <2 seconds
    - [ ] Document benchmark results in test output

- [ ] **Task: Verify Phase 4**
    - [ ] Run `bun --cwd pivot test` — all pass
    - [ ] Run `bun --cwd frontend test` — all pass

## Phase 5: Dead Code & Missing Features

Wire up unimplemented features and add missing tests.

- [ ] **Task: Wire up issueState rendering in ProjectViewPage (TD-037)**
    - [ ] Read `frontend/src/pages/ProjectViewPage.tsx` and `frontend/src/hooks/useProjectView.ts`
    - [ ] Destructure `issueState` and `clearIssueState` from `useIssuePreview`
    - [ ] Render issue detail panel when `issueState` is present
    - [ ] Write test for blocked task showing issue detail

- [ ] **Task: Add hook failure markers to completion trend chart (TD-036)**
    - [ ] Read completion trend chart component and data pipeline
    - [ ] Identify where hook failure data should be injected
    - [ ] Add failure markers to chart rendering
    - [ ] Write test for chart with hook failure data

- [ ] **Task: Add analytics e2e filter tests (TD-034)**
    - [ ] Read existing analytics e2e tests and dashboard page
    - [ ] Write e2e tests for time range filter interaction
    - [ ] Write e2e tests for project filter interaction
    - [ ] Write e2e tests for agent filter interaction
    - [ ] Write e2e tests for priority filter interaction
    - [ ] Verify all new e2e tests pass

- [ ] **Task: Verify Phase 5**
    - [ ] Run `bun --cwd frontend test` — all pass
    - [ ] Run `bun --cwd frontend test:e2e` — all pass
    - [ ] Run `bun --cwd frontend check` — passes

## Final Verification

- [ ] **Task: Update tech-debt.md**
    - [ ] Move all 12 TD items (TD-024, TD-029, TD-032, TD-034, TD-035, TD-036, TD-037, TD-038, TD-053, TD-056, TD-057, TD-059) to Resolved section
    - [ ] Note commit references for each resolution

- [ ] **Task: Run measure:doctor**
    - [ ] Execute `measure/doctor.sh` — passes
    - [ ] Fix any architectural linting issues

- [ ] **Task: Full CI verification**
    - [ ] Run `npm run lint` — passes
    - [ ] Run `bun --cwd pivot typecheck` — passes
    - [ ] Run `bun --cwd frontend check` — passes
    - [ ] Run `bun --cwd pivot test` — all pass
    - [ ] Run `bun --cwd frontend test` — all pass
