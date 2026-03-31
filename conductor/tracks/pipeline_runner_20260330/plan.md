# Implementation Plan - Pipeline Definition & Runner

## Phase 1: Pipeline YAML Schema and Parser

- [ ] Task: Define Go structs for Pipeline, Stage, Step, and Condition in `internal/pipeline/types.go`
  - Sub-item: Include YAML struct tags and validation annotations
  - Sub-item: Support `env`, `secrets`, `condition`, and `parallel` fields on Step
- [ ] Task: Implement YAML loader in `internal/pipeline/loader.go` that reads and validates `conductor/pipelines.yml`
  - Sub-item: Return descriptive errors for missing fields, invalid types, and circular stage deps
- [ ] Task: Write unit tests for parser with valid, invalid, and edge-case YAML fixtures
  - Sub-item: Test empty stages, duplicate step names, and missing required fields

## Phase 2: Pipeline Runner Engine

- [ ] Task: Implement stage executor in `internal/pipeline/runner.go` that iterates stages sequentially
  - Sub-item: Check stage-level `condition` before execution; skip if false
- [ ] Task: Implement step parallelism using goroutines + `errgroup` for steps marked `parallel: true`
  - Sub-item: Respect step-level `depends_on` to resolve ordering within a stage
- [ ] Task: Integrate with `internal/runner/command_runner.go` for spawning step commands with context cancellation
  - Sub-item: Pass merged env vars (system + pipeline + secrets) to each command
- [ ] Task: Write unit tests for sequential stages, parallel steps, condition skipping, and failure propagation

## Phase 3: API Endpoints

- [ ] Task: Add `POST /api/pipelines/:id/trigger` endpoint to manually trigger a pipeline execution
  - Sub-item: Accept optional env override payload; return execution ID
- [ ] Task: Add `GET /api/pipelines/:id/status` endpoint returning current execution state and stage progress
- [ ] Task: Add `GET /api/pipelines/:id/logs` endpoint streaming structured execution logs as JSON
  - Sub-item: Support `?since=` query param for incremental log fetching
- [ ] Task: Write handler tests using httptest for trigger, status, and logs endpoints

## Phase 4: Dashboard Pipeline View

- [ ] Task: Create `PipelineList` React component displaying available pipelines and last-run status
- [ ] Task: Create `PipelineExecution` component showing stage/step progress with real-time status indicators
  - Sub-item: Poll status endpoint every 2s while pipeline is running
- [ ] Task: Create `PipelineLogs` component rendering structured log entries with filtering by stage
- [ ] Task: Add trigger button with confirmation dialog to `PipelineList`

## Phase 5: Verification

- [ ] Task: Write integration test that loads a fixture YAML, triggers a pipeline, and asserts final status is `succeeded`
- [ ] Task: Verify pipeline triggered by task completion hook fires when a task transitions to `done`
- [ ] Task: Manually verify dashboard pipeline view shows correct status transitions and log output
