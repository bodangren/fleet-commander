# Workload Balancer — Implementation Plan

## Phase 1: Agent Workload Tracking

- [ ] Add `activeTaskCount` computed field to agent queries (count tasks with active status assigned to agent)
- [ ] Create `getAgentWorkloads` query returning workload per agent
- [ ] Add `capacity` field to agent definition schema `{ maxConcurrent: number }`
- [ ] Write unit tests for active task counting logic
- [ ] Benchmark: verify workload query performs under 50ms with 100 agents

## Phase 2: Capacity Limits

- [ ] Implement capacity check in dispatch scoring (score = 0 if at max)
- [ ] Add capacity configuration to agent setup/management UI
- [ ] Default `maxConcurrent` to 3 for agents without explicit config
- [ ] Create `getCapacityUtilization` query (used/max per agent)
- [ ] Build `AgentCapacityBar` component for dashboard
- [ ] Wire capacity violation alert into notification system
- [ ] Write tests for capacity enforcement edge cases

## Phase 3: Workload-Aware Scoring

- [ ] Add `workloadWeight` to dispatch policy configuration
- [ ] Implement workload penalty calculation: `score -= (activeTasks * workloadWeight)`
- [ ] Implement expertise bonus: `score += (policyWeights[task.kind] * expertiseWeight)`
- [ ] Implement availability multiplier: `score *= circuitBreakerMultiplier`
- [ ] Update `dispatchScore` function with new signals
- [ ] Extend scoreAudit entry to include workload/expertise/availability breakdown
- [ ] Write integration tests for composite scoring scenarios
- [ ] Build scoring breakdown visualization in dashboard
