# Quality Remediation — 2026-05-04 Audit Implementation Plan

## Phase 1: Fix False Completion & Commit Uncommitted Work

- [ ] Reconcile `enforce_contract_reliability_20260504/plan.md` — mark uncommitted phases as `[~]` or `[ ]`
- [ ] Commit all uncommitted code changes with proper conventional commit messages
  - `feat(convex): Add timing fields to workRuns schema and upsertWorkRun mutation`
  - `feat(pivot): Implement contract SLA enforcement (maxExecutionMs, maxTokens) in executor`
  - `feat(pivot): Add session continuity and validator enforcement to orchestrator`
  - `feat(pivot): Wire performance profiling routes and retrospective routes`
  - `feat(frontend): Add PerformanceDashboard and RetrospectivePage routes`
- [ ] Run full test suites after commit and document baselines

## Phase 2: Fix Critical Logic Bugs

- [ ] Fix `readStreamWithTokenLimit` to enforce combined stdout+stderr token limit
  - Maintain a shared token counter across both stream readers
  - Kill process immediately when combined limit is exceeded
  - Update executor tests to cover split-stream scenario
- [ ] Remove or fix `sessionResumeMs` stub in orchestrator.ts
  - Option A: Actually measure time from task dispatch to session-ready state
  - Option B: Remove `sessionResumeMs` from schema, `persistWorkRun`, and all callers
- [ ] Fix `deriveTaskKind` to read task type from track metadata or task tags
  - Fall back to taskId heuristics only when metadata is unavailable
  - Add tests for UUID-style task IDs
- [ ] Expand `isSourceFile` to include `convex/` and `measure/` directories
  - Update runContract.test.ts expectations accordingly

## Phase 3: Fix Stubs and Data Quality

- [ ] Resolve TD-032 properly in `pivot/src/policy/rollup.ts`
  - Option A: Track actual execution durations in workRuns and use them
  - Option B: Rename `meanDurationMs` to `meanConfidenceScore` if that's what the data represents
  - Option C: Remove the field entirely if no consumer needs it
- [ ] Complete PerformanceDashboard UI
  - Add `PhaseBreakdownChart` component (consumes `/api/performance/phase-breakdown`)
  - Add `PhaseTrendsChart` component (consumes `/api/performance/phase-trends`)
  - Write component-level tests
- [ ] Fix `getSprintById` validator and type safety
  - Change `v.string()` to `v.id('sprints')`
  - Remove `as any` casts

## Phase 4: Cleanup and Verification

- [ ] Regenerate `convex/_generated/api.d.ts` via `npx convex dev` (or document why not)
- [ ] Add circuit-breaker differentiation for SLA breaches
  - Tag `recordCircuitFailure` with `failureType: 'sla_timeout'` or `'sla_tokens'`
  - Update circuit breaker query to surface SLA-specific failure rates
- [ ] Update `lessons-learned.md` with patterns from this session
  - "Never mark plan tasks complete before code is committed"
  - "Per-stream resource limits need shared counters"
  - "Generated files must be regenerated, not hand-edited"
- [ ] Run full verification
  - `bun test ./convex/lib/*.test.ts` — all pass
  - `bun --cwd pivot test` — baseline failures only (document exact count)
  - `bun --cwd frontend test` — all pass or documented hangs
  - `bun --cwd pivot typecheck` — clean
  - `bun --cwd frontend check` — clean
