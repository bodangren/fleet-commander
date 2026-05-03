# Workload Balancer — Implementation Plan

> **Symphony Compliance:** Account for session-bound agents (can't accept new tasks until session completes). Include hook execution time in busy window. Use `#persona` tag for expertise-weighted scoring.

## Phase 1: Agent Workload Tracking

- [ ] Add `activeTaskCount` computed field to agent queries (count tasks with active status assigned to agent)
- [ ] Add `sessionBoundCount` field: tasks where agent has active `sessionId`
- [ ] Create `getAgentWorkloads` query returning workload per agent (active + session-bound)
- [ ] Add `capacity` field to agent definition schema `{ maxConcurrent: number, maxSessions: number }`
- [ ] Write unit tests for active task counting logic
- [ ] Benchmark: verify workload query performs under 50ms with 100 agents

## Phase 2: Capacity Limits

- [ ] Implement capacity check in dispatch scoring: score = 0 if `activeTaskCount >= maxConcurrent` OR `sessionBoundCount >= maxSessions`
- [ ] Add capacity configuration to agent setup/management UI
- [ ] Default `maxConcurrent` to 3 and `maxSessions` to 2 for agents without explicit config
- [ ] Create `getCapacityUtilization` query (used/max per agent, including session slots)
- [ ] Build `AgentCapacityBar` component for dashboard (show both task and session utilization)
- [ ] Wire capacity violation alert into notification system
- [ ] Write tests for capacity enforcement edge cases (including session-bound overflow)

## Phase 3: Workload-Aware Scoring

- [ ] Add `workloadWeight` to dispatch policy configuration
- [ ] Implement workload penalty calculation: `score -= (activeTasks * workloadWeight)`
- [ ] Implement session penalty: `score -= (sessionBoundCount * sessionWeight)` — agents with active sessions are less available
- [ ] Implement expertise bonus using `#persona` tag: `score += (policyWeights[task.kind] * expertiseWeight)` — read `#persona` from parsed task tags
- [ ] Implement availability multiplier: `score *= circuitBreakerMultiplier`
- [ ] Account for hook execution time: agent busy window includes `HookResult.durationMs` from beforeRun
- [ ] Update `dispatchScore` function with new signals
- [ ] Extend scoreAudit entry to include workload/expertise/session/availability breakdown
- [ ] Write integration tests for composite scoring scenarios
- [ ] Build scoring breakdown visualization in dashboard
