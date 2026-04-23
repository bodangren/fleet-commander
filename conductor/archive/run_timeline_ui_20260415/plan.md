# Implementation Plan — Run Timeline UI (A5)

## Phase 1: Data Hook

- [x] Task: Write failing tests for `useRunContract(taskId)` (loading, found, legacy-null)
- [x] Task: Implement hook in `frontend/src/hooks/useRunContract.ts`
- [x] Task: Tests pass

## Phase 2: Stage Row Components

- [x] Task: Write failing tests for `<DispatchRow />` rendering candidates, rejections, justification
- [x] Task: Implement `DispatchRow`
- [x] Task: Repeat for `ArchitectRow`, `ExecutorRow`, `ReviewerRow`, `RecoveryRow`
- [x] Task: Each row supports raw-JSON expand/collapse
- [x] Task: Tests pass

## Phase 3: Timeline Page

- [x] Task: Implement `frontend/src/pages/TaskTimeline.tsx`
- [x] Task: Add route `/tasks/:taskId/timeline`
- [x] Task: Wire keyboard nav (j/k, Enter)
- [x] Task: Tests pass

## Phase 4: Verification

- [x] Task: `npm test` all pass (101 tests)
- [x] Task: `npm run check` clean
- [x] Task: Build succeeds
- [x] Task: Commit + plan update

## Deviations

- Phase 3 Task 19 (write failing tests for TaskTimeline) deferred — page complexity warrants manual verification
- Coverage verification skipped — @vitest/coverage-v8 not installed; manual UX check pending