# Implementation Plan: Convex Test Remediation

## Phase 1: Mock Infrastructure Fix

- [x] Task: Fix `employees.test.ts` mock — add `auth.getUserIdentity` to mock context (`1a177e6`)
- [x] Task: Fix `agents.test.ts` — `seedAgentsHandler` handler bug: returned early when any agent existed (`1a177e6`)
- [x] Task: Fix `performance.test.ts` mock — add `tasks` table support, fix `makePipelineRun` to include `taskId` (`1a177e6`)
- [x] Task: Fix `history/*.test.ts` mocks — use generated IDs instead of hardcoded IDs for cross-table references (`1a177e6`)

## Phase 2: Handler Bug Fixes

- [x] Task: Fix `seedAgentsHandler` in `convex/agents.ts` — insert missing defaults by name instead of returning all existing (`1a177e6`)
- [x] Task: Fix `getPerformanceOverview` in `convex/performance.ts` — filter pipelineRuns by `projectSlug` via tasks table lookup (`1a177e6`)

## Phase 3: Test Assertion Fixes

- [x] Task: Fix `computeCostPerTaskMetric` test — use `_id` instead of `taskKey` in test data (`1a177e6`)
- [x] Task: Fix `history/sprints.test.ts` — use generated `sprintId` in task `sprintId` field (`1a177e6`)
- [x] Task: Fix `history/tasks.performance.test.ts` — correct dashboard+done count from 5 to 10 (`1a177e6`)
- [x] Task: Fix `history/agents.test.ts` — create tasks with generated IDs referenced by pipelineRuns (`1a177e6`)

## Phase 4: Verification & Commit

- [x] Task: Full convex test suite passes (438 pass, 0 fail across 33 files)
- [x] Task: Pivot test suite passes (952 pass, 0 fail)
- [x] Task: Typecheck passes (pivot + frontend)
- [x] Task: Commit (`1a177e6`)
- [x] Task: Update `measure/tracks.md` — mark track complete
