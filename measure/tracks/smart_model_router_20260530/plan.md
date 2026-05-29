# Plan: Smart Model Router

## Phase 1: Pure Functions & Tests
- [ ] Task: Write `scoreModelForTask` pure function: cost/point, rejection rate, avg duration per (model, role, taskType)
- [ ] Task: Write `scoreModelForTask` tests: single model, multiple models, missing history, zero tasks
- [ ] Task: Write `selectModelForTask` pure function: apply routing policy, return ranked model list
- [ ] Task: Write `selectModelForTask` tests: quality_first vs cost_first vs balanced, tie-breaking, fallback ordering
- [ ] Task: Write `buildFallbackChain` pure function: ordered list of models for retry logic
- [ ] Task: Write `buildFallbackChain` tests: rate limit scenario, timeout scenario

## Phase 2: Backend Integration
- [ ] Task: Add `modelRoutingPolicy` field to project settings (schema update)
- [ ] Task: Add `getModelScores` Convex query aggregating historical run data per (model, role, taskType)
- [ ] Task: Integrate router into task dispatch pipeline: call `selectModelForTask` before spawning harness
- [ ] Task: Add `modelSelectionLog` to run records: selected model, policy, fallback history
- [ ] Task: Write integration tests: dispatch uses router, manual mode preserves existing behavior

## Phase 3: UI Components
- [ ] Task: Build `ModelRouterSettings` component: policy toggle (quality/cost/balanced/manual)
- [ ] Task: Build `ModelScoreTable` component: per-model scores with confidence bars
- [ ] Task: Add router settings tab to project settings page
- [ ] Task: Show selected model in task timeline / run detail view

## Phase 4: Verification
- [ ] Task: Manual test: set `cost_first` policy, verify cheap model chosen for simple task
- [ ] Task: Manual test: set `quality_first` policy, verify premium model chosen for complex task
- [ ] Task: Verify fallback chain executes on mocked rate-limit error
- [ ] Task: Run full test suite
- [ ] Task: Commit and push
