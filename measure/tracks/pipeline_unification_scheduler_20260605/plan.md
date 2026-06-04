# Plan: Pipeline Unification & Scheduler Hardening

## Phase 1: Characterization Tests & Pure Functions
- [x] Task: Write characterization tests for `PipelineScheduler.runCycle`: lock current behavior (fetch projects, filter active sprints, process ready tasks)
- [x] Task: Write `withExecutionGuard` pure function: accepts async fn, returns wrapped fn that skips if already running; tests for sequential calls, overlapping calls, error recovery
- [x] Task: Write `detectStuckTasks` pure function: inputs = tasks + pipelineRuns + threshold minutes; outputs = task keys that are stuck in_progress; tests for stuck, recent, and done tasks
- [x] Task: Write `detectOrphanSprints` pure function: inputs = sprints + tasks; outputs = active sprints with no remaining work; tests for active-done, active-pending, and closed sprints
- [x] Task: Write `reconcileTaskState` pure function: inputs = task + dependencies + pipelineRuns; outputs = recommended status transition or null; tests for blocked, ready, stuck scenarios

## Phase 2: Pipeline Unification
- [x] Task: Audit all production callers of `PipelineScheduler`; redirect to orchestrator entrypoints
- [x] Task: Remove `pivot/src/pipeline/scheduler.ts` and `PipelineOrchestrator` class; archive in `measure/archive/`
- [x] Task: Ensure orchestrator stages handle the same task statuses that scheduler.ts did (ready → in_progress → for_review → merged)
- [x] Task: Migrate any unique scheduler logic (sprint cost aggregation, pipelineRun creation) into orchestrator stages
- [x] Task: Run full test suite to verify no regressions

## Phase 3: Scheduler Hardening
- [x] Task: Integrate `withExecutionGuard` into `AutoRunner.tick` to prevent overlapping `runAllProjects` cycles
- [x] Task: Refactor `sendPromptToSession` to use `AbortController` with deterministic cleanup; remove flag-based timeout race
- [x] Task: Add timeout and retry policy to `AutoRunner` config; expose in Convex settings
- [x] Task: Write integration tests for `AutoRunner` through production imports: start, tick, overlap prevention, stop
- [x] Task: Write integration tests for `sendPromptToSession` cancellation: abort mid-flight, cleanup resources, no orphan sessions

## Phase 4: Reconciliation Auto-Repair
- [x] Task: Implement `loadCanonicalState` and `saveCanonicalState` in `sweep.ts` with real disk I/O (already scaffolded, complete the stub)
- [x] Task: Implement task and issue differ functions in `differs/` directory
- [x] Task: Wire `detectStuckTasks`, `detectOrphanSprints`, and `reconcileTaskState` into reconciliation sweep
- [x] Task: Add `getReconciliationStatus` Convex query: returns divergence count, stuck tasks, orphan sprints, last sweep time
- [x] Task: Add `repairStuckTasks` Convex mutation: moves stuck tasks back to ready (idempotent, only if still stuck)
- [x] Task: Add `closeOrphanSprints` Convex mutation: closes active sprints with no remaining work
- [x] Task: Write end-to-end reconciliation test: create drift, run sweep, verify detection, run repair, verify fix

## Phase 5: Verification
- [x] Task: Manual test: start AutoRunner, verify only one cycle runs at a time, verify stuck-task recovery
- [x] Task: Manual test: create circular dependency scenario (outside mutation guard), run reconciliation, verify it doesn't crash
- [x] Task: Verify Diagnose view shows reconciliation status via `getReconciliationStatus`
- [x] Task: Run `bun --cwd pivot test && bun --cwd frontend test`
- [x] Task: Run `bun --cwd pivot typecheck`
- [x] Task: Update `build-graph` for all changed files
- [ ] Task: Commit and push
