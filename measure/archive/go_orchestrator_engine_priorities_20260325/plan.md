# Implementation Plan - Go Backend - Orchestrator Engine & Priorities

## Phase 1: Task Selection API
- [x] Task: Create a `GET /api/projects/:id/next-task` endpoint. For MVP, simply return the first task in the project that has a status of `todo` or `ready`. This proves the API plumbing works before adding complex logic.

## Phase 2: Prioritization Algorithm (The Brain)
- [x] Task: Create a new `orchestrator/` package with an `Evaluator` service.
- [x] Task: Implement the `ScoreTask(task *models.Task)` function. It should evaluate:
  - Is the task blocked? (Score: 0)
  - Does it have unfinished dependencies? (Score: 0)
  - Explicit Priority Weight (e.g., if tagged with `priority:high`).
- [x] Task: Update the `Evaluator` to return the absolute highest-scoring valid task across all active tracks in a project.

## Phase 3: The Run Lifecycle
- [x] Task: Implement a `Run(projectID string)` method in the `orchestrator/` package.
- [x] Task: The `Run` method should:
  1. Acquire a lock for the project (to ensure single-execution).
  2. Call the `Evaluator` to get the target task.
  3. (Mock) Log "Dispatching agent for task: [Task Description]" and wait 5 seconds.
  4. (Mock) Update the task status to `done` in the in-memory model.
  5. Release the lock.
- [x] Task: Expose a `POST /api/projects/:id/run` endpoint to manually trigger this lifecycle from the frontend "Trigger Orchestrator Run" button.

## Phase 4: State Persistence
- [x] Task: Replace the mock step 4 in the `Run` lifecycle. Write logic to actually modify the underlying `plan.md` file on disk, changing the checkbox from `[ ]` to `[x]`.
- [x] Task: Ensure the `WatcherService` correctly picks up this change so the frontend updates automatically.
