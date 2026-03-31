# Implementation Plan - Multi-Agent Code Review

## Phase 1: Review Task Creation

- [ ] Task: Implement `internal/review/prompt.go` that builds review prompt from task spec, file diff, and criteria checklist
- [ ] Task: Add review depth config (`quick`/`thorough`) to track metadata model in `internal/tracks/`
- [ ] Task: Generate diff of changed files by comparing pre/post execution snapshots
- [ ] Task: Write tests for prompt generation with sample task specs and diffs

## Phase 2: Reviewer Dispatch and Result Parsing

- [ ] Task: Implement `internal/review/dispatcher.go` that loads reviewer agent config from `internal/agents/defaults/agents/reviewer.md`
- [ ] Task: Execute reviewer agent via executor service with generated prompt and capture output
- [ ] Task: Parse reviewer response into `ReviewResult` struct (`Status`, `Comments[]`) using structured output extraction
- [ ] Task: Handle reviewer timeout (configurable, default 300s) — log and return neutral result
- [ ] Task: Write tests for dispatcher with mock agent responses (pass, needs-changes, timeout)

## Phase 3: Review Result Storage and Issue Logic

- [ ] Task: Store `ReviewResult` in execution log alongside automated pipeline results
- [ ] Task: On needs-changes, create sub-tasks per comment via existing task store
- [ ] Task: Set parent task status to `blocked` when sub-tasks are created
- [ ] Task: Add `GET /api/tasks/:id/review` route returning full review history
- [ ] Task: Write tests for sub-task creation and blocking logic

## Phase 4: Dashboard Review History

- [ ] Task: Add review history API call in `src/renderer/` service layer
- [ ] Task: Build `CodeReview` component with status badge, comment list, and file/line links
- [ ] Task: Add "Code Review" tab to task detail view using Shadcn/ui Tabs
- [ ] Task: Display reviewer depth config and timestamp in review header

## Phase 5: Verification

- [ ] Task: End-to-end test: task completes pipeline, reviewer dispatches, pass result stored
- [ ] Task: End-to-end test: reviewer returns needs-changes, sub-tasks created, parent blocked
- [ ] Task: Run `npm run check` and `npm run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
