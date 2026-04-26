# Implementation Plan - Environment Management

## Phase 1: Environment Data Model and YAML Config

- [ ] Task: Define Go structs in `internal/environment/types.go` — `Environment`, `DeploymentRecord`, `EnvVariable`
  - Sub-item: Include YAML tags, validation, and JSON serialization tags
- [ ] Task: Implement YAML loader in `internal/environment/loader.go` for `measure/environments.yml`
  - Sub-item: Validate required fields (name, target); reject duplicate names
- [ ] Task: Implement YAML writer to persist environment changes back to disk
  - Sub-item: Preserve comments and ordering where possible
- [ ] Task: Write unit tests for load, validate, and round-trip serialize/deserialize

## Phase 2: Environment API (CRUD, Deploy, Rollback)

- [ ] Task: Add `GET /api/environments` — list all environments with status and last deploy info
- [ ] Task: Add `POST /api/environments` — create a new environment from JSON body
- [ ] Task: Add `PUT /api/environments/:name` — update variables, target, or config
- [ ] Task: Add `DELETE /api/environments/:name` — remove environment (with confirmation check)
- [ ] Task: Add `POST /api/environments/:name/deploy` — trigger deployment, return deployment ID
- [ ] Task: Add `POST /api/environments/:name/rollback/:deployId` — redeploy a previous version
- [ ] Task: Write handler tests for all six endpoints using httptest

## Phase 3: Deployment Execution (Pipeline Runner Integration)

- [ ] Task: Implement `internal/environment/deployer.go` that builds a pipeline from the environment's deploy script
  - Sub-item: Inject environment variables into the pipeline step env map
- [ ] Task: Call pipeline runner from Phase 1 of Track 17 to execute the deployment pipeline
  - Sub-item: Capture pipeline execution ID and link it to the deployment record
- [ ] Task: On pipeline completion, update deployment record with result (success/failure) and timestamp
- [ ] Task: Write integration test: create env → deploy → pipeline runs → history entry created with correct result

## Phase 4: Dashboard Environments View

- [ ] Task: Create `EnvironmentList` React component with cards for each environment
  - Sub-item: Each card shows name, target URL, status badge, last deploy time
- [ ] Task: Add deploy button with confirmation modal to each environment card
  - Sub-item: Show progress indicator while deployment is running
- [ ] Task: Create `DeploymentHistory` component showing a table of past deployments
  - Sub-item: Columns: version, deployer, timestamp, result, rollback action
- [ ] Task: Wire rollback button to `POST /api/environments/:name/rollback/:deployId`
- [ ] Task: Write component tests for `EnvironmentList` and `DeploymentHistory` with mock data

## Phase 5: Verification

- [ ] Task: End-to-end test: create env via API → deploy → verify pipeline executed → check history record
- [ ] Task: Verify rollback creates a new deployment record targeting the rolled-back version
- [ ] Task: Manually verify dashboard shows correct status, enables deploy, and displays history
