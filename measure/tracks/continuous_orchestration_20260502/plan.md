# Continuous Orchestration — Implementation Plan

## Phase 1: Interval Scheduler

- [ ] Define `orchestratorConfig` Convex table with fields: interval, state (running|paused|idle|stopped), drainTimeout
- [ ] Implement `setInterval` mutation to update dispatch interval at runtime
- [ ] Build configurable timer in orchestrator loop (Bun setInterval with drift correction)
- [ ] Add `startOrchestrator`, `pauseOrchestrator`, `stopOrchestrator` mutations
- [ ] Persist orchestrator state to Convex; restore on process start
- [ ] Expose orchestrator control endpoints in pivot API routes
- [ ] Add start/stop/pause buttons to frontend dashboard
- [ ] Write unit tests for timer lifecycle (start, pause, resume, stop)

## Phase 2: Queue Management

- [ ] Implement `buildReadyQueue` function: query tasks with status=pending, no active blockers
- [ ] Add eligibility pre-filter: check agent availability and harness capacity
- [ ] Integrate ready queue into orchestrator dispatch loop (score only from queue)
- [ ] Track queue depth as running counter; log to executionLogs each cycle
- [ ] Evict stale queue entries (task status changed since queue build)
- [ ] Write tests for queue build with various blocker/agent states

## Phase 3: Idle Detection and Graceful Shutdown

- [ ] Implement idle detection: if ready queue empty for N consecutive cycles, enter idle
- [ ] Idle state: increase interval to 5× configured value
- [ ] Resume trigger: Convex subscription or polling for new/updated tasks
- [ ] Log idle entry and resume to executionLogs
- [ ] Implement SIGTERM/SIGINT handler in orchestrator process
- [ ] Drain logic: wait for in-flight tasks up to drainTimeout
- [ ] Mark incomplete tasks for handoff on forced shutdown
- [ ] Integration tests for idle cycle and graceful shutdown sequence
