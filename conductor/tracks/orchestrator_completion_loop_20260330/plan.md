# Implementation Plan - Orchestrator Completion Feedback Loop

## Phase 1: Execution Status Tracking

- [x] Task: Add status callback/channel to `TaskExecutor` interface
  - [x] Define `ExecutionResult` struct in models with `TaskID`, `Status`, `Error`, `Duration`.
  - [x] Change `ExecuteTask` return to `(<-chan *models.ExecutionResult, error)`.
  - [x] Update `internal/executor/service.go` to emit result when process exits.
- [x] Task: Orchestrator consumes execution result
  - [x] In `orchestrator.Run()`, await result after dispatch instead of marking done immediately.
  - [x] On success, mark task complete as before.
  - [x] On failure, log error and return error (task not marked done).
- [x] Task: Write unit tests for status tracking
  - [x] Mock executor returning success result; assert task marked done.
  - [x] Mock executor returning failure result; assert task not marked done.

## Phase 2: Failure Detection and Retry

- [x] Task: Implement retry logic in orchestrator
  - [x] Add retry config fields: `MaxRetries` (default 3), `BaseDelay` (default 5s), `MaxDelay` (default 60s).
  - [x] On failure, compute backoff delay and re-dispatch task.
  - [x] Track retry count per task execution.
  - [x] Log each retry attempt with attempt number and delay.
- [x] Task: Detect specific failure types
  - [x] Non-zero exit code: `ExitCode != 0`.
  - [x] Timeout: executor sets `Status=failed` with `Error="timeout"`.
  - [x] Harness error: executor sets `Status=failed` with harness-reported error string.
- [x] Task: Write retry tests
  - [x] Assert 2 failures then success results in task completed with retry count = 2.
  - [x] Assert max retries exhausted triggers permanent failure path.
  - [x] Assert exponential backoff delays are correct.

## Phase 3: Auto-Blocker Issue Creation

- [x] Task: On permanent failure, create blocker issue
  - [x] Import `internal/issues` store.
  - [x] Build issue with title `"Task {id} blocked: {error}"`, description including failure log and retry history.
  - [x] Call `issues.Save()` to persist the issue.
  - [x] Update task status to `blocked`.
- [x] Task: Write test for auto-blocker creation
  - [x] Mock issue store; assert `Save` called with correct fields.
  - [x] Assert task status is `blocked` after retries exhausted.

## Phase 4: Frontend Status Display

- [x] Task: Add execution status to WebSocket broadcasts
  - [x] Extend existing WebSocket message types with `execution_status` event.
  - [x] Broadcast `running`, `succeeded`, `failed`, `retrying` with task ID and details.
- [x] Task: Update Dashboard to show live execution status
  - [x] Subscribe to `execution_status` WebSocket events.
  - [x] Render status badges (green/red/yellow) on active task cards.
  - [x] Show retry count and next retry delay when `retrying`.

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + renderer tests)
- [x] Task: Manual verification
  - [x] Start orchestrator with a task that intentionally fails.
  - [x] Confirm retries occur with exponential backoff.
  - [x] Confirm blocker issue is created after max retries.
  - [x] Confirm dashboard shows real-time status transitions.
- [x] Task: Update `conductor/tracks/orchestrator_completion_loop_20260330/plan.md` with completion status
