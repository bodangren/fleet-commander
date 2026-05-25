# Implementation Plan: Critical Bug Bash

## Phase 1: Test Fixes

- [x] Task: Fix TD-146 — change `detectRegressions.test.ts` severity assertion from `'warning'` to `'critical'`
- [x] Task: Fix TD-147 — no longer reproducible (full suite passes 952/0); removed from tech-debt
- [x] Task: Run `bun --cwd pivot test` — confirm 0 failures
- [x] Task: Commit (`3656ba6`)

## Phase 2: Functional Bugs

- [x] Task: Fix TD-140 — update `WorkspaceScanner.tsx` to call `/api/projects/scan-and-import`
- [x] Task: Fix TD-139 — implement `upsertTask` handler with insert-or-patch logic
  - Added orchestrator fields to `tasks` table: `projectSlug`, `trackId`, `taskKey`, `dependencies`, `sessionId`, `assigneeName`
  - Added `by_task_key` index
  - Handler looks up project by name (auto-creates if missing), then inserts or patches task
- [x] Task: Verify typecheck passes (pivot + frontend)
- [x] Task: Commit (`3656ba6`)

## Phase 3: Closeout

- [x] Task: Remove resolved TD items from `measure/tech-debt.md`
- [x] Task: Update `measure/tracks.md` — mark bug_bash_20260524 complete
- [x] Task: Update this plan with commit hashes
