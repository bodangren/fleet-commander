# Implementation Plan: Testing Infrastructure

## Phase 1: Integration Test for Orchestrator Lifecycle

- [ ] Task: Set up integration test harness
    - [ ] Create test utilities for mocking Convex client
    - [ ] Create helpers for asserting state transitions
    - [ ] Add test data factories for tasks, projects, tracks

- [ ] Task: Test full dispatch cycle
    - [ ] Write test: load tasks from Convex
    - [ ] Write test: filter eligible tasks (dependency check)
    - [ ] Write test: score and select best candidate
    - [ ] Write test: execute task with mocked agent
    - [ ] Write test: persist results to Convex
    - [ ] Verify task status transitions: todo → in_progress → done

- [ ] Task: Test error handling paths
    - [ ] Write test: retry on agent failure
    - [ ] Write test: circuit breaker opens after max failures
    - [ ] Write test: coverage enforcement blocks task
    - [ ] Write test: dispatch rejections persisted to run contracts

## Phase 2: Schema Drift Detection

- [ ] Task: Create schema drift detection script
    - [ ] Write script comparing schema.ts with generated types
    - [ ] Add to CI workflow (already created in foundational fixes)
    - [ ] Test with intentional drift to verify detection
    - [ ] Add clear error message for developers

## Phase 3: Coverage Improvement

- [ ] Task: Audit untested files in pivot
    - [ ] Run coverage report and identify gaps
    - [ ] Prioritize critical paths (orchestrator, dispatch, git)
    - [ ] Write tests for untested orchestrator functions
    - [ ] Write tests for untested policy functions
    - [ ] Verify pivot coverage ≥ 80%

- [ ] Task: Audit untested files in frontend
    - [ ] Run coverage report and identify gaps
    - [ ] Prioritize hooks and data adapters
    - [ ] Write tests for untested hooks
    - [ ] Write tests for untested utility functions
    - [ ] Verify frontend coverage ≥ 60%

## Phase 4: Frontend Contract Tests

- [ ] Task: Add API response shape validation
    - [ ] Create test utilities for API contract validation
    - [ ] Add tests for project API responses
    - [ ] Add tests for task API responses
    - [ ] Add tests for stats API responses

## Phase 5: runAllProjects Orchestration Test

- [ ] Task: Test multi-project orchestration
    - [ ] Write test: sequential project execution
    - [ ] Write test: error isolation between projects
    - [ ] Write test: results aggregation
    - [ ] Verify no cross-project state leakage

## Phase 6: Final Verification

- [ ] Task: Run full test suite
    - [ ] Run pivot tests with coverage
    - [ ] Run frontend tests with coverage
    - [ ] Verify all acceptance criteria met
