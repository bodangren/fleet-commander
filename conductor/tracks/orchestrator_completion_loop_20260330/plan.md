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

- [ ] Task: Implement retry logic in orchestrator
  - Add retry config fields: `MaxRetries` (default 3), `BaseDelay` (default 5s), `MaxDelay` (default 60s).
  - On failure, compute backoff delay and re-dispatch task.
  - Track retry count per task execution.
  - Log each retry attempt with attempt number and delay.
- [ ] Task: Detect specific failure types
  - Non-zero exit code: `ExitCode != 0`.
  - Timeout: executor sets `Status=failed` with `Error="timeout"`.
  - Harness error: executor sets `Status=failed` with harness-reported error string.
- [ ] Task: Write retry tests
  - Assert 2 failures then success results in task completed with retry count = 2.
  - Assert max retries exhausted triggers permanent failure path.
  - Assert exponential backoff delays are correct.

## Phase 3: Auto-Blocker Issue Creation

- [ ] Task: On permanent failure, create blocker issue
  - Import `internal/issues` store.
  - Build issue with title `"Task {id} blocked: {error}"`, description including failure log and retry history.
  - Call `issues.Save()` to persist the issue.
  - Update task status to `blocked`.
- [ ] Task: Write test for auto-blocker creation
  - Mock issue store; assert `Save` called with correct fields.
  - Assert task status is `blocked` after retries exhausted.

## Phase 4: Frontend Status Display

- [ ] Task: Add execution status to WebSocket broadcasts
  - Extend existing WebSocket message types with `execution_status` event.
  - Broadcast `running`, `succeeded`, `failed`, `retrying` with task ID and details.
- [ ] Task: Update Dashboard to show live execution status
  - Subscribe to `execution_status` WebSocket events.
  - Render status badges (green/red/yellow) on active task cards.
  - Show retry count and next retry delay when `retrying`.

## Phase 5: Verification

- [ ] Task: Run full test suite (`go test ./...` + renderer tests)
- [ ] Task: Manual verification
  - Start orchestrator with a task that intentionally fails.
  - Confirm retries occur with exponential backoff.
  - Confirm blocker issue is created after max retries.
  - Confirm dashboard shows real-time status transitions.
- [ ] Task: Update `conductor/tracks/orchestrator_completion_loop_20260330/plan.md` with completion status
