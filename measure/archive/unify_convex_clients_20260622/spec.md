# Spec: Unify Convex Clients

## Goal

Eliminate the parallel `pivot/src/convexClient.ts` and `pivot/src/typedConvexClient.ts` implementations and establish a single canonical typed Convex client. This closes TD-204.

## User Impact

Two clients for the same state layer cause inconsistent error handling, duplicated helpers, and confusion about which import to use. Unifying them reduces bugs, simplifies onboarding, and makes the typed `api.*` path the only production boundary.

## Acceptance Criteria

1. Only one Convex client module remains in `pivot/src/`.
2. All existing imports from the deprecated module are migrated to the canonical module.
3. The canonical client uses typed `api.*` references; no new `as any` escapes are introduced.
4. Existing behavior (mock-client injection, error handling, environment selection) is preserved.
5. Red tests fail at HEAD because both client modules exist and callers still import the deprecated one.
6. `bun --cwd pivot test` and `bun --cwd pivot typecheck` pass after the migration.
7. `build-graph update ./graph.db <changed files>` is run after source changes.

## Non-Goals

- Changing the Convex schema or generated API.
- Adding new client features (retries, caching, circuit breakers).
- Refactoring frontend Convex hooks (those are tracked separately as TD-217/TD-218).

## Verification

- `bun --cwd pivot test`
- `bun --cwd pivot typecheck`
- Static import check: zero imports from the deprecated client path.
- `build-graph update ./graph.db <changed files>`
