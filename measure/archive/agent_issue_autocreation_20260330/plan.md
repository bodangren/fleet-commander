# Implementation Plan - Agent Issue Auto-Creation

## Phase 1: Issue Output Format and Parser

- [x] Task: Define issue output format specification
  - Document the `` ```issue `` fenced block format with JSON fields: `title` (required), `description` (required), `severity` (low/medium/high/critical), `labels` (string array).
  - Add format spec to `measure/workflow.md` or a new `measure/agent-output-format.md`.
- [x] Task: Implement issue parser in `internal/orchestrator/issue_parser.go`
  - `ParseIssues(output string) ([]ParsedIssue, error)` extracts all `` ```issue `` blocks.
  - Decode JSON within each block into `ParsedIssue` struct.
  - Validate required fields; skip and log warnings for malformed blocks.
  - Return empty slice (not error) when no issue blocks found.
- [x] Task: Write parser tests
  - Valid single issue block: assert correct extraction.
  - Multiple issue blocks: assert all extracted.
  - Mixed output with code blocks and issue blocks: assert only issues extracted.
  - Malformed JSON: assert warning logged, no error, block skipped.
  - Missing required fields: assert block skipped.
  - Empty output: assert empty slice.

## Phase 2: Hook Parser into Post-Execution Flow

- [x] Task: Capture execution output for parsing
  - In `internal/executor/service.go`, accumulate full stdout/stderr output from task execution.
  - Return accumulated output in `ExecutionResult`.
- [x] Task: Call parser after task completion in orchestrator
  - In `orchestrator.Run()`, after successful task completion, call `ParseIssues(result.Output)`.
  - For each parsed issue, call `issues.Store.Save()` with task ID reference.
  - Log count of auto-created issues.
- [x] Task: Write integration test for post-execution parsing
  - Mock executor returning output with issue block.
  - Assert issue store `Save` called with correct fields.
  - Assert task completion still succeeds when issues are found.

## Phase 3: WebSocket Broadcast for New Issues

- [x] Task: Add `issue_created` WebSocket event type
  - Define `broadcastIssueCreated` with `Issue` payload and `TaskID`.
  - Broadcast event from orchestrator after `issues.Store.Save()`.
- [x] Task: Frontend handles `issue_created` event
  - In Issues list component, subscribe to `issue_created` WebSocket events.
  - Prepend new issue to list state.
  - Show a brief toast notification: "New issue created by agent: {title}".
- [x] Task: Write WebSocket broadcast test
  - Mock WebSocket hub; assert `issue_created` event sent after issue creation.

## Phase 4: Agent Prompt Template Injection

- [x] Task: Create issue reporting prompt template
  - Write a template string explaining the `` ```issue `` format with example.
  - Store in `internal/orchestrator/prompt_templates.go`.
- [x] Task: Inject template into agent prompts
  - Before dispatching a task, append the issue template to the agent's prompt.
  - Ensure template is only added once per prompt.
- [x] Task: Write test for template injection
  - Assert prompt contains issue format instructions after injection.
  - Assert double-injection does not occur.

## Phase 5: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test:renderer`)
- [x] Task: Manual verification
  - Create a task with an agent that outputs a `` ```issue `` block.
  - Run task, confirm issue is auto-created in store.
  - Confirm dashboard Issues list updates in real time via WebSocket.
  - Confirm malformed output is logged but does not crash orchestrator.
- [x] Task: Update `measure/tracks/agent_issue_autocreation_20260330/plan.md` with completion status
