# Plan: Agent A/B Testing Framework

## Phase 1: Schema & Backend
- [x] Task: Design `experiments` and `experimentRuns` Convex schema
- [x] Task: Implement `createExperiment`, `runExperiment`, `getExperiment` mutations/queries
- [x] Task: Write Convex tests for experiment lifecycle

## Phase 2: Benchmark Task Runner
- [x] Task: Build task executor that runs identical task against two agent configs
- [x] Task: Capture cost, duration, and raw output for each run
- [x] Task: Implement output similarity scoring (diff or embedding cosine)

## Phase 3: UI
- [x] Task: Create experiment list page
- [x] Task: Create experiment form (agent config A vs B, task selector)
- [x] Task: Create results comparison view with charts
- [x] Task: Add route and navigation link

## Phase 4: Verification
- [x] Task: Run end-to-end experiment on a sample task
- [x] Task: Verify all tests pass
- [x] Task: Update tech-debt.md if Recharts issues encountered
- [x] Task: Commit and push
