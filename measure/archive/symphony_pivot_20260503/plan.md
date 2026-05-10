# Symphony Pivot Implementation Plan

## Post-Review Note (2026-05-03)

Follow-up review found Phase 2 overstates runtime completion: `calculateSymphonyBackoff()` exists, but `runProject()` still uses `DEFAULT_RETRY_CONFIG` with the legacy jittered `calculateBackoff()` path. It also found `afterCreate` is stored on harness profiles but not invoked by orchestration. Corrections are tracked in `review_remediation_20260503`.

## Phase 1: Local Environment & Postgres
- [x] Task: Update local Convex dev scripts to use Postgres.
- [x] Task: Update `pivot/README.md` with instructions for Postgres local backend.

## Phase 2: Orchestrator Retries & Hooks
- [x] Task: Implement `before_run`, `after_run`, `after_create` hooks in Harness Profiles.
- [x] Task: Update Executor to run hooks inside the assigned Git worktree.
- [x] Task: Implement exponential backoff in `retryManager.ts` using the Symphony formula.

## Phase 3: Opencode Session Persistence
- [x] Task: Update Opencode harness to capture and return `session_id` after execution.
- [x] Task: Update Convex schema to store `session_id` on the `runContracts` or `tasks` table.
- [x] Task: Modify orchestrator to pass the stored `session_id` to the harness for continuation turns.

## Phase 4: Measure Metadata Tags
- [x] Task: Update `plan.md` parser to extract `#tag:value` pairs.
- [x] Task: Plumb parsed tags (like `#blocked_by`) into the dispatcher state machine.
