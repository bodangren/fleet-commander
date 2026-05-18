# Implementation Plan: Pipeline Engine

## Phase 1: Pipeline Orchestrator

- [x] Task: Build the main pipeline orchestrulator
    - [x] Create `pivot/src/pipeline/orchestrator.ts`
    - [x] Implement task pickup from Ready queue
    - [x] Add agent matching based on skills
    - [x] Create stage transition logic
    - [x] Test orchestrator with mock agents

## Phase 2: Dispatch Executor

- [x] Task: Implement dispatch stage
    - [x] Create `pivot/src/pipeline/stages/dispatch.ts`
    - [x] Implement task queue management
    - [x] Add agent availability checking
    - [x] Create skill matching algorithm
    - [x] Test dispatch with multiple tasks

## Phase 3: Architect Executor

- [x] Task: Implement architect stage (stub)
    - [x] Create `pivot/src/pipeline/stages/architect.ts`
    - [~] Implement context gathering (task spec, project history) — stubbed, needs LLM integration
    - [~] Add LLM prompt for architecture planning — stubbed, needs LLM integration
    - [~] Create implementation plan document generation — stubbed, needs LLM integration
    - [x] Test architect with sample tasks via orchestrator

## Phase 4: Executor Agent

- [x] Task: Implement executor stage (stub)
    - [x] Create `pivot/src/pipeline/stages/executor.ts`
    - [~] Implement code generation from plan — stubbed, needs LLM integration
    - [~] Add test execution — stubbed, needs LLM integration
    - [~] Create git commit logic — stubbed, needs LLM integration
    - [x] Test executor with sample plans via orchestrator

## Phase 5: Reviewer Agent

- [x] Task: Implement reviewer stage (stub)
    - [x] Create `pivot/src/pipeline/stages/reviewer.ts`
    - [~] Implement diff reading — stubbed, needs LLM integration
    - [~] Add test result validation — stubbed, needs LLM integration
    - [x] Create approval/rejection logic (deterministic stub)
    - [x] Test reviewer with sample diffs via orchestrator

## Phase 6: Merger Agent

- [x] Task: Implement merger stage (stub)
    - [x] Create `pivot/src/pipeline/stages/merger.ts`
    - [~] Implement PR merge logic — stubbed, needs git integration
    - [x] Add task status update (orchestrator handles)
    - [x] Create sprint cost update (tracked in pipeline runs)
    - [x] Test merger with approved tasks via orchestrator

## Phase 7: Cost Tracking

- [x] Task: Implement cost accumulation
    - [x] Create cost calculation per stage
    - [x] Add stage multiplier logic
    - [x] Implement sprint cost aggregation
    - [x] Create cost history tracking (pipelineRuns table)
    - [x] Test cost calculations

## Phase 8: Failure Handling

- [x] Task: Implement retry and failure logic
    - [x] Add retry count tracking
    - [x] Implement task return to Ready on failure
    - [x] Create blocked status after max retries
    - [x] Add failure reason logging (stage result output)
    - [x] Test failure scenarios

## Phase 9: Integration

- [x] Task: Integrate pipeline with Convex
    - [x] Wire orchestrator to Convex mutations (via scheduler)
    - [x] Add realtime updates for pipeline status (Convex subscriptions)
    - [x] Create pipeline status queries (API routes)
    - [x] Test end-to-end pipeline flow (orchestrator tests)

## Phase 10: Testing

- [x] Task: Write comprehensive tests
    - [x] Unit tests for each stage executor
    - [x] Integration tests for full pipeline (orchestrator tests)
    - [x] Test cost calculations
    - [x] Test failure scenarios
    - [x] Test agent matching
