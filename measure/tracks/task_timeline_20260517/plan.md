# Implementation Plan: Task Timeline

## Phase 1: Timeline Layout

- [ ] Task: Create timeline layout
    - [ ] Create `frontend/src/components/timeline/TaskTimeline.tsx`
    - [ ] Build 5-stage horizontal timeline
    - [ ] Add stage cards with agent, duration, status
    - [ ] Style with Linear design tokens

## Phase 2: Agent Chain

- [ ] Task: Build agent chain visualization
    - [ ] Create `frontend/src/components/timeline/AgentChain.tsx`
    - [ ] Show agent cards with flow arrows
    - [ ] Highlight active agent
    - [ ] Show completed agent durations

## Phase 3: Execution Log

- [ ] Task: Build execution log
    - [ ] Create `frontend/src/components/timeline/ExecutionLog.tsx`
    - [ ] Add timestamped entries
    - [ ] Color-code by agent
    - [ ] Make scrollable

## Phase 4: Task Info Bar

- [ ] Task: Build task info display
    - [ ] Create `frontend/src/components/timeline/TaskInfoBar.tsx`
    - [ ] Show task name and description
    - [ ] Display assigned agent and role
    - [ ] Show priority and sprint

## Phase 5: Data Integration

- [ ] Task: Wire timeline to Convex
    - [ ] Add `useQuery` for pipeline runs
    - [ ] Add `useQuery` for task details
    - [ ] Implement realtime updates
    - [ ] Handle loading and empty states

## Phase 6: Testing

- [ ] Task: Write tests
    - [ ] Unit tests for timeline components
    - [ ] Integration tests for data flow
    - [ ] Test with different task states
