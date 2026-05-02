# Workload Balancer

## Overview

Intelligent task distribution that accounts for agent current load, expertise affinity, and health state. Enhances the existing dispatch scoring with workload-aware signals and enforces per-agent capacity limits to prevent overloading.

## Functional Requirements

1. **Agent Workload Tracking**
   - Track active task count per agent (tasks in `in_progress` or `executing` status)
   - Expose real-time workload metric via Convex query
   - Historical workload snapshots for utilization analysis

2. **Capacity Limits**
   - Configurable `maxConcurrentTasks` per agent (default: 3)
   - Agent definition field: `{ capacity: { maxConcurrent: number } }`
   - Hard cap: dispatch scoring returns 0 for agents at capacity
   - Dashboard indicator showing agent load vs. capacity

3. **Workload-Aware Dispatch Scoring**
   - New scoring signals:
     - `workloadPenalty`: -N points per active task (configurable weight)
     - `expertiseBonus`: +N points for task kind affinity (from policyWeights)
     - `availabilityMultiplier`: 0 if circuit breaker open, 0.5 if degraded
   - Integrate into existing `dispatchScore` calculation
   - Score audit entry includes workload breakdown

4. **Capacity Dashboard**
   - Agent capacity utilization bar (used/max)
   - Workload distribution visualization
   - Overload alerts when agents exceed threshold

## Data Sources

- `tasks` — status, assignedAgent for active task counting
- `agents` — capacity config, circuit breaker state
- `policyWeights` — expertise affinity scores
- `dispatchPolicyStats` — scoring history
- `scoreAudit` — dispatch decision trail

## Acceptance Criteria

- [ ] Active task count accurate within 5s of status change
- [ ] Agents at capacity receive score of 0 (not dispatched)
- [ ] Workload penalty correctly reduces dispatch score proportionally
- [ ] Expertise bonus favors agents with matching task kind affinity
- [ ] Circuit breaker open state blocks dispatch (score = 0)
- [ ] Dashboard shows per-agent load vs. capacity in real time

## Out of Scope

- Automatic agent scaling (spinning up new agents based on load)
- Cross-machine load balancing (single-instance scope)
- Predictive capacity planning
- Priority-based preemption (lower-priority tasks yielding to higher)
