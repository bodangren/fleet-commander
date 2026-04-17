# Specification — Fix governanceEvents index-based filtering (TD-026)

## Problem

`convex/budgets.ts:getGovernanceEvents` uses `.take().filter()` which loads N documents into memory and then filters by `scope` and `eventType`. This violates the Convex hot-path rule against `.filter()` + `.collect()`/`.take()` and becomes expensive as the table grows.

`getRecentGovernanceEvents` has the same issue with `.filter()` after `.take()` for `scope`.

## Solution

Add composite indexes to `governanceEvents` and rewrite both queries to use `withIndex()` so filtering happens at the database layer.

## Acceptance Criteria

1. `getGovernanceEvents` uses `withIndex` for all filter combinations (scope, eventType, both, neither).
2. `getRecentGovernanceEvents` uses `withIndex` when `scope` is provided.
3. New indexes follow Convex naming convention (`by_scope_and_eventType_and_createdAt`, `by_eventType_and_createdAt`, `by_scope_and_createdAt`).
4. Tests exist or are updated to verify argument forwarding for the client wrappers.
5. Full test suite passes.
6. `tech-debt.md` marks TD-026 resolved.
