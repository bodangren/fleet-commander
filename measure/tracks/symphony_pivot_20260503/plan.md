# Symphony Pivot Implementation Plan

## Phase 1: Local Environment & Postgres
- [x] Task: Update local Convex dev scripts to use Postgres.
- [x] Task: Update `pivot/README.md` with instructions for Postgres local backend.

## Phase 2: Orchestrator Retries & Hooks
- [x] Task: Implement `before_run`, `after_run`, `after_create` hooks in Harness Profiles.
- [x] Task: Update Executor to run hooks inside the assigned Git worktree.
- [x] Task: Implement exponential backoff in `retryManager.ts` using the Symphony formula.

## Phase 3: Opencode Session Persistence
- [ ] Task: Update Opencode harness to capture and return `session_id` after execution.
- [ ] Task: Update Convex schema to store `session_id` on the `runContracts` or `tasks` table.
- [ ] Task: Modify orchestrator to pass the stored `session_id` to the harness for continuation turns.

## Phase 4: Measure Metadata Tags
- [ ] Task: Update `plan.md` parser to extract `#tag:value` pairs.
- [ ] Task: Plumb parsed tags (like `#blocked_by`) into the dispatcher state machine.