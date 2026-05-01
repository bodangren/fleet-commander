# Specification: Testing Infrastructure

## Overview

Address critical testing gaps identified in the 2026-05-01 architecture review. Current coverage is 68% in pivot and 42% in frontend. No integration test exists for the full dispatch→execute→persist cycle. Schema drift detection is manual. This track brings coverage to targets (pivot 80%, frontend 60%) and adds automated safeguards.

## Functional Requirements

### 1. Integration Test for Orchestrator Lifecycle

- Test full cycle: load state → filter eligible tasks → score candidates → execute → persist results
- Mock Convex client and agent execution
- Verify all state transitions (todo → in_progress → done/blocked)
- Verify error handling paths (retry, circuit breaker, coverage enforcement)
- Verify dispatch rejection persistence to run contracts

### 2. Schema Drift Detection

- Automated CI check that `convex/_generated/*` matches current schema
- Script to verify generated types are up to date
- Fail CI if drift detected
- Clear error message telling developer to run `npx convex dev`

### 3. Coverage Improvement

- Identify untested files in pivot (target 80% file coverage)
- Identify untested files in frontend (target 60% file coverage)
- Write tests for critical paths first (orchestrator, dispatch, git)
- Generate and review coverage reports

### 4. Frontend Contract Tests

- Validate API response shapes in frontend tests
- Ensure backend schema changes break tests (not runtime)
- Add type-safe API client validation

### 5. runAllProjects Orchestration Test

- Test multi-project orchestration logic
- Verify sequential execution and error isolation
- Verify results aggregation

## Non-Functional Requirements

- All existing tests must continue to pass
- New tests must run in CI under 2 minutes
- Coverage reports must be generated in CI artifacts
- No breaking changes to existing APIs

## Acceptance Criteria

- [ ] Integration test covers full dispatch→execute→persist cycle
- [ ] Schema drift detection runs in CI and fails on mismatch
- [ ] Pivot file coverage ≥ 80%
- [ ] Frontend file coverage ≥ 60%
- [ ] Frontend contract tests validate API shapes
- [ ] `runAllProjects` has unit test coverage
- [ ] All tests pass in CI
- [ ] Coverage reports generated as CI artifacts

## Out of Scope

- E2E test expansion (covered in existing tracks)
- Performance/load testing (Phase 10)
- Visual regression testing (future)
