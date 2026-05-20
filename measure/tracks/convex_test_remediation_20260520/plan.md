# Implementation Plan: Convex Test Remediation

## Phase 1: Mock Infrastructure Fix

- [ ] Task: Fix `employees.test.ts` mock — add `.filter()` and `.first()` to `db.query`, fix `.collect()` on bare query
- [ ] Task: Fix `agents.test.ts` mock if needed
- [ ] Task: Fix `costs.test.ts` mock if needed
- [ ] Task: Fix `analytics.test.ts` mock if needed
- [ ] Task: Fix `performance.test.ts` mock if needed
- [ ] Task: Fix `history/*.test.ts` mocks if needed
- [ ] Task: Run `bun test` in convex — count remaining failures

## Phase 2: Schema Expectation Updates

- [ ] Task: Update `schema.foundation.test.ts` — align task status enum assertions (`backlog|ready|in_progress|review|done|blocked` instead of old six)
- [ ] Task: Update `schema.foundation.test.ts` — align priority enum assertions (`low|medium|high` instead of `low|med|high`)
- [ ] Task: Update any other test files asserting old enum values
- [ ] Task: Run `bun test` in convex — count remaining failures

## Phase 3: Re-implement Stubbed Handlers

- [ ] Task: Re-implement `computeBottlenecks` in `convex/lib/analytics.ts` or update test to match stub
- [ ] Task: Re-implement `getCompletionTrends` in `convex/analytics.ts` or update test to match stub
- [ ] Task: Re-implement `getBottlenecks` in `convex/analytics.ts` or update test to match stub
- [ ] Task: Fix `seedAgentsHandler` test expectation
- [ ] Task: Fix `getPerformanceOverview` test expectation
- [ ] Task: Fix `getCostPerTask` / `computeCostPerTaskMetric` test expectations
- [ ] Task: Fix `listTaskHistoryHandler`, `listSprintHistoryHandler`, `listAgentHistoryHandler` tests
- [ ] Task: Run `bun test` in convex — all tests should pass

## Phase 4: Verification & Commit

- [ ] Task: Full convex test suite passes (0 failures)
- [ ] Task: Convex typecheck passes
- [ ] Task: Commit with `chore(convex): Remediate tests after schema migration`
- [ ] Task: Update `measure/tech-debt.md` — mark related items resolved
- [ ] Task: Update this plan with commit hashes
