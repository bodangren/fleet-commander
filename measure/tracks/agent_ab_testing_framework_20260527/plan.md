# Plan: Agent A/B Testing Framework

## Phase 1: Schema & Backend
- [ ] Task: Design `experiments` and `experimentRuns` Convex schema
- [ ] Task: Implement `createExperiment`, `runExperiment`, `getExperiment` mutations/queries
- [ ] Task: Write Convex tests for experiment lifecycle

## Phase 2: Benchmark Task Runner
- [ ] Task: Build task executor that runs identical task against two agent configs
- [ ] Task: Capture cost, duration, and raw output for each run
- [ ] Task: Implement output similarity scoring (diff or embedding cosine)

## Phase 3: UI
- [ ] Task: Create experiment list page
- [ ] Task: Create experiment form (agent config A vs B, task selector)
- [ ] Task: Create results comparison view with charts
- [ ] Task: Add route and navigation link

## Phase 4: Verification
- [ ] Task: Run end-to-end experiment on a sample task
- [ ] Task: Verify all tests pass
- [ ] Task: Update tech-debt.md if Recharts issues encountered
- [ ] Task: Commit and push
