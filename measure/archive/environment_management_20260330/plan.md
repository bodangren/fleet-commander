# Implementation Plan - Environment Management

## Phase 1: Environment Data Model and YAML Config

- [x] Task: Define types (`pivot/src/environment/types.ts`) — Environment, DeploymentRecord, EnvironmentVariable
- [x] Task: Implement YAML loader for `measure/environments.yml`
- [x] Task: Implement YAML writer to persist changes
- [x] Task: Write unit tests (4 tests: load empty, round-trip, find, addDeployment)

## Phase 2: Environment API (CRUD, Deploy, Rollback)

- [x] Task: `GET /api/environments` — list all environments
- [x] Task: `POST /api/environments` — create new environment
- [x] Task: `DELETE /api/environments/:name` — remove environment
- [x] Task: `POST /api/environments/:name/deploy` — trigger deployment
- [x] Task: `POST /api/environments/:name/rollback/:deployId` — rollback

## Phase 3: Deployment Execution (Pipeline Runner Integration)

Deferred — deploy scripts would trigger the pipeline runner. Currently marks as success immediately.

## Phase 4: Dashboard Environments View

Deferred — needs frontend components.

## Phase 5: Verification

- [x] Task: Environment types tests pass (4 tests)
- [x] Task: Routes registered in server.ts
