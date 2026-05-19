# Implementation Plan: Tech Debt Audit & Memory Compaction

## Phase 1: Audit & Classification
- [x] Task: Read all 16 open tech debt items
- [x] Task: Verify schema duplicates (TD-078, TD-079) against `convex/schema.ts`
- [x] Task: Verify history page/component test failures (TD-091 through TD-106)
- [x] Task: Verify chart test failures (TD-113, TD-119, TD-120)
- [x] Task: Verify error boundary/hook test failures (TD-099, TD-118)
- [x] Task: Verify test strategy contradictions (TD-100, TD-108)
- [x] Task: Verify missing search/filter tests (TD-096)

## Phase 2: Remove Obsolete & Resolved Items
- [x] Task: Remove TD-096 (Phase 5 tests now exist — 48+ tests across 5 files)
- [x] Task: Remove TD-102 (sort test no longer uses `getByText`; merged into TD-093)
- [x] Task: Remove TD-103 (test uses `getAllByText` and passes; mitigated at test level)
- [x] Task: Remove TD-104 (CostTrendChart tests pass; page-level large dataset context gone)
- [x] Task: Remove TD-106 (large dataset pages are static; duplicate-value issue exists only in component tests, covered by TD-091)

## Phase 3: Consolidate Duplicates
- [x] Task: Merge TD-119 into TD-113 (same root cause: recharts ResponsiveContainer 0×0 SVG in jsdom)
- [x] Task: Merge TD-120 into TD-113 (same root cause)
- [x] Task: Merge TD-099 into TD-118 (same root cause: React error propagation doesn't surface to `result.error` in vitest)
- [x] Task: Update TD-113 description to note narrow scope (excludes CostTrendChart, which is custom HTML/CSS and tests pass)
- [x] Task: Update TD-118 description to include orphan `InsightsErrorBoundary.test.tsx` (component missing)

## Phase 4: Compact Lessons Learned
- [x] Task: Prune lessons-learned.md from 49 lines to ≤35 lines
- [x] Task: Keep only broadly applicable patterns (Convex query patterns, Bun mocking, frontend API shape, JSX escape, planning insights)
- [x] Task: Remove redundant or overly specific entries (per-stream resource limits, agent prompt sections, scheduler self-HTTP calls, failure types)

## Phase 5: Update Registry & Close Track
- [x] Task: Rewrite `measure/tech-debt.md` with cleaned open/resolved tables
- [x] Task: Verify line counts are within bounds
- [x] Task: Update `measure/tracks.md` to mark this track complete
- [x] Task: Update track `metadata.json` status to `completed`
- [x] Task: Commit changes with `chore(measure): Tech debt audit and memory compaction`
