# Implementation Plan: Pipeline Engine

## Phase 1: Pipeline Orchestrator

- [ ] Task: Build the main pipeline orchestrator
    - [ ] Create `pivot/src/pipeline/orchestrator.ts`
    - [ ] Implement task pickup from Ready queue
    - [ ] Add agent matching based on skills
    - [ ] Create stage transition logic
    - [ ] Test orchestrator with mock agents

## Phase 2: Dispatch Executor

- [ ] Task: Implement dispatch stage
    - [ ] Create `pivot/src/pipeline/stages/dispatch.ts`
    - [ ] Implement task queue management
    - [ ] Add agent availability checking
    - [ ] Create skill matching algorithm
    - [ ] Test dispatch with multiple tasks

## Phase 3: Architect Executor

- [ ] Task: Implement architect stage
    - [ ] Create `pivot/src/pipeline/stages/architect.ts`
    - [ ] Implement context gathering (task spec, project history)
    - [ ] Add LLM prompt for architecture planning
    - [ ] Create implementation plan document generation
    - [ ] Test architect with sample tasks

## Phase 4: Executor Agent

- [ ] Task: Implement executor stage
    - [ ] Create `pivot/src/pipeline/stages/executor.ts`
    - [ ] Implement code generation from plan
    - [ ] Add test execution
    - [ ] Create git commit logic
    - [ ] Test executor with sample plans

## Phase 5: Reviewer Agent

- [ ] Task: Implement reviewer stage
    - [ ] Create `pivot/src/pipeline/stages/reviewer.ts`
    - [ ] Implement diff reading
    - [ ] Add test result validation
    - [ ] Create approval/rejection logic
    - [ ] Test reviewer with sample diffs

## Phase 6: Merger Agent

- [ ] Task: Implement merger stage
    - [ ] Create `pivot/src/pipeline/stages/merger.ts`
    - [ ] Implement PR merge logic
    - [ ] Add task status update
    - [ ] Create sprint cost update
    - [ ] Test merger with approved tasks

## Phase 7: Cost Tracking

- [ ] Task: Implement cost accumulation
    - [ ] Create cost calculation per stage
    - [ ] Add stage multiplier logic
    - [ ] Implement sprint cost aggregation
    - [ ] Create cost history tracking
    - [ ] Test cost calculations

## Phase 8: Failure Handling

- [ ] Task: Implement retry and failure logic
    - [ ] Add retry count tracking
    - [ ] Implement task return to Ready on failure
    - [ ] Create blocked status after max retries
    - [ ] Add failure reason logging
    - [ ] Test failure scenarios

## Phase 9: Integration

- [ ] Task: Integrate pipeline with Convex
    - [ ] Wire orchestrator to Convex mutations
    - [ ] Add realtime updates for pipeline status
    - [ ] Create pipeline status queries
    - [ ] Test end-to-end pipeline flow

## Phase 10: Testing

- [ ] Task: Write comprehensive tests
    - [ ] Unit tests for each stage executor
    - [ ] Integration tests for full pipeline
    - [ ] Test cost calculations
    - [ ] Test failure scenarios
    - [ ] Test agent matching
