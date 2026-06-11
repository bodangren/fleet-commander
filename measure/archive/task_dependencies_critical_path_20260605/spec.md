# Spec: Task Dependencies & Critical Path

## Problem

The task schema already has a `dependencies` array and the orchestrator can block tasks with incomplete dependencies, but the feature is half-finished:
- There is no UI to add, edit, or visualize dependencies on the kanban board or task detail
- The critical path algorithm in `dependencies.ts` reconstructs paths incorrectly (follows arbitrary dependency branches instead of the true longest path)
- Sprint planning ignores dependencies when recommending tasks — a task can be scheduled before its prerequisites
- There is no cycle detection in mutations, so a user could accidentally create a circular dependency that crashes the orchestrator
- The product vision promises a "Blockers" dashboard view that doesn't exist

## Solution

Complete the dependency system end-to-end: cycle-safe mutations, dependency editing in the task detail and board, a fixed critical path algorithm, dependency-aware sprint planning, and a dedicated Blockers view showing all blocked tasks with their blocking chain.

## Acceptance Criteria

- [ ] `addTaskDependency` and `removeTaskDependency` Convex mutations with cycle detection (reject if cycle would form)
- [ ] `getBlockedChain` query: given a taskKey, return the transitive closure of blockers with status
- [ ] Fixed `critical-path` endpoint: true longest path using weighted story points, correct path reconstruction
- [ ] Task detail panel shows dependency list with status badges; allows add/remove via search autocomplete
- [ ] Kanban cards show a blocked indicator when dependencies are incomplete; hover shows blocker names
- [ ] Sprint planning PM agent recommends tasks in dependency order (topological sort of Ready tasks)
- [ ] New `/blockers` dashboard route: table of all blocked tasks, blocking task chain, estimated unblock time, sprint impact
- [ ] Blocker resolution notifications: when a blocking task completes, notify if downstream tasks are now unblocked
- [ ] Cycle detection tested: 2-node cycle, 3-node cycle, self-dependency, valid DAG

## Out of Scope

- Parallel task execution within a dependency chain (still sequential per chain)
- External dependency links (GitHub issues, Jira tickets)
- Gantt chart or timeline visualization
- Dependency strength weights (soft vs hard dependencies)
