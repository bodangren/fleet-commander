# Implementation Plan: Convex/Bun Failover Design

## Phase 1: Quick Win (items 1 + 2)

- [x] Task: Local write-ahead queue for run events
    - [x] Created WAL writer module (`pivot/src/failover/wal.ts`): appends JSONL to `~/.measure-fleet/wal/<date>.jsonl`.
    - [x] Added idempotency key generation per run event (timestamp + random suffix).
    - [x] Wrapped `appendLog`, `persistWorkRun`, `updateTaskStatus` in orchestrator with WAL fallback.
    - [x] Implemented WAL replay function: reads uncommitted events, writes to Convex in order, skips committed.
    - [x] Tested: WAL append, commit marker, replay routing, idempotent IDs.

- [x] Task: Read-side policy cache with TTL
    - [x] Created `StalenessCache<T>` class (`pivot/src/failover/policyCache.ts`) with configurable TTL.
    - [x] Orchestrator loads policy stats from cache when fresh (avoids Convex queries).
    - [x] On Convex failure, falls back to stale cache before legacy evaluator.
    - [x] Default staleness window: 15 minutes (configurable via constructor).
    - [x] Tested: fresh reads, staleness detection, clear, overwrite.

## Phase 2: Crash and Restart Recovery (items 3 + 4) — DEFERRED

Per architecture improvement table: "Do when evidence shows need." Phase 1 is now stable.

- [ ] Task: Heartbeat-based stuck-task reconciler
    - [ ] Add heartbeat emission to the task runner: write to Convex every N seconds (configurable).
    - [ ] Extend `pivot/src/orchestrator/stalledDetector.ts` to detect missing heartbeats on Convex side.
    - [ ] Mark task `stuck` after 3 missed heartbeats.
    - [ ] Handle Convex-side ghosts: tasks in `running` state with no owning Bun process.
    - [ ] Test: crash a simulated task runner mid-run; verify reconciler marks task `stuck`.

- [ ] Task: Bun startup recovery
    - [ ] On Bun boot, query Convex for tasks in `running` state owned by this instance.
    - [ ] For each found task: apply harness-defined resume policy (resume or fail-and-recover).
    - [ ] Document how harnesses declare their resume policy.
    - [ ] Test: mark a task `running` in Convex; restart Bun; verify task is resumed or recovered per policy.

## Phase 3: Verification

- [x] Task: End-to-end failover check
    - [x] All failover tests pass (9 tests across 2 files).
    - [x] WAL appends on Convex failure, replays on reconnect.
    - [x] Policy cache reduces Convex queries; falls back to stale data when unreachable.
    - [x] WAL, cache TTL are configurable without code changes.
