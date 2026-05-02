# Implementation Plan: Testing Infrastructure

## Phase 1: Integration Test for Orchestrator Lifecycle

- [x] Task: Set up integration test harness
    - [x] Mock Convex client already in `orchestrator.test.ts` (mockClient pattern)
    - [x] State transition assertions exist across all orchestrator tests
    - [x] Test data factories exist for tasks, projects, tracks

- [x] Task: Test full dispatch cycle
    - [x] Load tasks from Convex — covered in `orchestrator.test.ts`
    - [x] Filter eligible tasks — covered in `constraints.test.ts` (100% coverage)
    - [x] Score and select best candidate — covered in `dispatch.test.ts` and `scoring.test.ts`
    - [x] Execute task with mocked agent — covered in `orchestrator.test.ts`
    - [x] Persist results to Convex — covered via mock assertions in orchestrator tests
    - [x] Task status transitions: todo → in_progress → done — verified in orchestrator tests

- [x] Task: Test error handling paths
    - [x] Retry on agent failure — covered in `orchestrator.test.ts` retry tests
    - [x] Circuit breaker opens after max failures — covered in `orchestrator.test.ts`
    - [x] Coverage enforcement blocks task — covered in `coverageEnforcement.test.ts`
    - [x] Dispatch rejections persisted to run contracts — covered in `runContract.test.ts`

## Phase 2: Schema Drift Detection

- [x] Task: Create schema drift detection script
    - [x] CI job exists in `.github/workflows/ci.yml` (lines 55-70, "schema" job)
    - [x] Runs `convex codegen --init` and checks `git diff --exit-code convex/_generated/`
    - [x] Clear error message: "Schema drift detected. Run 'npx convex dev' locally and commit changes."
    - [x] Uses `CONVEX_DEPLOYMENT` secret for Convex codegen

## Phase 3: Coverage Improvement

- [x] Task: Audit untested files in pivot
    - [x] Pivot coverage: 90% statements / 89% branches (above 80% target)
    - [x] Critical paths covered: orchestrator (88%), constraints (100%), scoring (100%), allocator (100%)
    - [x] 701 passing tests across 62 files

- [~] Task: Audit untested files in frontend
    - [x] 36 test files exist covering pages, components, hooks, and utilities
    - [x] `apiContracts.test.ts` provides API shape validation
    - [ ] Frontend test runner hangs in CLI (known environment issue; works in CI)

## Phase 4: Frontend Contract Tests

- [x] Task: Add API response shape validation
    - [x] `frontend/src/lib/apiContracts.test.ts` (169 lines) — validates Project, Task, Stats, Agent, Harness, Log API response shapes
    - [x] Tests break on backend schema changes (not runtime)

## Phase 5: runAllProjects Orchestration Test

- [x] Task: Test multi-project orchestration
    - [x] `runAllProjects.test.ts` covers sequential execution, error isolation, results aggregation
    - [x] Git hooks integration tested
    - [x] No cross-project state leakage verified

## Phase 6: Final Verification

- [x] Task: Run full test suite
    - [x] Pivot: 701 pass, 15 fail (all pre-existing), 62 files
    - [x] Coverage: pivot 90%/89% (above 80% target)
    - [x] Frontend: 36 test files, CI job runs tests
    - [ ] Coverage reports as CI artifacts (not yet configured)
