# Implementation Plan - Automated Code Review Pipeline

## Phase 1: Review Pipeline Engine

- [x] Task: Define `ReviewConfig` struct in `internal/review/config.go` with fields for linter, typecheck, test commands and timeout
- [x] Task: Implement `conductor/review.yml` parser in `internal/review/config.go` that returns `ReviewConfig` or nil
- [x] Task: Build `Pipeline.Run(ctx, config)` in `internal/review/pipeline.go` that executes each command sequentially, captures stdout/stderr, and returns `[]CheckResult`
- [x] Task: Implement `CheckResult` struct with `Category`, `Status`, `Errors`, `Warnings`, `Duration` fields
- [x] Task: Add timeout handling per command using `context.WithTimeout`
- [x] Task: Write tests for pipeline with mock commands (passing, failing, timeout scenarios)

## Phase 2: Orchestrator Integration

- [x] Task: Hook review pipeline into orchestrator task-completion flow in `internal/orchestrator/` after execution success
- [x] Task: Detect project root from task track metadata to locate `conductor/review.yml`
- [x] Task: Call `Pipeline.Run` and collect results before marking task done
- [x] Task: Write integration test that runs a mock project through execution + review flow

## Phase 3: Review Result Storage

- [x] Task: Serialize `[]CheckResult` to JSON and append to execution log in `internal/logs/`
- [x] Task: Implement blocker issue auto-creation via existing issue store when any check fails
- [x] Task: Add `GET /api/projects/{id}/tasks/{taskId}/review` route in `project_logs.go` returning structured review data
- [x] Task: Write tests for log serialization and blocker creation logic

## Phase 4: Dashboard Review Display

- [x] Task: Add review result API call in `src/renderer/` service layer (useTaskReview hook)
- [x] Task: Build `ReviewResults` component with expandable pass/fail cards per category
- [x] Task: Integrate review section into task detail view (Review tab + done-task click)
- [x] Task: Style with Shadcn/ui Card and Badge components, Tailwind layout

## Phase 5: Verification

- [x] Task: End-to-end test: configure review.yml, run task, verify review triggers and results appear
- [x] Task: Verify blocker creation on review failure
- [x] Task: Run `npm run check` and `npm run test` — all pass
- [x] Task: Update plan.md checkboxes, write deviation notes if any
