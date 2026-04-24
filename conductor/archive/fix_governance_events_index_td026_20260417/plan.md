# Implementation Plan — Fix governanceEvents index-based filtering (TD-026)

## Phase 1: Tests

- [x] Task: Create `pivot/src/policy/budgetClient.test.ts` with tests for `getGovernanceEvents` and `getRecentGovernanceEvents` argument forwarding
- [x] Task: Run tests — red (client tests pass against mock, but this establishes the contract)

## Phase 2: Schema + Query Fix

- [x] Task: Add composite indexes to `governanceEvents` in `convex/schema.ts`
  - `by_scope_and_eventType_and_createdAt` on `['scope', 'eventType', 'createdAt']`
  - `by_eventType_and_createdAt` on `['eventType', 'createdAt']`
  - `by_scope_and_createdAt` on `['scope', 'createdAt']`
- [x] Task: Rewrite `getGovernanceEvents` in `convex/budgets.ts` to branch on provided args and use `withIndex`
- [x] Task: Rewrite `getRecentGovernanceEvents` in `convex/budgets.ts` to use `withIndex` for scope filter
- [x] Task: Run pivot tests — all pass

## Phase 3: Verification + Cleanup

- [x] Task: Run `npm run check` (frontend) and pivot typecheck — all pass
- [x] Task: Update `conductor/tech-debt.md` — mark TD-026 resolved
- [x] Task: Update plan.md checkboxes, commit, push
