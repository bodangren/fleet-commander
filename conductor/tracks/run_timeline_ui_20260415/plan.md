# Implementation Plan — Run Timeline UI (A5)

## Phase 1: Data Hook

- [ ] Task: Write failing tests for `useRunContract(taskId)` (loading, found, legacy-null)
- [ ] Task: Implement hook in `frontend/src/hooks/useRunContract.ts`
- [ ] Task: Tests pass

## Phase 2: Stage Row Components

- [ ] Task: Write failing tests for `<DispatchRow />` rendering candidates, rejections, justification
- [ ] Task: Implement `DispatchRow`
- [ ] Task: Repeat for `ArchitectRow`, `ExecutorRow`, `ReviewerRow`, `RecoveryRow`
- [ ] Task: Each row supports raw-JSON expand/collapse
- [ ] Task: Tests pass

## Phase 3: Timeline Page

- [ ] Task: Write failing tests for `<TaskTimeline />` ordering + live updates + legacy placeholder
- [ ] Task: Implement `frontend/src/pages/TaskTimeline.tsx`
- [ ] Task: Add route `/tasks/:taskId/timeline`
- [ ] Task: Wire keyboard nav (j/k, Enter)
- [ ] Task: Tests pass

## Phase 4: Verification

- [ ] Task: `npm run test:renderer` all pass
- [ ] Task: `npm run check` clean
- [ ] Task: Coverage ≥ 80%
- [ ] Task: Manual UX check against `product-guidelines.md` (density, keyboard, active-task focus)
- [ ] Task: Commit + plan update
