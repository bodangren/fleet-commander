# Specification - Orchestrator Completion Feedback Loop

## Overview

The orchestrator currently dispatches tasks via `TaskExecutor` and immediately marks them done without waiting for actual agent completion or detecting failures. This track adds execution status tracking, failure detection with retry logic, automatic blocker issue creation on permanent failure, and real-time status visibility in the dashboard.

## Functional Requirements

- **FR1**: After dispatching a task, the orchestrator should poll or receive a callback from the executor confirming execution completed (success or failure).
- **FR2**: Detect execution failures including non-zero exit codes, process timeouts, and harness-reported errors.
- **FR3**: Implement configurable retry logic with exponential backoff (configurable max retries, base delay, and max delay).
- **FR4**: On permanent failure (retries exhausted), mark the task as `blocked` and auto-create a blocker issue in the project's issue store with failure details.
- **FR5**: Execution status (`running`, `succeeded`, `failed`, `retrying`) is broadcast via WebSocket and visible in the dashboard in real time.

## Acceptance Criteria

1. Orchestrator does not mark a task as done until the executor reports completion via status callback or channel.
2. A task with a non-zero exit code is detected as failed and triggers retry.
3. A task exceeding the configured timeout is detected as failed.
4. Retries follow exponential backoff: delay = `min(baseDelay * 2^attempt, maxDelay)`.
5. After max retries, task status transitions to `blocked` and a blocker issue is created with title, description, and failure log.
6. Dashboard shows real-time status updates for running tasks without page refresh.
7. All existing orchestrator and executor tests continue to pass.

## Out of Scope

- Changes to the executor's process management or harness protocol.
- Agent self-healing or automatic code correction on failure.
- Slack/email notifications for blocked tasks.
