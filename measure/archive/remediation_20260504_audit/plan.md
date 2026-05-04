# Quality Remediation — 2026-05-04 Audit Implementation Plan

## Phase 1: Fix False Completion & Commit Uncommitted Work

- [x] Reconcile `enforce_contract_reliability_20260504/plan.md` — mark uncommitted phases as `[~]` or `[ ]`
- [x] Commit all uncommitted code changes with proper conventional commit messages
  - `feat(convex): Add timing fields to workRuns schema and upsertWorkRun mutation`
  - `feat(pivot): Implement contract SLA enforcement (maxExecutionMs, maxTokens) in executor`
  - `feat(pivot): Add session continuity and validator enforcement to orchestrator`
  - `feat(pivot): Wire performance profiling routes and retrospective routes`
  - `feat(frontend): Add PerformanceDashboard and RetrospectivePage routes`
- [x] Run full test suites after commit and document baselines
  - 27/27 runContract tests pass
  - 17/17 performance lib tests pass
  - 784/799 pivot tests pass (15 baseline failures: TD-033 mock.module isolation)
  - Frontend `tsc --noEmit` clean

## Phase 2: Fix Critical Logic Bugs

- [ ] Fix `readStreamWithTokenLimit` to enforce combined stdout+stderr token limit
  - Maintain a shared token counter across both stream readers
  - Kill process immediately when combined limit is exceeded
  - Update executor tests to cover split-stream scenario
- [x] Remove `sessionResumeMs` stub from orchestrator.ts
  - Removed orphaned session resume timing block; field no longer passed to persistWorkRun
- [x] Fix `deriveTaskKind` to read task type from track metadata
  - Infers from track name in `measure/tracks/<name>/plan.md` path (fix_*, feature_*, chore_*, etc.)
  - Falls back to taskId heuristics only when metadata is unavailable
  - Returns `'unknown'` instead of `'feature'` when no match
  - Added tests for UUID-style task IDs
- [x] Expand `isSourceFile` to include `convex/` directory
  - Updated runContract.test.ts expectations accordingly

## Phase 3: Fix Stubs and Data Quality

- [~] Resolve TD-032 in `pivot/src/policy/rollup.ts`
  - Documented stub with explanatory comment linking to workRuns timing integration
  - `meanDurationMs` remains `0` until workRuns → runContracts duration linkage is built
- [x] Complete PerformanceDashboard UI
  - Added `PhaseBreakdown` component (table of p50/p95/p99 per phase, consumes `/api/performance/phase-breakdown`)
  - Added `PhaseTrends` component (recharts line chart of daily averages, consumes `/api/performance/phase-trends`)
  - Updated `SlowAgentLeaderboard` to use shared `AnalyticsFilters` (days, projectSlug, autoRefresh)
  - Updated `PerformanceDashboard` page to render all three panels
- [x] Fix `getSprintById` validator and type safety
  - Changed `v.string()` to `v.id('sprints')`
  - Removed `as any` casts from `ctx.db.get()` call and result

## Phase 4: Cleanup and Verification

- [ ] Regenerate `convex/_generated/api.d.ts` via `npx convex dev` (blocked: non-interactive terminal hangs on "upgrade now?" prompt)
- [ ] Add circuit-breaker differentiation for SLA breaches
  - Tag `recordCircuitFailure` with `failureType: 'sla_timeout'` or `'sla_tokens'`
  - Update circuit breaker query to surface SLA-specific failure rates
- [x] Update `lessons-learned.md` with patterns from this session
  - "Never mark plan tasks complete before code is committed"
  - "Per-stream resource limits need shared counters"
  - "Generated files must be regenerated, not hand-edited"
- [~] Run full verification
  - [x] `bun test ./convex/lib/*.test.ts` — all pass
  - [x] `bun --cwd pivot test` — baseline failures only (15 documented)
  - [ ] `bun --cwd frontend test` — times out at `ProjectViewPage.test.tsx` (TD-038); individual files pass
  - [x] `bun --cwd pivot typecheck` — clean
  - [x] `bun --cwd frontend check` — `tsc --noEmit` clean; full check times out
