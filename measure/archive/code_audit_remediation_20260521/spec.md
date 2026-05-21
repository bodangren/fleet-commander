# Spec: Code Audit Remediation

## Overview

A comprehensive audit of the Fleet Commander codebase identified four categories of issues:
dead code from prior rewrites, logic bugs causing incorrect data, non-realtime data fetching
where Convex subscriptions should be used, and junk tests that test mocks instead of behavior.
This track fixes all of them.

## Functional Requirements

### FR-1: Dead Code Removal
- Delete 11 orphaned frontend components with zero non-test consumers
- Delete `InsightsPage.tsx` and its test (page is not routed in App.tsx)
- Delete `legacy/KanbanColumn.tsx`, `legacy/KanbanColumn.test.tsx`, `legacy/TaskCard.tsx`, `legacy/TaskCard.test.tsx` (not used by legacy KanbanBoard; only in own tests)
- Delete `useConvexRealtime.test.ts` (tests string constants in mock, not real behavior)

### FR-2: Logic Bug Fixes
- **insights.ts:126** — `computeCostTrend(filteredSprints, [])` passes empty `[]`; cost trend always shows $0. Fix: pass the `costRecords` variable already fetched on line 137.
- **scheduler.ts:14** — `columnId: v.optional(v.id('columns'))` references a table that no longer exists in schema. Remove this field from `taskResponse` validator.
- **employees.ts** — All query/mutation handlers lack `await resolveActor(ctx)` auth guard. Add it to all public handlers.
- **useConvexData.ts:useConvexQuery** — Creates a new `ConvexClient` (WebSocket) per mount without closing it on cleanup. Fix: store client reference and call `client.close()` in cleanup.

### FR-3: Realtime Wiring (Analytics / Performance / Cost)
All 15 chart/data components in `components/analytics/`, `components/performance/`, and
`components/cost/` use `fetch()` to poll the pivot REST API. Convex query functions and
matching realtime hooks already exist but are wired to nothing. Replace the REST polling
pattern with Convex subscription hooks.

- Update hooks in `useConvexRealtime.ts` to accept filter args (`days`, `projectSlug`, `agent`, `priority`)
- Analytics (6): `CompletionTrendChart`, `AgentHeatmap`, `BottleneckChart`, `QueueDepthChart`, `HookPerformanceChart`, `SessionResumptionChart`
- Performance (4): `PhaseBreakdown`, `PhaseTrends`, `SlowAgentLeaderboard`, `RegressionTrendChart`
- Cost (5): `CostTrendChart`, `CostByProjectChart`, `CostByAgentChart`, `SessionSavingsWidget`, `BudgetGauge`

### FR-4: Test Fixes
- `convex/analytics.test.ts` — test "filters by projectId when provided" has a comment admitting the feature was removed; test name is misleading. Rename to match actual behavior.
- `convex/schema.foundation.test.ts` — tests inspect Convex internal validator structure (`v.kind`, `.members`). Replace with behavioral schema shape tests that don't depend on SDK internals.

### FR-5: Tech Debt Registry Update
- Mark TD-132 as resolved (dashboard sub-components ARE used by DashboardPage.tsx — tech-debt entry was stale)

## Non-Functional Requirements
- All existing tests that pass must continue to pass after changes
- TypeScript must type-check after changes (`bun --cwd frontend check`)
- No new `as any` casts introduced

## Acceptance Criteria
- [ ] Zero non-test imports of deleted files
- [ ] `convex/insights.ts` cost trend uses real cost records (not empty array)
- [ ] `convex/scheduler.ts` does not reference `columns` table
- [ ] `convex/employees.ts` handlers call `resolveActor(ctx)` 
- [ ] `useConvexData.ts:useConvexQuery` closes client on effect cleanup
- [ ] All 15 analytics/performance/cost components use Convex hooks instead of `fetch()`
- [ ] No `autoRefresh` polling interval in those components (Convex is realtime)
- [ ] `useConvexRealtime.ts` hooks accept filter args
- [ ] Misleading test renamed in `analytics.test.ts`
- [ ] TD-132 marked resolved in `tech-debt.md`
- [ ] Frontend type check passes

## Out of Scope
- Migrating `useConvexData.ts` to use `useQuery` from `convex/react` (larger refactor)
- Rewriting `schema.foundation.test.ts` with behavioral tests (schema tests are low-value but harmless)
- Fixing `isValidStatusTransition` — tech-debt claim was inaccurate; function is working correctly
