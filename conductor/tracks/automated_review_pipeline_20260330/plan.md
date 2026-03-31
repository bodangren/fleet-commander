# Implementation Plan - Automated Code Review Pipeline

## Phase 1: Review Pipeline Engine

- [ ] Task: Define `ReviewConfig` struct in `internal/review/config.go` with fields for linter, typecheck, test commands and timeout
- [ ] Task: Implement `conductor/review.yml` parser in `internal/review/config.go` that returns `ReviewConfig` or nil
- [ ] Task: Build `Pipeline.Run(ctx, config)` in `internal/review/pipeline.go` that executes each command sequentially, captures stdout/stderr, and returns `[]CheckResult`
- [ ] Task: Implement `CheckResult` struct with `Category`, `Status`, `Errors`, `Warnings`, `Duration` fields
- [ ] Task: Add timeout handling per command using `context.WithTimeout`
- [ ] Task: Write tests for pipeline with mock commands (passing, failing, timeout scenarios)

## Phase 2: Orchestrator Integration

- [ ] Task: Hook review pipeline into orchestrator task-completion flow in `internal/orchestrator/` after execution success
- [ ] Task: Detect project root from task track metadata to locate `conductor/review.yml`
- [ ] Task: Call `Pipeline.Run` and collect results before marking task done
- [ ] Task: Write integration test that runs a mock project through execution + review flow

## Phase 3: Review Result Storage

- [ ] Task: Serialize `[]CheckResult` to JSON and append to execution log in `internal/logs/`
- [ ] Task: Implement blocker issue auto-creation via existing issue store when any check fails
- [ ] Task: Add `GET /api/executions/:id/review` route in `main.go` returning structured review data
- [ ] Task: Write tests for log serialization and blocker creation logic

## Phase 4: Dashboard Review Display

- [ ] Task: Add review result API call in `src/renderer/` service layer
- [ ] Task: Build `ReviewResults` component with expandable pass/fail cards per category
- [ ] Task: Integrate review section into task detail view
- [ ] Task: Style with Shadcn/ui Card and Badge components, Tailwind layout

## Phase 5: Verification

- [ ] Task: End-to-end test: configure review.yml, run task, verify review triggers and results appear
- [ ] Task: Verify blocker creation on review failure
- [ ] Task: Run `npm run check` and `npm run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
