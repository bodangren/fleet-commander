# Implementation Plan - Pipeline Definition & Runner

## Phase 1: Pipeline YAML Schema and Parser

- [x] Task: Define TypeScript types for Pipeline, Stage, Step, and Condition in `pivot/src/pipeline/types.ts`
  - Sub-item: Include Zod validators for runtime type checking
  - Sub-item: Support `env`, `secrets`, `condition`, and `parallel` fields on Step
- [x] Task: Implement YAML loader in `pivot/src/pipeline/loader.ts` that reads and validates `conductor/pipelines.yml`
  - Sub-item: Return descriptive errors for missing fields, invalid types, and circular stage deps
- [x] Task: Write unit tests for parser with valid, invalid, and edge-case YAML fixtures
  - Sub-item: Test empty stages, duplicate step names, and missing required fields

## Phase 2: Pipeline Runner Engine

- [x] Task: Implement stage executor in `pivot/src/pipeline/runner.ts` that iterates stages sequentially
  - Sub-item: Check stage-level `condition` before execution; skip if false
- [x] Task: Implement step parallelism using `Promise.all` for steps marked `parallel: true`
  - Sub-item: Respect step-level `depends_on` to resolve ordering within a stage
- [x] Task: Integrate with `Bun.spawn` for spawning step commands with AbortSignal cancellation
  - Sub-item: Pass merged env vars (system + pipeline + secrets) to each command
- [x] Task: Write unit tests for sequential stages, parallel steps, condition skipping, and failure propagation

## Phase 3: Convex Schema & API Endpoints

- [x] Task: Add `pipelineExecutions` table to `convex/schema.ts` with fields: pipelineId, status, stages, startedAt, completedAt, projectId
- [x] Task: Add Convex mutations: `startPipeline`, `updateStageStatus`, `completePipeline`
- [x] Task: Add Convex queries: `getPipeline`, `getPipelineStatus`, `getPipelineLogs`
- [x] Task: Add `POST /api/pipelines/:id/trigger` endpoint in `pivot/src/routes/pipelines.ts`
  - Sub-item: Accept optional env override payload; return execution ID
- [x] Task: Add `GET /api/pipelines/:id/status` endpoint returning current execution state and stage progress
- [x] Task: Add `GET /api/pipelines/:id/logs` endpoint streaming structured execution logs as JSON
  - Sub-item: Support `?since=` query param for incremental log fetching
- [x] Task: Write handler tests using Bun's test framework for trigger, status, and logs endpoints

## Phase 4: Dashboard Pipeline View

- [ ] Task: Create `PipelineList` React component displaying available pipelines and last-run status
- [ ] Task: Create `PipelineExecution` component showing stage/step progress with real-time status indicators
  - Sub-item: Subscribe to Convex query for live status updates every 2s while pipeline is running
- [ ] Task: Create `PipelineLogs` component rendering structured log entries with filtering by stage
- [ ] Task: Add trigger button with confirmation dialog to `PipelineList`
- [ ] Task: Wire Convex subscriptions to `PipelineExecution` for real-time status

## Phase 5: Verification

- [ ] Task: Write integration test that loads a fixture YAML, triggers a pipeline, and asserts final status is `succeeded`
- [ ] Task: Verify pipeline triggered by task completion hook fires when a task transitions to `done`
- [ ] Task: Manually verify dashboard pipeline view shows correct status transitions and log output
- [ ] Task: Run `bun --cwd pivot run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
- [ ] Task: Run `bun --cwd pivot run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
