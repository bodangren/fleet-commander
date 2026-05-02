# Specification: Convex/Bun Failover Design

## Overview

Failover between the Bun runtime and Convex has not been considered. The split-runtime architecture has four failure modes that can corrupt or stall the fleet:

1. Convex unreachable on dispatch read → can't score → dispatch halts.
2. Convex unreachable on run-event write → results lost or duplicated.
3. Bun crash mid-run → Convex shows task as `running` forever.
4. Bun restart → in-flight runs need a recovery decision.

Existing primitives to extend (not rebuild): `convex/circuitBreakers.ts`, `convex/recoveryLog.ts`, `convex/taskRecovery.ts`, `convex/reconciliationEngine.ts`, `pivot/src/orchestrator/stalledDetector.ts`.

Work is split into two phases. Phase 1 (items 1+2) delivers the majority of failover safety. Phase 2 (items 3+4) handles Bun crash/restart recovery.

## Functional Requirements

### Phase 1 — Quick Win

#### 1. Local Write-Ahead Queue for Run Events

- When Bun cannot reach Convex, append run events to a local JSONL queue at `~/.measure-fleet/wal/<date>.jsonl`.
- On reconnect, replay queued events in order.
- Each event carries an idempotency key so replaying twice is safe.

#### 2. Read-Side Cache with TTL for Dispatch Policy

- Bun caches the last-known dispatch policy and scoring stats with a freshness timestamp.
- If Convex is unreachable, dispatch continues using the cached policy for a bounded staleness window (default: 15 minutes).
- After the staleness window expires, pause the fleet and surface status: "policy stale, dispatch paused."

### Phase 2 — Crash and Restart Recovery

#### 3. Heartbeat-Based Stuck-Task Reconciler

- Each running task heartbeats Convex every N seconds.
- The reconciler marks a task `stuck` after 3 missed heartbeats.
- Extend `pivot/src/orchestrator/stalledDetector.ts` to handle Convex-side ghosts from Bun crashes, not just naturally stalled processes.

#### 4. Bun Startup Recovery

- On boot, query Convex for tasks marked `running` whose owner is this Bun instance.
- For each such task: resume or fail-and-recover according to the harness-defined resume policy.

## Non-Functional Requirements

- WAL replay must not produce duplicate side effects (idempotency keys required).
- Cached policy staleness window must be configurable.
- Heartbeat interval must be configurable.
- Phase 2 work must not begin before Phase 1 is complete and stable.

## Acceptance Criteria

### Phase 1

- [ ] Run events written to `~/.measure-fleet/wal/<date>.jsonl` when Convex unreachable.
- [ ] WAL replayed in order on reconnect; idempotency keys prevent duplicate writes.
- [ ] Dispatch policy cached with freshness timestamp.
- [ ] Fleet pauses with "policy stale, dispatch paused" after staleness window.
- [ ] Staleness window configurable (default 15 minutes).

### Phase 2

- [ ] Running tasks heartbeat Convex every N seconds (configurable).
- [ ] Reconciler marks tasks `stuck` after 3 missed heartbeats.
- [ ] `stalledDetector.ts` handles Convex-side ghosts from Bun crashes.
- [ ] On Bun boot, tasks marked `running` for this instance are resumed or recovered.
- [ ] Resume policy is per-harness.

## Out of Scope

- Full offline mode with local SQLite write-back.
- Multi-instance Bun coordination (one instance per fleet assumed).
- Rebuilding any of the listed existing primitives from scratch.
