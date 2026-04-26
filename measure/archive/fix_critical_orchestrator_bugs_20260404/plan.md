# Plan: Fix Critical Orchestrator Bugs

## Phase 1: Fix Issue Store Wiring (TD-003)

- [x] **Task 1.1**: Write test for orchestrator with issue store in production mode
- [x] **Task 1.2**: Update orchestrator construction to include `WithIssueStore` option
- [x] **Task 1.3**: Verify issue creation works end-to-end in tests

## Phase 2: Fix Dependency Evaluator State Management (TD-004)

- [x] **Task 2.1**: Write test for dependency evaluator preserving blocked state
- [x] **Task 2.2**: Fix evaluator to not clear manual/review/issue-based blocking
- [x] **Task 2.3**: Add regression tests for state transition edge cases

## Phase 3: Integration & Verification

- [x] **Task 3.1**: Run full test suite and fix any regressions (69 tests pass)
- [x] **Task 3.2**: Update tech-debt.md to mark TD-003 and TD-004 resolved
- [ ] **Task 3.3**: Manual verification of orchestrator behavior

## Notes

- Follow TDD: write tests first, then implementation
- Commit after each task with atomic commits
- Reference lessons learned for Bun orchestrator patterns
