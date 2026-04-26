# Spec: Fix Critical Orchestrator Bugs

## Problem Statement

The Bun orchestrator has two HIGH severity bugs that prevent correct operation:

1. **TD-003**: Production orchestrator is constructed without `WithIssueStore(...)`, so auto-created blocker/delegation issues no-op outside tests
2. **TD-004**: Dependency evaluator clears any `blocked` task back to `todo` when dependencies are satisfied, losing manual/review/issue-based blocking state

## User Stories

- As a developer, when the orchestrator runs, I expect issues to be properly created and tracked in the issue store
- As a developer, when a task's dependencies are satisfied, I expect its state to transition correctly without losing manual blocking state

## Acceptance Criteria

1. Production orchestrator construction includes issue store wiring
2. Dependency evaluator preserves manual/review/issue-based blocking state
3. All existing tests pass
4. New tests cover the fixed behaviors
5. Tech debt items TD-003 and TD-004 marked as resolved

## Success Metrics

- Zero HIGH severity bugs in tech-debt.md after completion
- Test coverage >80% for changed modules
- Manual verification shows correct issue creation and state transitions
