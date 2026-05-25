# Implementation Plan: Critical Bug Bash

## Phase 1: Test Fixes

- [ ] Task: Fix TD-146 — change `detectRegressions.test.ts` severity assertion from `'warning'` to `'critical'`
- [ ] Task: Fix TD-147 — clear `policyStatsCache` in timing test beforeEach; increase gap tolerance to 10ms
- [ ] Task: Run `bun --cwd pivot test` — confirm 0 failures
- [ ] Task: Commit

## Phase 2: Functional Bugs

- [ ] Task: Fix TD-140 — update `WorkspaceScanner.tsx` to call `/api/projects/scan-and-import`
- [ ] Task: Fix TD-139 — implement `upsertTask` handler with insert-or-patch logic
- [ ] Task: Verify `importTasksFromPlans.ts` successfully creates tasks
- [ ] Task: Commit

## Phase 3: Closeout

- [ ] Task: Remove resolved TD items from `measure/tech-debt.md`
- [ ] Task: Update `measure/tracks.md` — mark bug_bash_20260524 complete
- [ ] Task: Update this plan with commit hashes
